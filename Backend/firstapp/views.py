from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404, render
from django.core.management import call_command
from django.core.mail import send_mail
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.conf import settings
from django.db.models import F, DecimalField, ExpressionWrapper
from rest_framework.decorators import action, api_view, permission_classes
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import timedelta
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from django.utils.dateparse import parse_datetime

from django.db.models import Sum, Count, Q, Exists, OuterRef, Avg

from django.contrib.auth.hashers import make_password, check_password
import logging
import base64
import hashlib
import hmac
import re
from io import StringIO
import json
import requests
import uuid
import random

import secrets

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.permissions import AllowAny

from .serializers import (
    UserSerializer, FeedbackSerializer, ProductSerializer, CategorySerializer, ReceiptSerializer, CouponSerializer, HomePageSerializer, ServicesPageSerializer, AboutPageSerializer, ContactPageSerializer, CouponCriteriaSerializer, StaffPerformanceSerializer, ReviewSerializer, OTPSerializer, NotificationSerializer, ProfitLogSerializer, DrawerBalanceLogSerializer
)   
from .models import Product, Category, Receipt, Coupon, CouponClaim, Feedback, HomePage, ServicesPage, AboutPage, ContactPage, CouponCriteria, ReceiptItem, Review, OTP, PasswordResetToken, EmailVerificationToken, StoreSettings, StaffInvitationToken, PaymentTransaction, PaymentWebhookEventLog, Notification, ProfitLog, DrawerBalanceLog
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.exceptions import AuthenticationFailed


def _paymongo_headers(idempotency_key=None):
    secret_key = getattr(settings, 'PAYMONGO_SECRET_KEY', '')
    if not secret_key:
        raise ValueError('PayMongo secret key is not configured.')

    auth_token = base64.b64encode(f"{secret_key}:".encode('utf-8')).decode('utf-8')
    headers = {
        'Authorization': f'Basic {auth_token}',
        'Content-Type': 'application/json',
    }
    if idempotency_key:
        headers['Idempotency-Key'] = idempotency_key
    return headers


def _verify_paymongo_signature(raw_body, signature_header):
    webhook_secret = getattr(settings, 'PAYMONGO_WEBHOOK_SECRET', '')
    if not webhook_secret:
        return False
    if not signature_header:
        return False

    parsed_parts = {}
    for part in signature_header.split(','):
        token = part.strip()
        if '=' not in token:
            continue
        key, value = token.split('=', 1)
        parsed_parts[key.strip()] = value.strip()

    timestamp = parsed_parts.get('t')
    if not timestamp:
        return False

    computed = hmac.new(
        webhook_secret.encode('utf-8'),
        f"{timestamp}.{raw_body.decode('utf-8')}".encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()

    signatures = [
        parsed_parts.get('v1'),
        parsed_parts.get('te'),
        parsed_parts.get('li'),
    ]

    for signature in signatures:
        if signature and hmac.compare_digest(computed, signature):
            return True
    return False


PAYMONGO_ALLOWED_EVENTS = {
    'checkout_session.payment.paid',
    'checkout_session.payment.failed',
    'checkout_session.expired',
    'payment.paid',
    'payment.failed',
}

PAYMONGO_REPLAY_WINDOW_MINUTES = 15
STAFF_INVITATION_EXPIRY_MINUTES = max(1, int(getattr(settings, 'STAFF_INVITATION_EXPIRY_MINUTES', 15)))
EMAIL_VERIFICATION_EXPIRY_MINUTES = max(1, int(getattr(settings, 'EMAIL_VERIFICATION_EXPIRY_MINUTES', 30)))

logger = logging.getLogger(__name__)


BEST_SELLER_EXCLUDED_CATEGORY_NAMES = (
    'add-ons',
    'add on',
    'add-on',
    'add ons',
    'addons',
    'addon',
    'others',
    'other',
)


def _build_best_seller_category_exclusion_q(field_name):
    exclusion_q = Q()
    for category_name in BEST_SELLER_EXCLUDED_CATEGORY_NAMES:
        exclusion_q |= Q(**{f'{field_name}__iexact': category_name})
    return exclusion_q


def _receipt_item_revenue_expression():
    return ExpressionWrapper(
        F('price') * F('quantity'),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )


def _extract_human_error_message(detail):
    if detail is None:
        return ""

    if isinstance(detail, dict):
        for preferred_key in ("error", "detail", "non_field_errors"):
            if preferred_key in detail:
                message = _extract_human_error_message(detail.get(preferred_key))
                if message:
                    return message

        for value in detail.values():
            message = _extract_human_error_message(value)
            if message:
                return message
        return ""

    if isinstance(detail, (list, tuple, set)):
        messages = [
            _extract_human_error_message(item)
            for item in detail
        ]
        messages = [message for message in messages if message]
        return "; ".join(messages)

    raw_text = str(detail).strip()
    if not raw_text:
        return ""

    # Fallback parser for raw stringified DRF ErrorDetail objects.
    match = re.search(r"ErrorDetail\(string=(['\"])(.+?)\1,\s*code=", raw_text)
    if match:
        return match.group(2)

    return raw_text


def _to_user_friendly_transaction_error(detail, fallback_message=None):
    fallback = fallback_message or "Unable to complete the transaction. Please try again."
    message = _extract_human_error_message(detail)
    if not message:
        return fallback

    stock_match = re.match(
        r"Not enough servings for\s+(.+?)\.\s*Only\s+(\d+)\s+left\.?$",
        message,
        flags=re.IGNORECASE,
    )

    if stock_match:
        product_name = stock_match.group(1).strip()
        remaining_count = int(stock_match.group(2))

        if remaining_count <= 0:
            return f"Cannot complete this order. {product_name} is out of stock."

        serving_label = "serving" if remaining_count == 1 else "servings"
        return f"Cannot complete this order. Only {remaining_count} {serving_label} of {product_name} are left."

    coupon_archived_match = re.match(r"Coupon\s+(.+?)\s+is archived\.?$", message, flags=re.IGNORECASE)
    if coupon_archived_match:
        coupon_code = coupon_archived_match.group(1).strip()
        return f"Cannot complete this order because coupon {coupon_code} is no longer available."

    coupon_expired_match = re.match(r"Coupon\s+(.+?)\s+has expired\.?$", message, flags=re.IGNORECASE)
    if coupon_expired_match:
        coupon_code = coupon_expired_match.group(1).strip()
        return f"Cannot complete this order because coupon {coupon_code} has expired."

    coupon_min_spend_match = re.match(
        r"Coupon\s+(.+?)\s+requires a minimum spend of\s+(.+?)\.?$",
        message,
        flags=re.IGNORECASE,
    )
    if coupon_min_spend_match:
        coupon_code = coupon_min_spend_match.group(1).strip()
        required_amount = coupon_min_spend_match.group(2).strip()
        return f"Cannot complete this order. Spend at least {required_amount} to use coupon {coupon_code}."

    if re.search(r"Coupons are tied to user accounts", message, flags=re.IGNORECASE):
        return "Please select a customer before using coupons on this order."

    coupon_not_claimed_match = re.match(
        r"Coupon\s+(.+?)\s+is not claimed by user\s+(.+?)\.?$",
        message,
        flags=re.IGNORECASE,
    )
    if coupon_not_claimed_match:
        coupon_code = coupon_not_claimed_match.group(1).strip()
        return f"Cannot use coupon {coupon_code} for the selected customer account."

    coupon_used_match = re.match(
        r"User\s+(.+?)\s+has already used coupon\s+(.+?)\.?$",
        message,
        flags=re.IGNORECASE,
    )
    if coupon_used_match:
        coupon_code = coupon_used_match.group(2).strip()
        return f"Coupon {coupon_code} has already been used by this customer."

    coupon_sold_out_match = re.match(r"Coupon\s+(.+?)\s+is sold out\.?$", message, flags=re.IGNORECASE)
    if coupon_sold_out_match:
        coupon_code = coupon_sold_out_match.group(1).strip()
        return f"Coupon {coupon_code} is sold out and can no longer be used."

    if re.match(r"Product\s+\d+\s+not found\.?$", message, flags=re.IGNORECASE):
        return "One of the items in this order is no longer available. Please refresh the menu and try again."

    if re.match(r"GCash reference number must be at least 8 alphanumeric characters\.?$", message, flags=re.IGNORECASE):
        return "Please enter a valid GCash reference number with at least 8 letters or numbers."

    if re.match(r"This GCash reference number has already been used in a previous transaction\.?$", message, flags=re.IGNORECASE):
        return "This GCash reference number has already been used. Please enter a different reference number."

    return message


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def trigger_deactivated_cleanup(request):
    # Supports key via query (?key=...) or Authorization header (Bearer <key>).
    provided_key = request.query_params.get('key') or request.data.get('key')
    authorization = request.headers.get('Authorization', '')
    if not provided_key and authorization:
        if authorization.lower().startswith('bearer '):
            provided_key = authorization.split(' ', 1)[1].strip()
        else:
            provided_key = authorization.strip()

    expected_key = getattr(settings, 'CRON_SECRET_KEY', '')
    if not expected_key:
        return Response(
            {'error': 'Cron secret key is not configured on the server.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if provided_key != expected_key:
        return Response({'error': 'Unauthorized. Invalid cron key.'}, status=status.HTTP_403_FORBIDDEN)

    days_raw = request.query_params.get('days') or request.data.get('days')
    dry_run_raw = request.query_params.get('dry_run') or request.data.get('dry_run')

    command_kwargs = {}
    if days_raw not in (None, ''):
        try:
            days_value = int(days_raw)
            if days_value < 1:
                raise ValueError('days must be >= 1')
            command_kwargs['days'] = days_value
        except (TypeError, ValueError):
            return Response({'error': "Invalid 'days' value. Use a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

    if str(dry_run_raw).lower() in {'1', 'true', 'yes', 'y', 'on'}:
        command_kwargs['dry_run'] = True

    try:
        stdout_buffer = StringIO()
        call_command('cleanup_deactivated_users', stdout=stdout_buffer, **command_kwargs)
        return Response(
            {
                'status': 'success',
                'message': 'cleanup_deactivated_users executed successfully.',
                'details': stdout_buffer.getvalue().strip(),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        return Response(
            {'status': 'error', 'message': str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def _normalize_coupon_code(raw_code):
    if raw_code is None:
        return ''
    return re.sub(r'[^A-Za-z0-9]', '', str(raw_code)).upper()


def _coupon_display_reference(coupon, fallback=None):
    if fallback:
        return fallback
    if coupon.code:
        return coupon.code
    if coupon.criteria and coupon.criteria.name:
        return coupon.criteria.name
    return f"Coupon #{coupon.id}"


def _generate_unique_claim_code():
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for _ in range(12):
        candidate = 'VD' + ''.join(secrets.choice(alphabet) for _ in range(8))
        if not CouponClaim.objects.filter(code=candidate).exists():
            return candidate
    return f"VD{uuid.uuid4().hex[:10].upper()}"


def _get_or_create_personal_claim_code(coupon, user):
    existing = CouponClaim.objects.filter(coupon=coupon, user=user).first()
    if existing:
        return existing

    for _ in range(12):
        try:
            return CouponClaim.objects.create(
                coupon=coupon,
                user=user,
                code=_generate_unique_claim_code(),
            )
        except IntegrityError:
            # Handle both code collision and duplicate claim races.
            current = CouponClaim.objects.filter(coupon=coupon, user=user).first()
            if current:
                return current

    # Last-resort deterministic fallback if collisions keep happening.
    return CouponClaim.objects.get_or_create(
        coupon=coupon,
        user=user,
        defaults={'code': f"VD{uuid.uuid4().hex[:10].upper()}"},
    )[0]


def _process_coupon_usage(receipt, target_customer, coupon_codes=None):
    coupon_codes = coupon_codes if isinstance(coupon_codes, dict) else {}

    for coupon_ref in receipt.coupons.all():
        coupon = Coupon.objects.select_for_update().get(id=coupon_ref.id)
        submitted_code = _normalize_coupon_code(
            coupon_codes.get(str(coupon.id)) if str(coupon.id) in coupon_codes else coupon_codes.get(coupon.id)
        )
        coupon_ref_label = _coupon_display_reference(coupon, submitted_code or None)

        if coupon.is_archived:
            raise Exception(f"Coupon {coupon_ref_label} is archived.")

        if coupon.criteria and coupon.criteria.valid_to and coupon.criteria.valid_to < timezone.now():
            raise Exception(f"Coupon {coupon_ref_label} has expired.")

        if coupon.criteria and coupon.criteria.min_spend > 0:
            if receipt.subtotal < coupon.criteria.min_spend:
                raise Exception(f"Coupon {coupon_ref_label} requires a minimum spend of ₱{coupon.criteria.min_spend}.")

        if not target_customer:
            raise Exception("Coupons are tied to user accounts. Please select a customer first.")

        claim = None
        if submitted_code:
            claim = CouponClaim.objects.select_for_update().filter(
                coupon=coupon,
                user=target_customer,
                code__iexact=submitted_code,
            ).first()

        if not claim:
            claim = CouponClaim.objects.select_for_update().filter(
                coupon=coupon,
                user=target_customer,
            ).first()

        # Keep backward compatibility for legacy shared-code coupons that predate CouponClaim.
        legacy_code = _normalize_coupon_code(coupon.code)
        is_legacy_code_match = bool(submitted_code and legacy_code and submitted_code == legacy_code)

        if not claim:
            has_claim = coupon.claimed_by.filter(id=target_customer.id).exists()
            if not has_claim or (submitted_code and not is_legacy_code_match):
                raise Exception(f"Coupon {coupon_ref_label} is not claimed by user {target_customer.username}.")

        if claim and claim.is_redeemed:
            raise Exception(f"User {target_customer.username} has already used coupon {coupon_ref_label}.")

        if not claim:
            already_used = Receipt.objects.filter(
                coupons=coupon,
                customer=target_customer,
                status__iexact=Receipt.Status.COMPLETED,
            ).exclude(id=receipt.id).exists()

            if already_used:
                raise Exception(f"User {target_customer.username} has already used coupon {coupon_ref_label}.")

        if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
            raise Exception(f"Coupon {coupon_ref_label} is sold out.")

        coupon.times_used += 1
        if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
            coupon.status = 'Redeemed'
        coupon.save()

        if claim and not claim.is_redeemed:
            claim.is_redeemed = True
            claim.redeemed_at = timezone.now()
            claim.save(update_fields=['is_redeemed', 'redeemed_at'])


def _normalize_payment_status(event_type="", raw_status=""):
    event_type = (event_type or '').lower()
    raw_status = (raw_status or '').lower()

    if 'paid' in event_type or raw_status in ['paid', 'succeeded', 'success']:
        return PaymentTransaction.Status.PAID
    if 'expired' in event_type or raw_status in ['expired']:
        return PaymentTransaction.Status.EXPIRED
    if 'failed' in event_type or raw_status in ['failed', 'cancelled', 'canceled']:
        return PaymentTransaction.Status.FAILED
    return None


def _sync_receipt_with_payment(payment_txn):
    if not payment_txn.receipt_id:
        return

    receipt = payment_txn.receipt
    if payment_txn.status == PaymentTransaction.Status.PAID:
        receipt.payment_method = Receipt.PaymentMethod.GCASH
        receipt.payment_status = Receipt.PaymentStatus.PAID
        
        # FIX 1: Only set internal reference if manual reference is empty
        if not receipt.provider_reference:
            receipt.provider_reference = payment_txn.reference
            
        receipt.provider_payment_id = payment_txn.provider_payment_id
        if not receipt.paid_at:
            receipt.paid_at = payment_txn.paid_at or timezone.now()
        receipt.save(update_fields=['payment_method', 'payment_status', 'provider_reference', 'provider_payment_id', 'paid_at'])
    elif payment_txn.status == PaymentTransaction.Status.EXPIRED:
        receipt.payment_status = Receipt.PaymentStatus.EXPIRED
        receipt.save(update_fields=['payment_status'])
    elif payment_txn.status in [PaymentTransaction.Status.FAILED, PaymentTransaction.Status.CANCELLED]:
        receipt.payment_status = Receipt.PaymentStatus.FAILED
        receipt.save(update_fields=['payment_status'])


def _finalize_receipt_from_paid_transaction(payment_txn):
    if payment_txn.receipt_id or payment_txn.status != PaymentTransaction.Status.PAID:
        return payment_txn.receipt if payment_txn.receipt_id else None

    payload = payment_txn.order_payload if isinstance(payment_txn.order_payload, dict) else {}
    if not payload:
        return None

    payload = {**payload}
    payload['payment_method'] = 'GCASH'
    payload['cash_given'] = payload.get('cash_given') or payload.get('total')
    payload['change'] = payload.get('change') or '0.00'

    serializer = ReceiptSerializer(data=payload)
    serializer.is_valid(raise_exception=True)

    with transaction.atomic():
        receipt = serializer.save(cashier=payment_txn.cashier, customer=payment_txn.customer)

        if payment_txn.customer:
            _process_coupon_usage(receipt, payment_txn.customer)

        receipt.payment_method = Receipt.PaymentMethod.GCASH
        receipt.payment_status = Receipt.PaymentStatus.PAID
        
        # FIX 2: Prefer the manual reference from the frontend payload
        receipt.provider_reference = payload.get('provider_reference') or payment_txn.reference
        
        receipt.provider_payment_id = payment_txn.provider_payment_id
        receipt.paid_at = payment_txn.paid_at or timezone.now()
        receipt.save(update_fields=['payment_method', 'payment_status', 'provider_reference', 'provider_payment_id', 'paid_at'])

        payment_txn.receipt = receipt
        payment_txn.save(update_fields=['receipt', 'updated_at'])

    return receipt


def _sync_transaction_from_paymongo(payment_txn):
    if not payment_txn.provider_checkout_id:
        return payment_txn

    try:
        # Check if it's a Payment Intent (Starts with pi_)
        if payment_txn.provider_checkout_id.startswith('pi_'):
            response = requests.get(
                f"https://api.paymongo.com/v1/payment_intents/{payment_txn.provider_checkout_id}",
                headers=_paymongo_headers(),
                timeout=20,
            )
            if response.status_code >= 400:
                return payment_txn

            response_data = response.json()
            intent_attributes = response_data.get('data', {}).get('attributes') or {}
            intent_status = intent_attributes.get('status') or ''

            payments_list = intent_attributes.get('payments')
            payment_status = ''
            if isinstance(payments_list, list) and payments_list:
                first_payment = payments_list[0] or {}
                if isinstance(first_payment, dict):
                    payment_txn.provider_payment_id = first_payment.get('id') or payment_txn.provider_payment_id
                    payment_status = first_payment.get('attributes', {}).get('status') or ''
                    
            # Use 'succeeded' or 'paid' as our success marker
            final_status_to_check = payment_status if payment_status in ['succeeded', 'paid'] else intent_status
            normalized = _normalize_payment_status(raw_status=final_status_to_check)
            
        else:
            # Fallback for old Checkout Sessions (Keeps existing DB entries from breaking)
            response = requests.get(
                f"https://api.paymongo.com/v1/checkout_sessions/{payment_txn.provider_checkout_id}",
                headers=_paymongo_headers(),
                timeout=20,
            )
        if normalized:
            payment_txn.status = normalized
            if normalized == PaymentTransaction.Status.PAID and not payment_txn.paid_at:
                payment_txn.paid_at = timezone.now()

        payment_txn.raw_provider_payload = response_data if isinstance(response_data, dict) else {}
        payment_txn.save(update_fields=['status', 'paid_at', 'provider_payment_id', 'raw_provider_payload', 'updated_at'])
        _sync_receipt_with_payment(payment_txn)
    except Exception:
        return payment_txn

    return payment_txn


def _normalize_manual_reference(reference_value):
    if reference_value is None:
        return ''
    return re.sub(r'[^A-Za-z0-9]', '', str(reference_value)).upper()


def thermal_receipt_view(request, receipt_id):
    receipt = get_object_or_404(
        Receipt.objects.prefetch_related('items'),
        id=receipt_id,
    )

    context = {
        'store_name': 'Kuya Vince Karinderya',
        'receipt': receipt,
        'items': receipt.items.all().order_by('id'),
    }
    return render(request, 'thermal_receipt.html', context)


def _build_email_verification_link(token):
    app_scheme = (getattr(settings, 'APP_DEEP_LINK_SCHEME', '') or 'food').strip().replace('://', '')
    if not app_scheme:
        app_scheme = 'food'
    return f"{app_scheme}://verify-email?token={token}"


def _build_email_verification_fallback_link(token):
    backend_base_url = (getattr(settings, 'BACKEND_BASE_URL', '') or '').rstrip('/')
    if not backend_base_url:
        backend_base_url = 'http://localhost:8000'
    return f"{backend_base_url}/firstapp/users/verify-email/?token={token}"


def _create_email_verification_token(user):
    EmailVerificationToken.objects.filter(user=user, is_valid=True).update(is_valid=False)

    expires_at = timezone.now() + timedelta(minutes=EMAIL_VERIFICATION_EXPIRY_MINUTES)
    token_str = secrets.token_urlsafe(32)

    return EmailVerificationToken.objects.create(
        user=user,
        token=token_str,
        expires_at=expires_at,
        is_valid=True,
    )


def _send_email_verification_email(user, token):
    verification_link = _build_email_verification_link(token)
    fallback_link = _build_email_verification_fallback_link(token)

    send_mail(
        subject='Verify Your Email – Kuya Vince Karinderya',
        message=(
            f"Hi {user.first_name or user.username},\n\n"
            "Thank you for signing up. Please verify your email by clicking the link below:\n\n"
            f"{verification_link}\n\n"
            "If the app does not open automatically, use this fallback link:\n"
            f"{fallback_link}\n\n"
            f"This verification link expires in {EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes.\n"
            "If you did not create this account, please ignore this email.\n\n"
            "– Kuya Vince Karinderya"
        ),
        html_message=(
            "<div style='font-family: sans-serif;'>"
            f"<h3>Hi {user.first_name or user.username},</h3>"
            "<p>Thank you for signing up. Please verify your email to activate your account.</p>"
            f"<p><a href='{verification_link}' style='padding: 10px 20px; background-color: #B71C1C; color: white; text-decoration: none; border-radius: 6px; display: inline-block;'>Verify Email</a></p>"
            f"<p>If the app does not open automatically, use this fallback link:</p>"
            f"<p><a href='{fallback_link}'>{fallback_link}</a></p>"
            f"<p><strong>This link expires in {EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes.</strong></p>"
            "<p>If you did not create this account, please ignore this email.</p>"
            "</div>"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


# -------------------------------
# USER CRUD
# -------------------------------

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # Public endpoint — skip JWT validation

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)

        data['is_staff'] = False
        data['is_superuser'] = False
        data['is_active'] = False

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                user = serializer.save()
                verification_token = _create_email_verification_token(user)
                _send_email_verification_email(user, verification_token.token)
        except Exception as exc:
            logger.error(
                "Failed to complete legacy signup email verification setup for '%s': %s",
                data.get('email', ''),
                exc,
            )
            return Response(
                {
                    "error": "We could not send the verification email. Please try signing up again.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                "user": serializer.data,
                "message": "Account created successfully. Please verify your email before logging in.",
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer
    # permission_classes = [IsAdminUser]

    # [NEW] 1. OVERRIDE CREATE TO INTERCEPT STAFF CREATION
    def create(self, request, *args, **kwargs):
        # request.data might be immutable, so we copy it safely
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data

        # Check if the account being created is a staff account
        is_staff = data.get('is_staff', False)
        if isinstance(is_staff, str):
            is_staff = is_staff.lower() in ['true', '1', 't']

        # If it's a staff account, make it inactive pending email verification
        if is_staff:
            data['is_active'] = False  

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        user = serializer.instance

        # GENERATE TOKEN AND SEND EMAIL IF STAFF
        if is_staff and user.email:
            token_str = secrets.token_urlsafe(32)
            StaffInvitationToken.objects.filter(user=user, is_valid=True).update(is_valid=False)
            StaffInvitationToken.objects.create(user=user, token=token_str)

            # Define your frontend URL (Update this in production)
            frontend_url = getattr(settings, 'FRONTEND_URL', None) or 'https://www.kuyavince-karinderya.store'
            
            accept_link = f"{frontend_url}/verify-staff?token={token_str}&action=accept"
            reject_link = f"{frontend_url}/verify-staff?token={token_str}&action=reject"

            try:
                send_mail(
                    subject='Staff Account Invitation – Kuya Vince Karinderya',
                    message=(
                        f"Hi {user.first_name or user.username},\n\n"
                        f"You have been invited to join Kuya Vince Karinderya as a staff member.\n\n"
                        f"To ACCEPT: {accept_link}\n"
                        f"To REJECT: {reject_link}\n\n"
                        f"This invitation expires in {STAFF_INVITATION_EXPIRY_MINUTES} minutes.\n\n"
                        f"If you did not expect this, please ignore this email."
                    ),
                    html_message=(
                        f"<div style='font-family: sans-serif;'>"
                        f"<h3>Hi {user.first_name or user.username},</h3>"
                        f"<p>You have been invited to join Kuya Vince Karinderya as a staff member.</p>"
                        f"<p><a href='{accept_link}' style='padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; display: inline-block;'>Accept Invitation</a></p>"
                        f"<p><a href='{reject_link}' style='padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; display: inline-block;'>Reject Invitation</a></p>"
                        f"<p><strong>This invitation expires in {STAFF_INVITATION_EXPIRY_MINUTES} minutes.</strong></p>"
                        f"<p><small>If you did not expect this, please ignore this email.</small></p>"
                        f"</div>"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to send staff invitation email to {user.email}: {e}")

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='register')
    def register(self, request):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)

        # Public signup always creates a regular pending user.
        data['is_staff'] = False
        data['is_superuser'] = False
        data['is_active'] = False

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = serializer.save()
                verification_token = _create_email_verification_token(user)
                _send_email_verification_email(user, verification_token.token)
        except Exception as exc:
            logger.error(
                "Failed to complete signup email verification setup for '%s': %s",
                data.get('email', ''),
                exc,
            )
            return Response(
                {
                    "error": "We could not send the verification email. Please try signing up again.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "user": serializer.data,
                "message": "Account created successfully. Please verify your email before logging in.",
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get', 'post'], permission_classes=[AllowAny], url_path='verify-email')
    def verify_email(self, request):
        payload = request.query_params if request.method == 'GET' else request.data
        token = str(payload.get('token', '')).strip()

        if not token:
            return Response({"error": "Verification token is required."}, status=status.HTTP_400_BAD_REQUEST)

        verification = EmailVerificationToken.objects.select_related('user').filter(token=token).first()
        if not verification:
            return Response({"error": "Invalid verification link."}, status=status.HTTP_400_BAD_REQUEST)

        if not verification.is_valid:
            return Response({"error": "This verification link has already been used."}, status=status.HTTP_400_BAD_REQUEST)

        if verification.expires_at <= timezone.now():
            verification.is_valid = False
            verification.save(update_fields=['is_valid'])
            return Response(
                {"error": "This verification link has expired. Please request a new verification email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = verification.user
        user.is_active = True
        user.save(update_fields=['is_active'])

        profile = getattr(user, 'profile', None)
        if profile and profile.deactivated_at is not None:
            profile.deactivated_at = None
            profile.save(update_fields=['deactivated_at'])

        verification.is_valid = False
        verification.verified_at = timezone.now()
        verification.save(update_fields=['is_valid', 'verified_at'])

        EmailVerificationToken.objects.filter(user=user, is_valid=True).exclude(id=verification.id).update(is_valid=False)

        return Response(
            {"message": "Email verified successfully. You can now log in."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='resend-verification-email')
    def resend_verification_email(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email, is_staff=False).first()

        # Return a generic message to prevent account enumeration.
        generic_message = (
            "If an account pending verification exists for this email, "
            "a new verification link has been sent."
        )

        if not user:
            return Response({"message": generic_message}, status=status.HTTP_200_OK)

        profile = getattr(user, 'profile', None)
        if user.is_active or (profile and profile.deactivated_at is not None):
            return Response({"message": generic_message}, status=status.HTTP_200_OK)

        try:
            verification_token = _create_email_verification_token(user)
            _send_email_verification_email(user, verification_token.token)
        except Exception as exc:
            logger.error("Failed to resend verification email to '%s': %s", email, exc)
            return Response(
                {"error": "Unable to send verification email right now. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"message": generic_message}, status=status.HTTP_200_OK)

    # [NEW] 'Me' Endpoint to fetch/update current user details
    @action(detail=False, methods=['get', 'patch', 'put'], permission_classes=[IsAuthenticated], url_path='me')
    def me(self, request):
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)

        # PATCH / PUT – update profile
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='deactivate')
    def deactivate_account(self, request):
        """
        Deactivates the user account after verifying the password.
        Sets is_active=False and records the deactivation timestamp.
        """
        user = request.user
        password = request.data.get('password')

        if not password:
            return Response({"error": "Password is required to deactivate account."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify password
        if not user.check_password(password):
            return Response({"error": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)

        # Deactivate User
        user.is_active = False
        user.save()

        # [NEW] Record the exact time of deactivation
        user.profile.deactivated_at = timezone.now()
        user.profile.save()

        return Response({"message": "Account deactivated successfully. It will be permanently deleted in 30 days."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='reactivate')
    def reactivate_account(self, request):
        """
        Reactivates a deactivated regular-user account after verifying credentials.
        """
        username = str(request.data.get('username', '')).strip()
        password = request.data.get('password')

        if not username:
            return Response({"error": "Username is required to reactivate account."}, status=status.HTTP_400_BAD_REQUEST)

        if not password:
            return Response({"error": "Password is required to reactivate account."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(username=username, is_staff=False).first()
        if not user:
            return Response({"error": "No account found with the provided username."}, status=status.HTTP_404_NOT_FOUND)

        profile = getattr(user, 'profile', None)
        is_deactivated = bool(profile and profile.deactivated_at)

        if user.is_active and not is_deactivated:
            return Response({"error": "This account is already active. Please log in."}, status=status.HTTP_400_BAD_REQUEST)

        if not is_deactivated:
            return Response(
                {"error": "This account is pending email verification. Please verify your email first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(password):
            return Response({"error": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save(update_fields=['is_active'])

        if profile and profile.deactivated_at is not None:
            profile.deactivated_at = None
            profile.save(update_fields=['deactivated_at'])

        return Response({"message": "Account reactivated successfully. You can now log in."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser], url_path='cleanup-deactivated')
    def cleanup_deactivated(self, request):
        """
        Manual cleanup endpoint for admins.
        Deletes only regular-user accounts (non-staff, non-superuser)
        that have been deactivated for at least 30 days.
        """
        thirty_days_ago = timezone.now() - timedelta(days=30)

        users_to_delete = User.objects.filter(
            is_active=False,
            is_staff=False,
            is_superuser=False,
            profile__deactivated_at__lte=thirty_days_ago,
        )

        deleted_count = users_to_delete.count()
        if deleted_count:
            users_to_delete.delete()

        return Response(
            {
                "message": f"Cleanup complete. Deleted {deleted_count} deactivated user account(s).",
                "deleted_count": deleted_count,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='claimed-coupons')
    def claimed_coupons(self, request, pk=None):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({"error": "Only staff can access customer coupon wallets."}, status=status.HTTP_403_FORBIDDEN)

        customer = get_object_or_404(User, id=pk)

        claimed_coupons = Coupon.objects.filter(is_archived=False).filter(
            Q(claimed_by=customer) | Q(claims__user=customer)
        ).annotate(
            is_used_by_user=Exists(
                Receipt.objects.filter(
                    coupons=OuterRef('pk'),
                    customer=customer,
                    status__iexact=Receipt.Status.COMPLETED,
                )
            )
        ).distinct().order_by('-created_at')

        serializer = CouponSerializer(claimed_coupons, many=True, context={'request': request})
        data = serializer.data

        claim_map = {
            claim['coupon_id']: claim
            for claim in CouponClaim.objects.filter(
                user=customer,
                coupon_id__in=[coupon.id for coupon in claimed_coupons],
            ).values('coupon_id', 'code', 'is_redeemed')
        }

        for index, coupon in enumerate(claimed_coupons):
            claim_info = claim_map.get(coupon.id)
            if claim_info:
                data[index]['code'] = claim_info.get('code') or data[index].get('code')
                data[index]['is_used'] = bool(claim_info.get('is_redeemed'))
            else:
                data[index]['is_used'] = coupon.is_used_by_user

        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='coupon-claimants')
    def coupon_claimants(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({"error": "Only staff can search coupon claimants."}, status=status.HTTP_403_FORBIDDEN)

        promo_name = str(request.query_params.get('promo_name', '')).strip()
        if not promo_name:
            return Response({"error": "promo_name query parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        matched_coupons = list(
            Coupon.objects.filter(is_archived=False)
            .filter(criteria__name__icontains=promo_name)
            .order_by('-created_at')
        )

        if not matched_coupons:
            return Response([], status=status.HTTP_200_OK)

        serialized_coupons = CouponSerializer(
            matched_coupons,
            many=True,
            context={'request': request},
        ).data
        coupon_payload_map = {item['id']: item for item in serialized_coupons}

        claim_rows = CouponClaim.objects.filter(coupon__in=matched_coupons).select_related('user', 'coupon')
        claims_by_coupon_id = {}
        for claim in claim_rows:
            claims_by_coupon_id.setdefault(claim.coupon_id, []).append(claim)

        response_rows = []
        for coupon in matched_coupons:
            coupon_payload = dict(coupon_payload_map.get(coupon.id, {}))
            claimants = []
            claimed_user_ids = set()

            for claim in claims_by_coupon_id.get(coupon.id, []):
                user = claim.user
                claimed_user_ids.add(user.id)
                claimants.append(
                    {
                        'id': user.id,
                        'username': user.username,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'code': claim.code,
                        'is_used': bool(claim.is_redeemed),
                    }
                )

            legacy_claimants = coupon.claimed_by.exclude(id__in=claimed_user_ids)
            for user in legacy_claimants:
                legacy_is_used = Receipt.objects.filter(
                    coupons=coupon,
                    customer=user,
                    status__iexact=Receipt.Status.COMPLETED,
                ).exists()
                claimants.append(
                    {
                        'id': user.id,
                        'username': user.username,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'code': coupon.code or '',
                        'is_used': bool(legacy_is_used),
                    }
                )

            if not claimants:
                continue

            claimants.sort(
                key=lambda row: (
                    str(row.get('first_name') or '').strip().lower(),
                    str(row.get('last_name') or '').strip().lower(),
                    str(row.get('username') or '').strip().lower(),
                )
            )

            coupon_payload['claimants'] = claimants
            response_rows.append(coupon_payload)

        return Response(response_rows, status=status.HTTP_200_OK)

    # [NEW] 2. NEW ACTION TO HANDLE THE VERIFICATION FROM EMAIL
    @action(detail=False, methods=['get', 'post'], permission_classes=[AllowAny], url_path='verify-invite')
    def verify_invite(self, request):
        payload = request.data if request.method == 'POST' else request.query_params
        token = payload.get('token')
        action_type = (payload.get('action') or '').lower()  # 'accept' or 'reject'

        if not token or action_type not in ['accept', 'reject']:
            return Response({"error": "Valid token and action ('accept' or 'reject') are required."}, status=status.HTTP_400_BAD_REQUEST)

        expiry_cutoff = timezone.now() - timedelta(minutes=STAFF_INVITATION_EXPIRY_MINUTES)
        # Keep token state in sync by invalidating stale links before processing.
        StaffInvitationToken.objects.filter(is_valid=True, created_at__lt=expiry_cutoff).update(is_valid=False)

        try:
            invite_token = StaffInvitationToken.objects.select_related('user').get(
                token=token,
                is_valid=True,
                created_at__gte=expiry_cutoff,
            )
            user = invite_token.user

            if action_type == 'accept':
                user.is_active = True
                user.save(update_fields=['is_active'])
                invite_token.is_valid = False
                invite_token.save(update_fields=['is_valid'])
                return Response({"message": "Account activated successfully. You can now log in."}, status=status.HTTP_200_OK)
            
            elif action_type == 'reject':
                # If they reject, we delete the pending account entirely to keep the DB clean
                invite_token.is_valid = False
                invite_token.save(update_fields=['is_valid'])
                user.delete() 
                return Response({"message": "Invitation rejected. The pending account has been removed."}, status=status.HTTP_200_OK)

        except StaffInvitationToken.DoesNotExist:
            return Response(
                {"error": f"Invalid or expired invitation token. Invitation links expire after {STAFF_INVITATION_EXPIRY_MINUTES} minutes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class SafeTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        try:
            return super().validate(attrs)
        except User.DoesNotExist:
            raise InvalidToken("Token is invalid or user no longer exists")


class SafeTokenRefreshView(TokenRefreshView):
    serializer_class = SafeTokenRefreshSerializer


class PlatformTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get(self.username_field)
        password = attrs.get("password")

        user = User.objects.filter(**{self.username_field: username}).first()

        if not user or not user.check_password(password):
            raise AuthenticationFailed("No active account found with the given credentials")

        platform = self.context.get("request").data.get("platform", "web")

        if platform == "web" and user.is_staff and not user.is_superuser:
            store_settings, _ = StoreSettings.objects.get_or_create(id=1)
            if not store_settings.store_is_open:
                raise AuthenticationFailed("Store is currently closed. Staff login is temporarily disabled.")

        if platform == "web" and user.is_staff and not user.is_active:
            raise AuthenticationFailed("This staff account is blocked from web login")

        if platform == "app" and not user.is_staff and not user.is_active:
            has_pending_verification = EmailVerificationToken.objects.filter(
                user=user,
                is_valid=True,
                expires_at__gte=timezone.now(),
            ).exists()

            profile = getattr(user, 'profile', None)
            is_deactivated = bool(profile and profile.deactivated_at)

            if has_pending_verification or not is_deactivated:
                raise AuthenticationFailed(
                    "Please verify your email before logging in. Check your inbox for the verification link."
                )

            raise AuthenticationFailed("This account is deactivated. Reactivate your account to continue.")

        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class PlatformTokenObtainPairView(TokenObtainPairView):
    serializer_class = PlatformTokenObtainPairSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-id")
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['product_name']
    filterset_fields = ['category__name']

    @staticmethod
    def _is_truthy(value):
        return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}

    def get_queryset(self):
        completed_sales_subquery = ReceiptItem.objects.filter(
            product_id=OuterRef('pk'),
            receipt__status=Receipt.Status.COMPLETED,
        )
        queryset = Product.objects.annotate(
            has_completed_sales=Exists(completed_sales_subquery)
        ).order_by("-id")
        user = self.request.user

        include_archived = self._is_truthy(self.request.query_params.get('include_archived'))
        archived_only = self._is_truthy(self.request.query_params.get('archived_only'))
        uncategorized_only = self._is_truthy(self.request.query_params.get('uncategorized'))
        is_admin = bool(user and user.is_authenticated and user.is_staff)

        if not is_admin:
            queryset = queryset.filter(is_archived=False)
            if uncategorized_only:
                queryset = queryset.filter(category__isnull=True)
            return queryset

        if archived_only:
            queryset = queryset.filter(is_archived=True)
            if uncategorized_only:
                queryset = queryset.filter(category__isnull=True)
            return queryset

        if include_archived:
            if uncategorized_only:
                queryset = queryset.filter(category__isnull=True)
            return queryset

        queryset = queryset.filter(is_archived=False)
        if uncategorized_only:
            queryset = queryset.filter(category__isnull=True)
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'best_sellers', 'top_rated']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    @staticmethod
    def _parse_limit(raw_limit, default=2, max_limit=20):
        try:
            limit = int(raw_limit)
        except (TypeError, ValueError):
            return default

        if limit < 1:
            return default

        return min(limit, max_limit)

    @staticmethod
    def _start_of_day(reference_dt):
        return reference_dt.replace(hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def _start_of_week(reference_dt):
        day_start = ProductViewSet._start_of_day(reference_dt)
        return day_start - timedelta(days=day_start.weekday())

    def _serialize_products_with_stats(self, request, ordered_product_ids, stats_by_product):
        if not ordered_product_ids:
            return []

        products = Product.objects.filter(id__in=ordered_product_ids, is_archived=False)
        product_map = {product.id: product for product in products}
        ordered_products = [product_map[product_id] for product_id in ordered_product_ids if product_id in product_map]

        serialized = self.get_serializer(ordered_products, many=True, context={'request': request}).data
        for item in serialized:
            stats = stats_by_product.get(item['id'], {})
            units_sold = int(stats.get('units_sold_weekly', 0) or 0)
            item['units_sold_weekly'] = units_sold
            item['units_sold_period'] = int(stats.get('units_sold_period', units_sold) or 0)
            item['total_revenue_period'] = float(stats.get('total_revenue_period', 0) or 0)
            item['total_orders_period'] = int(stats.get('total_orders_period', 0) or 0)
            item['average_rating'] = float(stats.get('average_rating', 0) or 0)
            item['review_count'] = int(stats.get('review_count', 0) or 0)
        return serialized

    @action(detail=False, methods=['get'], url_path='best-sellers')
    def best_sellers(self, request):
        period = str(request.query_params.get('period', 'weekly')).strip().lower()
        limit = self._parse_limit(request.query_params.get('limit'), default=2)

        now = timezone.now()
        period_start = None
        if period == 'daily':
            period_start = self._start_of_day(now)
        elif period == 'monthly':
            period_start = self._start_of_day(now).replace(day=1)
        else:
            period = 'weekly'
            period_start = self._start_of_week(now)

        sales_queryset = ReceiptItem.objects.filter(
            receipt__status=Receipt.Status.COMPLETED,
            product__isnull=False,
            product__is_archived=False,
            receipt__created_at__gte=period_start,
        ).exclude(_build_best_seller_category_exclusion_q('product__category__name'))

        revenue_expression = _receipt_item_revenue_expression()

        sales_rows = list(
            sales_queryset
            .values('product')
            .annotate(
                total_revenue=Sum(revenue_expression),
                total_orders=Count('receipt', distinct=True),
                units_sold=Sum('quantity'),
            )
            .order_by('-total_revenue', '-total_orders', '-units_sold', 'product')[:limit]
        )

        product_ids = [row['product'] for row in sales_rows if row.get('product')]
        if not product_ids:
            return Response([])

        rating_rows = Review.objects.filter(
            review_type='food',
            product_id__in=product_ids,
        ).values('product').annotate(
            average_rating=Avg('rating'),
            review_count=Count('id'),
        )

        rating_map = {
            row['product']: {
                'average_rating': float(row.get('average_rating') or 0),
                'review_count': int(row.get('review_count') or 0),
            }
            for row in rating_rows
        }

        stats_by_product = {}
        for row in sales_rows:
            product_id = row['product']
            rating_data = rating_map.get(product_id, {'average_rating': 0, 'review_count': 0})
            units_sold = int(row.get('units_sold') or 0)
            stats_by_product[product_id] = {
                'units_sold_weekly': units_sold,
                'units_sold_period': units_sold,
                'total_revenue_period': float(row.get('total_revenue') or 0),
                'total_orders_period': int(row.get('total_orders') or 0),
                'average_rating': rating_data['average_rating'],
                'review_count': rating_data['review_count'],
                'period': period,
            }

        data = self._serialize_products_with_stats(request, product_ids, stats_by_product)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='top-rated')
    def top_rated(self, request):
        limit = self._parse_limit(request.query_params.get('limit'), default=2)

        rating_rows = list(
            Review.objects.filter(
                review_type='food',
                product__isnull=False,
                product__is_archived=False,
            )
            .values('product')
            .annotate(
                average_rating=Avg('rating'),
                review_count=Count('id'),
            )
            .filter(review_count__gt=0)
            .order_by('-average_rating', '-review_count', 'product')[:limit]
        )

        product_ids = [row['product'] for row in rating_rows if row.get('product')]
        if not product_ids:
            return Response([])

        weekly_sales_rows = ReceiptItem.objects.filter(
            receipt__status=Receipt.Status.COMPLETED,
            product_id__in=product_ids,
            receipt__created_at__gte=self._start_of_week(timezone.now()),
        ).values('product').annotate(units_sold=Sum('quantity'))

        weekly_sales_map = {
            row['product']: int(row.get('units_sold') or 0)
            for row in weekly_sales_rows
        }

        stats_by_product = {
            row['product']: {
                'units_sold_weekly': weekly_sales_map.get(row['product'], 0),
                'average_rating': float(row.get('average_rating') or 0),
                'review_count': int(row.get('review_count') or 0),
            }
            for row in rating_rows
        }

        data = self._serialize_products_with_stats(request, product_ids, stats_by_product)
        return Response(data)

    @action(detail=False, methods=['post', 'patch'], url_path='archive')
    def archive(self, request):
        product_ids = request.data.get('product_ids', [])

        if not isinstance(product_ids, list) or not product_ids:
            return Response(
                {'detail': 'Provide a non-empty product_ids array.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_ids = []
        for product_id in product_ids:
            try:
                normalized_ids.append(int(product_id))
            except (TypeError, ValueError):
                continue

        if not normalized_ids:
            return Response(
                {'detail': 'No valid product IDs were provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_count = Product.objects.filter(id__in=normalized_ids, is_archived=False).update(
            is_archived=True,
            archived_at=timezone.now(),
            stock_quantity=0,
            is_available=False,
            is_pos_best_seller=False,
        )

        return Response(
            {'archived_count': updated_count},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post', 'patch'], url_path='unarchive')
    def unarchive(self, request):
        product_ids = request.data.get('product_ids', [])

        if not isinstance(product_ids, list) or not product_ids:
            return Response(
                {'detail': 'Provide a non-empty product_ids array.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_ids = []
        for product_id in product_ids:
            try:
                normalized_ids.append(int(product_id))
            except (TypeError, ValueError):
                continue

        if not normalized_ids:
            return Response(
                {'detail': 'No valid product IDs were provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_ids = list(
            Product.objects.filter(id__in=normalized_ids, is_archived=True).values_list('id', flat=True)
        )

        if not target_ids:
            return Response(
                {'unarchived_count': 0},
                status=status.HTTP_200_OK,
            )

        Product.objects.filter(id__in=target_ids).update(
            is_archived=False,
            archived_at=None,
            stock_quantity=0,
            is_available=False,
        )

        return Response(
            {'unarchived_count': len(target_ids)},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Deleting products is disabled. Archive products instead.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
    
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]
    
class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.all().order_by('-created_at')
    serializer_class = ReceiptSerializer
    lookup_field = "id"

    def get_queryset(self):
        queryset = Receipt.objects.all().order_by('-created_at')
        user = self.request.user

        if not user.is_authenticated:
            return Receipt.objects.none()

        if user.is_superuser: 
            return queryset
        
        return queryset.filter(cashier=user)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='my-transactions')
    def my_transactions(self, request):
        status_filter = str(request.query_params.get('status', '')).strip().upper()
        valid_statuses = {choice for choice, _ in Receipt.Status.choices}

        queryset = (
            Receipt.objects.filter(customer=request.user)
            .select_related('cashier', 'customer')
            .prefetch_related('items', 'coupons')
            .order_by('-created_at')
        )

        if status_filter in valid_statuses:
            queryset = queryset.filter(status=status_filter)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # ---------------------------------------------------------
    # 1. CREATE RECEIPT (Checkout)
    # ---------------------------------------------------------
    def create(self, request, *args, **kwargs):
        settings, _ = StoreSettings.objects.get_or_create(id=1)
        max_allowed_coupons = settings.max_coupons_per_order

        coupons_data = request.data.get('coupons', [])
        coupon_codes = request.data.get('coupon_codes', {})
        if not isinstance(coupon_codes, dict):
            coupon_codes = {}

        if isinstance(coupons_data, list) and len(coupons_data) > max_allowed_coupons:
            return Response(
                {"error": f"Maximum of {max_allowed_coupons} coupons allowed per order."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            try:
                with transaction.atomic():
                    # 1. Get Customer (if selected in POS)
                    customer_id = request.data.get('customer_id')
                    target_customer = None
                    if customer_id and customer_id != 'null': 
                        try:
                            target_customer = User.objects.get(id=customer_id)
                        except User.DoesNotExist:
                            pass

                    # 2. Save Receipt
                    receipt = serializer.save(
                        cashier=request.user, 
                        customer=target_customer
                    )

                    if receipt.payment_method == Receipt.PaymentMethod.CASH:
                        if not receipt.paid_at:
                            receipt.paid_at = timezone.now()
                            receipt.payment_status = Receipt.PaymentStatus.PAID
                            receipt.save(update_fields=['paid_at', 'payment_status'])
                        
                        # Add cash to the POS Drawer Balance
                        settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
                        settings_obj.pos_cash_balance += Decimal(str(receipt.total))
                        settings_obj.save(update_fields=['pos_cash_balance'])

                    if target_customer:
                        _process_coupon_usage(receipt, target_customer, coupon_codes=coupon_codes)

                    return Response(
                        {"receipt_id": receipt.id, **serializer.data},
                        status=status.HTTP_201_CREATED
                    )

            except Exception as e:
                error_message = _to_user_friendly_transaction_error(
                    getattr(e, 'detail', e),
                    fallback_message="Unable to complete the transaction. Please try again.",
                )
                return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "error": _to_user_friendly_transaction_error(
                    serializer.errors,
                    fallback_message="Cannot complete this order. Please check the details and try again.",
                ),
                "field_errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    @action(detail=False, methods=['post'], url_path='log-void')
    def log_void(self, request):
        items_data = request.data.get('items', [])
        void_reason = request.data.get('reason', 'Item Voided from Cart')
        user = request.user if request.user.is_authenticated else None

        if not items_data:
            return Response({"error": "No items provided"}, status=400)

        try:
            with transaction.atomic():
                total_void_amount = sum(float(item['price']) * int(item['quantity']) for item in items_data)

                receipt = Receipt.objects.create(
                    status='VOIDED',
                    cashier=user, 
                    total=total_void_amount,
                    subtotal=total_void_amount,
                    vat=0,
                    cash_given=0,
                    change=0,
                    void_reason=void_reason,
                    voided_at=timezone.now(),
                    voided_by=user 
                )

                for item in items_data:
                    try:
                        product = Product.objects.get(id=item['product_id'])
                        ReceiptItem.objects.create(
                            receipt=receipt,
                            product=product,
                            product_name=product.product_name,
                            price=item['price'],
                            quantity=item['quantity']
                        )
                    except Product.DoesNotExist:
                        continue

                return Response({"message": "Void logged successfully"}, status=201)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='void')
    def void_receipt(self, request, pk=None, id=None):
        receipt = self.get_object()

        if receipt.status == 'VOIDED':
            return Response(
                {"error": "This receipt is already voided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                receipt_items = receipt.items.select_related('product').all()
                for receipt_item in receipt_items:
                    product = receipt_item.product
                    if not product:
                        continue
                    Product.objects.filter(id=product.id).update(
                        stock_quantity=F('stock_quantity') + receipt_item.quantity,
                        is_available=True
                    )

                for coupon_ref in receipt.coupons.all():
                    coupon = Coupon.objects.select_for_update().get(id=coupon_ref.id)

                    if coupon.times_used > 0:
                        coupon.times_used -= 1

                    if receipt.customer_id:
                        claim = CouponClaim.objects.filter(coupon=coupon, user_id=receipt.customer_id).first()
                        if claim and claim.is_redeemed:
                            claim.is_redeemed = False
                            claim.redeemed_at = None
                            claim.save(update_fields=['is_redeemed', 'redeemed_at'])

                    if coupon.usage_limit is not None and coupon.times_used < coupon.usage_limit:
                        coupon.status = 'Active'

                    coupon.save()

                receipt.status = 'VOIDED'
                receipt.void_reason = request.data.get('reason', "Voided via POS")
                receipt.voided_at = timezone.now()
                receipt.voided_by = request.user
                receipt.save()

                if receipt.payment_method == Receipt.PaymentMethod.CASH:
                    settings_obj, _ = StoreSettings.objects.get_or_create(id=1)
                    settings_obj.pos_cash_balance -= Decimal(str(receipt.total))
                    settings_obj.save(update_fields=['pos_cash_balance'])

                return Response({"status": "Receipt voided successfully", "receipt_id": receipt.id})

        except Exception as e:
            return Response({"error": str(e)}, status=500)


class GCashPaymentCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount')
        currency = (request.data.get('currency') or 'PHP').upper()
        description = request.data.get('description') or 'VenDish POS Order'
        order_payload = request.data.get('order_payload') or {}
        customer_id = request.data.get('customer_id')

        try:
            amount = int(amount)
            if amount < 2000:
                return Response({'error': 'Minimum GCash transaction amount is ₱20.00.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Amount must be a positive integer in centavos.'}, status=status.HTTP_400_BAD_REQUEST)

        customer = None
        if customer_id:
            customer = User.objects.filter(id=customer_id).first()

        reference = uuid.uuid4().hex[:20].upper()
        idempotency_key = uuid.uuid4().hex

        payment_txn = PaymentTransaction.objects.create(
            reference=reference,
            transaction_idempotency_key=idempotency_key,
            amount=amount,
            currency=currency,
            status=PaymentTransaction.Status.PENDING,
            order_payload=order_payload if isinstance(order_payload, dict) else {},
            customer=customer,
            cashier=request.user,
        )

        success_url = f"{settings.FRONTEND_URL.rstrip('/')}/gcash/success?ref={reference}"
        cancel_url = f"{settings.FRONTEND_URL.rstrip('/')}/gcash/cancel?ref={reference}"

        # === NEW QR PH PAYMENT INTENT WORKFLOW ===
        try:
            # 1. Create Payment Intent
            intent_payload = {
                'data': {
                    'attributes': {
                        'amount': amount,
                        'payment_method_allowed': ['qrph'],
                        'currency': currency,
                        'description': description[:255],
                        'metadata': {
                            'reference': reference,
                            'transaction_id': str(payment_txn.id),
                        }
                    }
                }
            }
            intent_res = requests.post(
                'https://api.paymongo.com/v1/payment_intents',
                headers=_paymongo_headers(idempotency_key=idempotency_key),
                json=intent_payload,
                timeout=30,
            )
            intent_data = intent_res.json().get('data', {})
            intent_id = intent_data.get('id')
            client_key = intent_data.get('attributes', {}).get('client_key')

            if not intent_id:
                raise ValueError("Failed to create Payment Intent")

            # 2. Create Payment Method (QR Ph)
            pm_payload = {'data': {'attributes': {'type': 'qrph'}}}
            pm_res = requests.post(
                'https://api.paymongo.com/v1/payment_methods',
                headers=_paymongo_headers(),
                json=pm_payload,
                timeout=30,
            )
            pm_id = pm_res.json().get('data', {}).get('id')

            # 3. Attach Payment Method to Intent
            attach_payload = {
                'data': {
                    'attributes': {
                        'payment_method': pm_id,
                        'client_key': client_key
                    }
                }
            }
            attach_res = requests.post(
                f'https://api.paymongo.com/v1/payment_intents/{intent_id}/attach',
                headers=_paymongo_headers(),
                json=attach_payload,
                timeout=30,
            )
            
            # Extract the Base64 Image string from the response
            attach_data = attach_res.json().get('data', {}).get('attributes', {})
            qr_image_url = attach_data.get('next_action', {}).get('code', {}).get('image_url', '')

        except Exception as exc:
            payment_txn.status = PaymentTransaction.Status.FAILED
            payment_txn.raw_provider_payload = {'error': str(exc)}
            payment_txn.save(update_fields=['status', 'raw_provider_payload', 'updated_at'])
            return Response({'error': 'Failed to connect to PayMongo QR.'}, status=status.HTTP_502_BAD_GATEWAY)

        # 4. Save the intent_id and the image string to your transaction record
        payment_txn.provider_checkout_id = intent_id
        payment_txn.checkout_url = qr_image_url  # Repurposed to hold the Base64 Image String
        payment_txn.save(update_fields=['provider_checkout_id', 'checkout_url', 'updated_at'])

        return Response({
            'transaction_id': payment_txn.id,
            'reference': payment_txn.reference,
            'status': payment_txn.status,
            'checkout_url': payment_txn.checkout_url, # Frontend will receive the image string here
        }, status=status.HTTP_201_CREATED)
    
    


class GCashPaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transaction_id):
        payment_txn = get_object_or_404(PaymentTransaction, id=transaction_id)

        if not (request.user.is_superuser or request.user.id == payment_txn.cashier_id):
            return Response({'error': 'Not allowed to view this transaction.'}, status=status.HTTP_403_FORBIDDEN)

        # Developer testing override
        if request.query_params.get('dev_override_paid') == 'true' and payment_txn.status == PaymentTransaction.Status.PENDING:
            payment_txn.status = PaymentTransaction.Status.PAID
            payment_txn.paid_at = timezone.now()
            payment_txn.save(update_fields=['status', 'paid_at'])

        if payment_txn.status == PaymentTransaction.Status.PENDING:
            payment_txn = _sync_transaction_from_paymongo(payment_txn)

        if payment_txn.status == PaymentTransaction.Status.PAID and not payment_txn.receipt_id:
            try:
                _finalize_receipt_from_paid_transaction(payment_txn)
                payment_txn.refresh_from_db()
            except Exception:
                pass

        return Response({
            'transaction_id': payment_txn.id,
            'reference': payment_txn.reference,
            'status': payment_txn.status,
            'checkout_url': payment_txn.checkout_url,
            'paid_at': payment_txn.paid_at,
            'receipt_id': payment_txn.receipt_id,
        })


class GCashAttachReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        transaction_id = request.data.get('transaction_id')
        receipt_id = request.data.get('receipt_id')

        if not transaction_id or not receipt_id:
            return Response({'error': 'transaction_id and receipt_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        payment_txn = get_object_or_404(PaymentTransaction, id=transaction_id)
        receipt = get_object_or_404(Receipt, id=receipt_id)

        if not (request.user.is_superuser or request.user.id == payment_txn.cashier_id):
            return Response({'error': 'Not allowed to update this transaction.'}, status=status.HTTP_403_FORBIDDEN)

        payment_txn.receipt = receipt
        payment_txn.save(update_fields=['receipt', 'updated_at'])

        if payment_txn.status == PaymentTransaction.Status.PAID:
            receipt.payment_method = Receipt.PaymentMethod.GCASH
            receipt.payment_status = Receipt.PaymentStatus.PAID
            
            # FIX 3: Don't overwrite if manual reference exists
            if not receipt.provider_reference:
                receipt.provider_reference = payment_txn.reference
                
            receipt.provider_payment_id = payment_txn.provider_payment_id
            if not receipt.paid_at:
                receipt.paid_at = payment_txn.paid_at or timezone.now()
            receipt.save(update_fields=['payment_method', 'payment_status', 'provider_reference', 'provider_payment_id', 'paid_at'])

        return Response({'status': 'ok'})


class GCashPaymentFinalizeByReferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        reference = request.data.get('reference')
        if not reference:
            return Response({'error': 'reference is required.'}, status=status.HTTP_400_BAD_REQUEST)

        payment_txn = PaymentTransaction.objects.filter(reference=reference).first()
        if not payment_txn:
            return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_superuser or request.user.id == payment_txn.cashier_id):
            return Response({'error': 'Not allowed to finalize this transaction.'}, status=status.HTTP_403_FORBIDDEN)

        if payment_txn.status == PaymentTransaction.Status.PENDING:
            payment_txn = _sync_transaction_from_paymongo(payment_txn)

        if payment_txn.status != PaymentTransaction.Status.PAID:
            return Response({'status': payment_txn.status, 'message': 'Payment is not marked as PAID yet.'})

        receipt = payment_txn.receipt
        if not receipt:
            try:
                receipt = _finalize_receipt_from_paid_transaction(payment_txn)
            except Exception as exc:
                return Response({'error': f'Failed to finalize paid transaction: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': payment_txn.status,
            'transaction_id': payment_txn.id,
            'reference': payment_txn.reference,
            'receipt_id': receipt.id if receipt else None,
        })


class GCashReferenceAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        raw_value = request.query_params.get('value', '')
        transaction_reference = (request.query_params.get('transaction_reference') or '').strip()

        normalized_value = _normalize_manual_reference(raw_value)
        if not normalized_value:
            return Response({'exists': False, 'normalized_value': normalized_value})

        receipts_qs = Receipt.objects.exclude(provider_reference__isnull=True).exclude(provider_reference='')

        if transaction_reference:
            current_txn = PaymentTransaction.objects.filter(reference=transaction_reference).first()
            if current_txn and current_txn.receipt_id:
                receipts_qs = receipts_qs.exclude(id=current_txn.receipt_id)

        for provider_reference in receipts_qs.values_list('provider_reference', flat=True).iterator():
            if _normalize_manual_reference(provider_reference) == normalized_value:
                return Response({
                    'exists': True,
                    'normalized_value': normalized_value,
                    'message': 'This GCash reference number was already used in a previous transaction.',
                })

        return Response({'exists': False, 'normalized_value': normalized_value})


class GCashReconciliationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        state = (request.query_params.get('state') or 'pending').lower()
        queryset = PaymentTransaction.objects.filter(cashier=request.user).order_by('-created_at')

        if state == 'pending':
            queryset = queryset.filter(status=PaymentTransaction.Status.PENDING)
        elif state == 'unreconciled_paid':
            queryset = queryset.filter(status=PaymentTransaction.Status.PAID, receipt__isnull=True)

        queryset = queryset[:50]

        data = [
            {
                'id': txn.id,
                'reference': txn.reference,
                'status': txn.status,
                'amount': txn.amount,
                'currency': txn.currency,
                'checkout_url': txn.checkout_url,
                'receipt_id': txn.receipt_id,
                'created_at': txn.created_at,
                'paid_at': txn.paid_at,
            }
            for txn in queryset
        ]

        return Response(data)


class GCashPaymentWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_body = request.body
        signature_header = request.headers.get('Paymongo-Signature') or request.headers.get('paymongo-signature')

        webhook_secret = getattr(settings, 'PAYMONGO_WEBHOOK_SECRET', '')
        if webhook_secret and not _verify_paymongo_signature(raw_body, signature_header):
            return Response({'error': 'Invalid webhook signature.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except Exception:
            return Response({'error': 'Invalid JSON payload.'}, status=status.HTTP_400_BAD_REQUEST)

        data = payload.get('data') or {}
        event_id = data.get('id')
        event_attributes = data.get('attributes') or {}
        event_type = (event_attributes.get('type') or '').lower()

        if event_type not in PAYMONGO_ALLOWED_EVENTS:
            return Response({'status': 'ignored_event'})

        signature_hash = hashlib.sha256(raw_body).hexdigest()
        replay_window = timezone.now() - timedelta(minutes=PAYMONGO_REPLAY_WINDOW_MINUTES)

        if PaymentWebhookEventLog.objects.filter(signature_hash=signature_hash, received_at__gte=replay_window).exists():
            return Response({'status': 'duplicate_replay'})

        if event_id and PaymentWebhookEventLog.objects.filter(event_id=event_id).exists():
            return Response({'status': 'duplicate_event'})

        webhook_log = None
        if event_id:
            try:
                webhook_log = PaymentWebhookEventLog.objects.create(
                    event_id=event_id,
                    event_type=event_type,
                    signature_hash=signature_hash,
                )
            except IntegrityError:
                return Response({'status': 'duplicate_event'})

        event_data = event_attributes.get('data') or {}
        event_data_attributes = event_data.get('attributes') or {}
        metadata = event_data_attributes.get('metadata') or {}

        reference = metadata.get('reference') or event_data_attributes.get('reference_number')
        provider_checkout_id = event_data.get('id')

        payment_txn = None
        if reference:
            payment_txn = PaymentTransaction.objects.filter(reference=reference).first()
        if not payment_txn and provider_checkout_id:
            payment_txn = PaymentTransaction.objects.filter(provider_checkout_id=provider_checkout_id).first()
        if not payment_txn:
            return Response({'status': 'ignored'})

        normalized_status = _normalize_payment_status(event_type=event_type, raw_status=event_data_attributes.get('status'))

        update_fields = ['raw_provider_payload', 'webhook_verified', 'updated_at']
        payment_txn.raw_provider_payload = payload if isinstance(payload, dict) else {}
        payment_txn.webhook_verified = True

        if provider_checkout_id:
            payment_txn.provider_checkout_id = provider_checkout_id
            update_fields.append('provider_checkout_id')
        if event_id:
            payment_txn.provider_event_id = event_id
            update_fields.append('provider_event_id')

        payments_list = event_data_attributes.get('payments')
        if isinstance(payments_list, list) and payments_list:
            first_payment = payments_list[0] or {}
            if isinstance(first_payment, dict):
                payment_txn.provider_payment_id = first_payment.get('id') or payment_txn.provider_payment_id
        if payment_txn.provider_payment_id:
            update_fields.append('provider_payment_id')

        if normalized_status:
            payment_txn.status = normalized_status
            update_fields.append('status')

        if normalized_status == PaymentTransaction.Status.PAID and not payment_txn.paid_at:
            payment_txn.paid_at = timezone.now()
            update_fields.append('paid_at')

        payment_txn.save(update_fields=list(set(update_fields)))
        _sync_receipt_with_payment(payment_txn)

        if payment_txn.status == PaymentTransaction.Status.PAID and not payment_txn.receipt_id:
            try:
                _finalize_receipt_from_paid_transaction(payment_txn)
            except Exception:
                pass

        if webhook_log:
            webhook_log.transaction = payment_txn
            webhook_log.processed = True
            webhook_log.save(update_fields=['transaction', 'processed'])

        return Response({'status': 'ok'})

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all().order_by('-id')
    serializer_class = CouponSerializer

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['code']

    @staticmethod
    def _is_truthy(value):
        return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}

    def _completed_orders_count_for_user(self, user):
        if not (user and user.is_authenticated):
            return 0
        return Receipt.objects.filter(
            customer=user,
            status__iexact=Receipt.Status.COMPLETED,
        ).count()

    def _eligible_active_filter(self, user, completed_orders=None):
        if completed_orders is None:
            completed_orders = self._completed_orders_count_for_user(user)

        return (
            Q(status='Active', target_audience=Coupon.TargetAudience.ALL_USERS)
            |
            Q(
                status='Active',
                target_audience=Coupon.TargetAudience.FREQUENT_CUSTOMERS,
                min_completed_orders__lte=completed_orders,
            )
        )

    def _lookup_coupon_by_claim_code(self, request, code_value):
        normalized_code = _normalize_coupon_code(code_value)
        if not normalized_code:
            return Response([], status=status.HTTP_200_OK)

        include_archived = self._is_truthy(request.query_params.get('include_archived'))
        raw_customer_id = request.query_params.get('customer_id')
        selected_customer_id = None

        if raw_customer_id not in [None, '']:
            try:
                selected_customer_id = int(raw_customer_id)
            except (TypeError, ValueError):
                return Response({'error': 'Invalid customer_id.'}, status=status.HTTP_400_BAD_REQUEST)

        claim = CouponClaim.objects.select_related('coupon', 'coupon__criteria').filter(code__iexact=normalized_code).first()
        if claim:
            coupon = claim.coupon
            if coupon.is_archived and not include_archived:
                return Response([], status=status.HTTP_200_OK)

            if selected_customer_id is not None and claim.user_id != selected_customer_id:
                return Response([], status=status.HTTP_200_OK)

            serializer = self.get_serializer(coupon, context={'request': request})
            payload = serializer.data
            payload['code'] = claim.code
            payload['is_used'] = bool(claim.is_redeemed)
            return Response([payload], status=status.HTTP_200_OK)

        legacy_coupon = Coupon.objects.filter(code__iexact=normalized_code).order_by('-id').first()
        if not legacy_coupon:
            return Response([], status=status.HTTP_200_OK)

        if legacy_coupon.is_archived and not include_archived:
            return Response([], status=status.HTTP_200_OK)

        if selected_customer_id is not None and not legacy_coupon.claimed_by.filter(id=selected_customer_id).exists():
            return Response([], status=status.HTTP_200_OK)

        serializer = self.get_serializer(legacy_coupon, context={'request': request})
        payload = serializer.data

        if selected_customer_id is not None:
            selected_claim = CouponClaim.objects.filter(coupon=legacy_coupon, user_id=selected_customer_id).first()
            if selected_claim:
                payload['code'] = selected_claim.code
                payload['is_used'] = bool(selected_claim.is_redeemed)

        return Response([payload], status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        lookup_code = request.query_params.get('code')
        user = request.user
        is_staff_user = bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))

        if lookup_code and is_staff_user:
            return self._lookup_coupon_by_claim_code(request, lookup_code)

        return super().list(request, *args, **kwargs)
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        elif self.action in ['claim', 'my_coupons']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user

        include_archived = self._is_truthy(self.request.query_params.get('include_archived'))
        archived_only = self._is_truthy(self.request.query_params.get('archived_only'))

        # Base query for public coupons (only globally visible audience)
        public_coupons = Coupon.objects.filter(
            status='Active',
            is_archived=False,
            target_audience=Coupon.TargetAudience.ALL_USERS,
        )

        if user.is_authenticated:
            # Allow STAFF (Cashiers/Admin) to optionally include archived coupons for management.
            if user.is_superuser or user.is_staff:
                staff_queryset = Coupon.objects.all().order_by('-id')

                if archived_only:
                    return staff_queryset.filter(is_archived=True)

                if include_archived:
                    return staff_queryset

                return staff_queryset.filter(is_archived=False)
            
            # For customers: show coupons they are eligible to claim + coupons they already own.
            completed_orders = self._completed_orders_count_for_user(user)
            eligible_active_filter = self._eligible_active_filter(user, completed_orders=completed_orders)

            return Coupon.objects.filter(
                eligible_active_filter |
                Q(claimed_by=user) |
                Q(claims__user=user)
            ).filter(is_archived=False).distinct().order_by('-id')
        
        return public_coupons.order_by('-id')
    
    def destroy(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Deleting coupons is disabled. Archive coupons instead.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=False, methods=['post', 'patch'], url_path='archive')
    def archive(self, request):
        coupon_ids = request.data.get('coupon_ids', [])

        if not isinstance(coupon_ids, list) or not coupon_ids:
            return Response(
                {'detail': 'Provide a non-empty coupon_ids array.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_ids = []
        for coupon_id in coupon_ids:
            try:
                normalized_ids.append(int(coupon_id))
            except (TypeError, ValueError):
                continue

        if not normalized_ids:
            return Response(
                {'detail': 'No valid coupon IDs were provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_count = Coupon.objects.filter(id__in=normalized_ids, is_archived=False).update(
            is_archived=True,
            archived_at=timezone.now(),
        )

        return Response(
            {'archived_count': updated_count},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post', 'patch'], url_path='unarchive')
    def unarchive(self, request):
        coupon_ids = request.data.get('coupon_ids', [])

        if not isinstance(coupon_ids, list) or not coupon_ids:
            return Response(
                {'detail': 'Provide a non-empty coupon_ids array.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_ids = []
        for coupon_id in coupon_ids:
            try:
                normalized_ids.append(int(coupon_id))
            except (TypeError, ValueError):
                continue

        if not normalized_ids:
            return Response(
                {'detail': 'No valid coupon IDs were provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_ids = list(
            Coupon.objects.filter(id__in=normalized_ids, is_archived=True).values_list('id', flat=True)
        )

        if not target_ids:
            return Response(
                {'unarchived_count': 0},
                status=status.HTTP_200_OK,
            )

        Coupon.objects.filter(id__in=target_ids).update(
            is_archived=False,
            archived_at=None,
        )

        return Response(
            {'unarchived_count': len(target_ids)},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='claim')
    def claim(self, request, pk=None):
        user = request.user

        try:
            with transaction.atomic():
                coupon = Coupon.objects.select_for_update().get(id=pk)

                if coupon.is_archived:
                    return Response({"error": "This coupon is archived."}, status=status.HTTP_400_BAD_REQUEST)

                if coupon.criteria and coupon.criteria.valid_to and coupon.criteria.valid_to < timezone.now():
                    return Response({"error": "This coupon has expired."}, status=status.HTTP_400_BAD_REQUEST)

                if coupon.status != 'Active':
                    return Response({"error": "This coupon is no longer active."}, status=status.HTTP_400_BAD_REQUEST)

                existing_claim = CouponClaim.objects.select_for_update().filter(coupon=coupon, user=user).first()
                if not existing_claim and coupon.claimed_by.filter(id=user.id).exists():
                    existing_claim = _get_or_create_personal_claim_code(coupon, user)

                if existing_claim:
                    serializer = self.get_serializer(coupon)
                    payload = serializer.data
                    payload['code'] = existing_claim.code
                    payload['is_used'] = bool(existing_claim.is_redeemed)
                    payload['message'] = "You already have this coupon in your wallet."
                    return Response(payload, status=status.HTTP_200_OK)

                if coupon.target_audience == Coupon.TargetAudience.FREQUENT_CUSTOMERS:
                    required_orders = max(int(coupon.min_completed_orders or 0), 1)
                    completed_orders = self._completed_orders_count_for_user(user)
                    if completed_orders < required_orders:
                        return Response(
                            {
                                "error": f"This coupon is only available to frequent customers with at least {required_orders} completed orders."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                # Defensive count: protect against stale counter drift by taking the higher value.
                current_claims = max(coupon.times_claimed, coupon.claimed_by.count())
                if coupon.claim_limit is not None and current_claims >= coupon.claim_limit:
                    return Response({"error": "This coupon is fully claimed (Sold Out in App)."}, status=status.HTTP_400_BAD_REQUEST)

                coupon.claimed_by.add(user)
                claim = _get_or_create_personal_claim_code(coupon, user)

                # Re-check after insertion to hard-stop over-claiming in edge/race cases.
                updated_claims = coupon.claimed_by.count()
                if coupon.claim_limit is not None and updated_claims > coupon.claim_limit:
                    coupon.claimed_by.remove(user)
                    CouponClaim.objects.filter(coupon=coupon, user=user).delete()
                    coupon.times_claimed = coupon.claimed_by.count()
                    coupon.save(update_fields=['times_claimed'])
                    return Response({"error": "This coupon is fully claimed (Sold Out in App)."}, status=status.HTTP_400_BAD_REQUEST)

                coupon.times_claimed = updated_claims
                coupon.save(update_fields=['times_claimed'])

            serializer = self.get_serializer(coupon)
            payload = serializer.data
            payload['code'] = claim.code
            payload['is_used'] = bool(claim.is_redeemed)
            return Response(payload, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='mine')
    def my_coupons(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        # Check if a COMPLETED receipt exists for this specific user & coupon
        my_coupons = Coupon.objects.filter(is_archived=False).filter(
            Q(claimed_by=user) | Q(claims__user=user)
        ).annotate(
            is_used_by_user=Exists(
                Receipt.objects.filter(
                    coupons=OuterRef('pk'),
                    customer=user,
                    status__iexact=Receipt.Status.COMPLETED,
                )
            )
        ).distinct().order_by('-created_at')
        
        serializer = self.get_serializer(my_coupons, many=True)
        data = serializer.data

        claim_map = {
            claim['coupon_id']: claim
            for claim in CouponClaim.objects.filter(
                user=user,
                coupon_id__in=[coupon.id for coupon in my_coupons],
            ).values('coupon_id', 'code', 'is_redeemed')
        }
        
        # Inject the 'is_used' boolean directly into the serialized data
        for index, coupon in enumerate(my_coupons):
            claim_info = claim_map.get(coupon.id)
            if claim_info:
                data[index]['code'] = claim_info.get('code') or data[index].get('code')
                data[index]['is_used'] = bool(claim_info.get('is_redeemed'))
            else:
                data[index]['is_used'] = coupon.is_used_by_user

        return Response(data)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data

        try:
            with transaction.atomic():
                # 1. Update Expiration in Criteria
                if 'valid_to' in data and instance.criteria:
                    val = data['valid_to']
                    if val in [None, '']:
                        instance.criteria.valid_to = None
                    else:
                        # Convert the string to a timezone-aware datetime object
                        parsed_date = parse_datetime(val)
                        if parsed_date:
                            if timezone.is_naive(parsed_date):
                                parsed_date = timezone.make_aware(parsed_date)
                            instance.criteria.valid_to = parsed_date
                            
                    instance.criteria.save()

                # 2. Update Coupon Limits
                if 'usage_limit' in data:
                    val = data['usage_limit']
                    instance.usage_limit = int(val) if val not in [None, ''] else None
                    
                if 'claim_limit' in data:
                    val = data['claim_limit']
                    instance.claim_limit = int(val) if val not in [None, ''] else None

                if 'target_audience' in data:
                    target_audience = str(data['target_audience']).strip()
                    valid_audiences = {choice for choice, _ in Coupon.TargetAudience.choices}
                    if target_audience not in valid_audiences:
                        raise ValueError('Invalid target_audience value.')
                    instance.target_audience = target_audience

                if 'min_completed_orders' in data:
                    val = data['min_completed_orders']
                    parsed_orders = int(val) if val not in [None, ''] else 0
                    if parsed_orders < 0:
                        raise ValueError('min_completed_orders cannot be negative.')
                    instance.min_completed_orders = parsed_orders

                if instance.target_audience != Coupon.TargetAudience.FREQUENT_CUSTOMERS:
                    instance.min_completed_orders = 0
                elif instance.min_completed_orders < 1:
                    instance.min_completed_orders = 1

                # 3. Recalculate Status manually
                is_expired = instance.criteria and instance.criteria.valid_to and instance.criteria.valid_to < timezone.now()
                is_sold_out = instance.usage_limit is not None and instance.times_used >= instance.usage_limit

                if is_expired:
                    instance.status = 'Expired'
                elif is_sold_out:
                    instance.status = 'Redeemed'
                else:
                    instance.status = 'Active'

                instance.save()
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class CouponCriteriaViewSet(viewsets.ModelViewSet):
    queryset = CouponCriteria.objects.all().order_by('-id')
    serializer_class = CouponCriteriaSerializer
    permission_classes = [IsAuthenticated] 

class DailySalesReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _parse_dt(raw_value):
        if not raw_value:
            return None

        parsed = parse_datetime(raw_value)
        if not parsed:
            return None

        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed)
        return parsed

    def _get_selected_range(self, request):
        range_start = self._parse_dt(request.query_params.get('start'))
        range_end = self._parse_dt(request.query_params.get('end'))

        if range_start and range_end and range_start > range_end:
            range_start, range_end = range_end, range_start

        return range_start, range_end

    def list(self, request):
        queryset = Receipt.objects.filter(status='COMPLETED')
        user = request.user
        
        cashier_filter = request.query_params.get('cashier', None)
        period = (request.query_params.get('period') or 'daily').strip().lower()
        range_start, range_end = self._get_selected_range(request)

        trunc_by_period = {
            'custom': TruncDay,
            'daily': TruncDay,
            'weekly': TruncWeek,
            'monthly': TruncMonth,
            'yearly': TruncYear,
        }
        trunc_func = trunc_by_period.get(period, TruncDay)

        def _bucket_key(value):
            if value is None:
                return ""
            if hasattr(value, 'isoformat'):
                return value.isoformat()
            return str(value)

        if not user.is_superuser:
            queryset = queryset.filter(cashier=user)
        elif cashier_filter: 
            queryset = queryset.filter(cashier__username=cashier_filter)

        if range_start:
            queryset = queryset.filter(created_at__gte=range_start)
        if range_end:
            queryset = queryset.filter(created_at__lte=range_end)
        
        report_data = (
            queryset
            .annotate(report_bucket=trunc_func('created_at'))
            .values('report_bucket')
            .annotate(
                total_revenue=Sum('total'),
                total_orders=Count('id'),
                total_vat=Sum('vat'),
                total_discount=Sum(F('subtotal') - F('total')),
            )
            .order_by('-report_bucket')
        )

        void_queryset = Receipt.objects.filter(status='VOIDED')
        if not user.is_superuser:
            void_queryset = void_queryset.filter(cashier=user)
        elif cashier_filter:
            void_queryset = void_queryset.filter(cashier__username=cashier_filter)

        if range_start:
            void_queryset = void_queryset.filter(created_at__gte=range_start)
        if range_end:
            void_queryset = void_queryset.filter(created_at__lte=range_end)
            
        void_data = (
            void_queryset
            .annotate(report_bucket=trunc_func('created_at'))
            .values('report_bucket')
            .annotate(voided_orders=Count('id'))
        )
        void_map = {_bucket_key(item['report_bucket']): item['voided_orders'] for item in void_data}

        top_seller_map = {}
        least_seller_map = {}
        least_qty_map = {}
        product_sales_map = {}
        product_revenue_map = {}
        product_order_count_map = {}
        receipt_ids = queryset.values_list('id', flat=True)
        if receipt_ids:
            revenue_expression = _receipt_item_revenue_expression()
            item_stats = (
                ReceiptItem.objects.filter(
                    receipt__in=receipt_ids,
                    product__isnull=False,
                    product__is_archived=False,
                )
                .exclude(_build_best_seller_category_exclusion_q('product__category__name'))
                .annotate(report_bucket=trunc_func('receipt__created_at'))
                .values('report_bucket', 'product_name')
                .annotate(
                    qty_sold=Sum('quantity'),
                    total_revenue=Sum(revenue_expression),
                    total_orders=Count('receipt', distinct=True),
                )
                .order_by('report_bucket', '-total_revenue', '-total_orders', '-qty_sold', 'product_name')
            )
            for stat in item_stats:
                date_str = _bucket_key(stat['report_bucket'])
                product_name = (stat['product_name'] or '').strip()
                qty_sold = stat['qty_sold'] or 0
                total_revenue = float(stat['total_revenue'] or 0)
                total_orders = int(stat['total_orders'] or 0)

                if not product_name:
                    continue

                if date_str not in product_sales_map:
                    product_sales_map[date_str] = {}
                product_sales_map[date_str][product_name] = qty_sold

                if date_str not in product_revenue_map:
                    product_revenue_map[date_str] = {}
                product_revenue_map[date_str][product_name] = total_revenue

                if date_str not in product_order_count_map:
                    product_order_count_map[date_str] = {}
                product_order_count_map[date_str][product_name] = total_orders

                if date_str not in top_seller_map:
                    top_seller_map[date_str] = product_name
                if date_str not in least_seller_map or qty_sold < least_qty_map[date_str]:
                    least_seller_map[date_str] = product_name
                    least_qty_map[date_str] = qty_sold
                elif qty_sold == least_qty_map[date_str]:
                    current_name = (least_seller_map.get(date_str) or "").lower()
                    candidate_name = product_name.lower()
                    if not current_name or candidate_name < current_name:
                        least_seller_map[date_str] = product_name

        final_response = []
        for item in report_data:
            date_str = _bucket_key(item['report_bucket'])
            total_rev = item['total_revenue'] or 0
            
            final_response.append({
                "report_date": date_str,
                "total_revenue": total_rev,
                "net_profit": total_rev,
                "total_cost": 0,
                "total_orders": item['total_orders'],
                "total_vat": item['total_vat'] or 0,
                "total_discount": item['total_discount'] or 0,
                "voided_orders": void_map.get(date_str, 0),
                "top_selling_product": top_seller_map.get(date_str, "N/A"),
                "least_selling_product": least_seller_map.get(date_str, "N/A"),
                "daily_product_sales": product_sales_map.get(date_str, {}),
                "daily_product_sales_revenue": product_revenue_map.get(date_str, {}),
                "daily_product_order_counts": product_order_count_map.get(date_str, {}),
            })

        return Response(final_response)

    @action(detail=False, methods=['get'], url_path='by-staff')
    def by_staff(self, request):
        if not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=403)

        range_start, range_end = self._get_selected_range(request)
        cashier_filter = (request.query_params.get('cashier') or '').strip()

        queryset = Receipt.objects.filter(status='COMPLETED')
        if range_start:
            queryset = queryset.filter(created_at__gte=range_start)
        if range_end:
            queryset = queryset.filter(created_at__lte=range_end)
        if cashier_filter and cashier_filter.upper() != 'ALL':
            queryset = queryset.filter(cashier__username=cashier_filter)

        staff_data = (
            queryset
            .values('cashier__username', 'cashier__first_name', 'cashier__last_name')
            .annotate(
                total_revenue=Sum('total'),
                total_orders=Count('id')
            )
            .order_by('-total_revenue', '-total_orders', 'cashier__first_name', 'cashier__last_name', 'cashier__username')
        )

        response_data = []
        for item in staff_data:
            username = item['cashier__username'] or "Unassigned"
            first = item['cashier__first_name']
            last = item['cashier__last_name']
            display_name = f"{first} {last}".strip() if (first or last) else username

            response_data.append({
                "name": display_name,
                "revenue": item['total_revenue'] or 0,
                "orders": item['total_orders']
            })

        serializer = StaffPerformanceSerializer(response_data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='refresh-today')
    def refresh_today(self, request):
        return Response({"message": "Data synchronized"}, status=200)


class ProfitLogViewSet(viewsets.ModelViewSet):
    serializer_class = ProfitLogSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        queryset = ProfitLog.objects.select_related('created_by').all().order_by('-created_at')

        period_filter = (self.request.query_params.get('period') or '').strip().upper()
        valid_periods = {choice for choice, _ in ProfitLog.Period.choices}
        if period_filter in valid_periods:
            queryset = queryset.filter(period=period_filter)

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DrawerBalanceLogViewSet(viewsets.ModelViewSet):
    serializer_class = DrawerBalanceLogSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return DrawerBalanceLog.objects.select_related('created_by', 'cashier').all().order_by('-created_at')

    def perform_create(self, serializer):
        # Keep out-drawer logging and drawer reset in one transaction to avoid partial updates.
        with transaction.atomic():
            serializer.save(created_by=self.request.user)

            settings_obj, _ = StoreSettings.objects.select_for_update().get_or_create(id=1)
            settings_obj.pos_initial_balance = 0
            settings_obj.pos_cash_balance = 0
            settings_obj.save(update_fields=['pos_initial_balance', 'pos_cash_balance'])

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().order_by('-created_at')
    serializer_class = ReviewSerializer

    def _can_modify_review(self, user, review_obj):
        return bool(user and user.is_authenticated and (
            user.is_superuser or user.is_staff or review_obj.user_id == user.id
        ))
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        elif self.action in ['reply']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Review.objects.all().order_by('-created_at')
        review_type = self.request.query_params.get('type')
        if review_type:
            queryset = queryset.filter(review_type=review_type)
        return queryset

    def create(self, request, *args, **kwargs):
        user = request.user

        # VERIFIED TRANSACTION CHECK
        has_completed_transaction = Receipt.objects.filter(customer=user, status=Receipt.Status.COMPLETED).exists()
        if not has_completed_transaction:
            return Response(
                {"error": "You must have at least one successfully completed transaction at our physical POS before you can write a review. Please provide your registered account details to the cashier on your next visit!"},
                status=status.HTTP_403_FORBIDDEN
            )

        review_type = request.data.get('review_type', 'shop')

        if review_type == 'food':
            product_id = request.data.get('product')
            if not product_id:
                return Response({"error": "Product ID is required for food reviews."}, status=status.HTTP_400_BAD_REQUEST)
            
            # NOTE: If you want to restrict product-specific reviews so the user must have purchased this exact product:
            has_bought_product = Receipt.objects.filter(customer=user, status=Receipt.Status.COMPLETED, items__product_id=product_id).exists()
            if not has_bought_product: return Response({"error": "You haven't bought this product."}, status=403)
            
            # RULE 1: User can only write a review once per food ever
            if Review.objects.filter(user=user, review_type='food', product_id=product_id).exists():
                return Response({"error": "You have already reviewed this food item."}, status=status.HTTP_400_BAD_REQUEST)

        elif review_type == 'shop':
            # RULE 2: User can only write a shop review once per day
            today = timezone.now().date()
            if Review.objects.filter(user=user, review_type='shop', created_at__date=today).exists():
                return Response({"error": "You can only submit one shop review per day."}, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        review_obj = self.get_object()
        if not self._can_modify_review(request.user, review_obj):
            return Response({'error': 'You can only edit your own review.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        review_obj = self.get_object()
        if not self._can_modify_review(request.user, review_obj):
            return Response({'error': 'You can only edit your own review.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['post', 'patch'], url_path='reply')
    def reply(self, request, *args, **kwargs):
        review_obj = self.get_object()
        reply_text = str(request.data.get('admin_reply', '')).strip()

        if not reply_text:
            return Response(
                {'error': 'Reply message is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        review_obj.admin_reply = reply_text
        review_obj.admin_reply_updated_at = timezone.now()
        review_obj.save(update_fields=['admin_reply', 'admin_reply_updated_at'])

        serializer = self.get_serializer(review_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        review_obj = self.get_object()
        if not self._can_modify_review(request.user, review_obj):
            return Response({'error': 'You can only delete your own review.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Automatically attach the authenticated user to the review
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        # Keep ownership/type linkage immutable when editing a review.
        instance = serializer.instance
        serializer.save(
            user=instance.user,
            review_type=instance.review_type,
            product=instance.product,
        )

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Fetch only notifications belonging to the logged-in user
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({"status": "ok"})

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({"status": "ok"})

class HomePageViewSet(viewsets.ModelViewSet):
    queryset = HomePage.objects.all()
    serializer_class = HomePageSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

class ServicesPageViewSet(viewsets.ModelViewSet):
    queryset = ServicesPage.objects.all()
    serializer_class = ServicesPageSerializer
    permission_classes = [AllowAny]
    
    def list(self, request, *args, **kwargs):
        latest = ServicesPage.objects.last()
        if not latest: return Response({})
        return Response(self.get_serializer(latest).data)

class AboutPageViewSet(viewsets.ModelViewSet):
    queryset = AboutPage.objects.all()
    serializer_class = AboutPageSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

class ContactPageViewSet(viewsets.ModelViewSet):
    queryset = ContactPage.objects.all()
    serializer_class = ContactPageSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def list(self, request, *args, **kwargs):
        latest = ContactPage.objects.order_by('-id').first()
        if not latest:
            return Response([], status=200)
        serializer = self.get_serializer(latest)
        return Response(serializer.data)

OTP_EXPIRY_MINUTES = 15
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 5
    
class OTPViewSet(viewsets.ModelViewSet):
    queryset = OTP.objects.all()
    serializer_class = OTPSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # Prevent stale JWTs from causing 401 on this public endpoint

    def create(self, request):
        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response({'type': 'error', 'label': 'No Email', 'details': 'Please provide an email address.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a proper 6-digit OTP (100000–999999)
        random_otp = random.randint(100000, 999999)

        user = User.objects.filter(email__iexact=email).first()
        
        if user:
            otp_expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

            # Update or create the OTP record
            otp_record, created = OTP.objects.update_or_create(
                user=user,
                defaults={
                    'otp': random_otp,
                    'is_valid': True,
                    'expires_at': otp_expires_at,
                }
            )

            # Send the OTP via email (Brevo / Anymail)
            try:
                send_mail(
                    subject='Your Password Reset OTP – Kuya Vince Karinderya',
                    message=(
                        f'Hi {user.first_name or user.username},\n\n'
                        f'Your one-time password (OTP) is: {random_otp}\n\n'
                        f'This code will expire in {OTP_EXPIRY_MINUTES} minutes.\n'
                        f'If you did not request this, please ignore this email.\n\n'
                        f'– Kuya Vince Karinderya'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                # Log the error but don't expose it to the client
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f'Failed to send OTP email to {email}: {e}')
                return Response({
                    'type': 'error',
                    'label': 'Email Failed',
                    'details': 'We could not send the OTP email. Please try again later.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Always return success to prevent email enumeration
        return Response({
            'type': 'success',
            'label': 'OTP Sent!',
            'details': f'If an account with that email exists, an OTP has been sent. It expires in {OTP_EXPIRY_MINUTES} minutes.'
        }, status=status.HTTP_200_OK)


class VerifyOTPViewSet(viewsets.ModelViewSet):
    queryset = OTP.objects.all()
    serializer_class = OTPSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # Prevent stale JWTs from causing 401 on this public endpoint

    def create(self, request):
        received_otp = str(request.data.get('otp', '')).strip()
        email = request.data.get('email', '').strip().lower()

        if not received_otp or not email:
            return Response({'type': 'error', 'label': 'Missing Data', 'details': 'Both OTP and email are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not received_otp.isdigit() or len(received_otp) != 6:
            return Response(
                {
                    'type': 'error',
                    'label': 'Invalid OTP Format',
                    'details': 'OTP must be a 6-digit number.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            otp = OTP.objects.get(otp=int(received_otp), user__email__iexact=email)
            user = User.objects.filter(email__iexact=email).first()

            if not otp.is_valid:
                return Response({'type': 'error', 'label': 'Invalid OTP', 'details': 'The OTP you have sent is no longer valid. Please request another OTP'}, status=status.HTTP_400_BAD_REQUEST)

            if otp.expires_at <= timezone.now():
                # Expired OTPs are immediately invalidated to prevent repeated attempts.
                otp.is_valid = False
                otp.save(update_fields=['is_valid'])
                return Response({'type': 'error', 'label': 'Expired OTP', 'details': 'The OTP you have sent has expired. Please request another OTP'}, status=status.HTTP_400_BAD_REQUEST)
            
            otp.is_valid = False
            otp.save(update_fields=['is_valid'])

            token = secrets.token_urlsafe(32)

            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=timezone.now() + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRY_MINUTES)
            )

            return Response(
                {
                    'type': 'success',
                    'label': 'OTP has been verified',
                    'details': f'Your OTP has now been verified. Please change your password within {PASSWORD_RESET_TOKEN_EXPIRY_MINUTES} minutes.',
                    'token': token,
                },
                status=status.HTTP_200_OK,
            )

        except OTP.DoesNotExist:
            return Response({'type': 'error', 'label': 'Invalid OTP', 'details': 'The OTP you have sent is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        


class ChangePasswordViaToken(viewsets.ModelViewSet):
    queryset = PasswordResetToken.objects.all()
    permission_classes = [AllowAny]
    authentication_classes = []  # Prevent stale JWTs from causing 401 on this public endpoint

    def create(self, request):
        received_token = request.data.get('token')
        password = request.data.get('password')
        email = request.data.get('email')

        if not received_token or not password or not email:
            return Response({'type': 'error', 'label': 'Missing Data', 'details': 'Token, email, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = PasswordResetToken.objects.get(token=received_token)

            if token.used:
                return Response(
                    {
                        'type': 'error',
                        'label': 'Used Token',
                        'details': 'This password reset token has already been used. Please restart the forgot password flow.',
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if token.expires_at <= timezone.now():
                return Response({'type': 'error', 'label': 'Expired Token', 'details': 'Your token has expired. Please redo the process carefully.'}, status=status.HTTP_400_BAD_REQUEST)

            user = User.objects.filter(email__iexact=email).first()

            if token.user != user:
                return Response({'type': 'error', 'label': 'Token Mismatch', 'details': 'This token does not belong to the specified user.'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(password)
            user.save()

            token.used = True
            token.save(update_fields=['used'])

            return Response({'type': 'success', 'label': 'Password Changed', 'details': 'Your password has been changed successfully. '}, status=status.HTTP_200_OK)
            
        except PasswordResetToken.DoesNotExist:
            return Response({'type': 'error', 'label': 'Missing Token.', 'details': 'You have missing token. Please redo the process carefully'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'type': 'error', 'label': 'Invalid User', 'details': 'Your credentials does not exist in the system.'}, status=status.HTTP_400_BAD_REQUEST)
        


class UpdateVoidPinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Optional: Ensure only superusers/admins can change the global PIN
        if not request.user.is_superuser:
            return Response({"error": "Only administrators can change the Void PIN."}, status=status.HTTP_403_FORBIDDEN)

        
        new_pin = request.data.get('new_pin')

        if not new_pin or len(str(new_pin)) < 4:
            return Response({"error": "New PIN must be at least 4 digits."}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create the single global settings row (id=1)
        settings, _ = StoreSettings.objects.get_or_create(id=1)

        # Hash the new PIN and save it globally
        settings.void_pin = make_password(str(new_pin))
        settings.save()

        return Response({"message": "Global Void PIN updated successfully."}, status=status.HTTP_200_OK)


class VerifyVoidPinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pin = request.data.get('pin')
        if not pin:
            return Response({"error": "PIN is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Grab the single global settings row
        settings = StoreSettings.objects.filter(id=1).first()

        # If a custom global PIN has been set, check against it
        if settings and settings.void_pin:
            if check_password(str(pin), settings.void_pin):
                return Response({"message": "PIN verified"}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Invalid Manager PIN"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Fallback to 1234 ONLY if the admin has never set a custom PIN
            if str(pin) == "1234":
                return Response({"message": "Default PIN verified"}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Invalid Manager PIN"}, status=status.HTTP_400_BAD_REQUEST)

from decimal import Decimal

TIN_NUMBER_REGEX = re.compile(r'^\d{3}-\d{3}-\d{3}-\d{3}$')
RECEIPT_PHONE_REGEX = re.compile(r'^\+?[0-9][0-9\s\-()]{5,24}$')


def _coerce_boolean_setting(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {'1', 'true', 'yes', 'on'}:
            return True
        if normalized in {'0', 'false', 'no', 'off'}:
            return False
    raise ValueError('Expected a boolean value.')


class StoreStatusView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        settings, _ = StoreSettings.objects.get_or_create(id=1)
        return Response({
            "store_is_open": settings.store_is_open,
        }, status=status.HTTP_200_OK)
            
class StoreSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings, _ = StoreSettings.objects.get_or_create(id=1)
        return Response({
            "store_is_open": settings.store_is_open,
            "max_coupons_per_order": settings.max_coupons_per_order,
            "pos_initial_balance": settings.pos_initial_balance,
            "pos_cash_balance": settings.pos_cash_balance, # [NEW] Return balance
            "tin_number": settings.tin_number,
            "receipt_phone": settings.receipt_phone,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        # Only admins can update the settings
        if not request.user.is_superuser:
            return Response({"error": "Only administrators can change store settings."}, status=status.HTTP_403_FORBIDDEN)

        settings, _ = StoreSettings.objects.get_or_create(id=1)

        store_is_open = request.data.get('store_is_open')
        if store_is_open is not None:
            try:
                settings.store_is_open = _coerce_boolean_setting(store_is_open)
            except ValueError:
                return Response(
                    {
                        "error": "store_is_open must be a valid boolean value.",
                        "field_errors": {
                            "store_is_open": "Use true/false, yes/no, on/off, or 1/0.",
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        max_coupons = request.data.get('max_coupons_per_order')
        if max_coupons is not None:
            settings.max_coupons_per_order = int(max_coupons)
            
        # [NEW] Handle Initial Balance setting
        pos_initial_balance = request.data.get('pos_initial_balance')
        if pos_initial_balance is not None:
            settings.pos_initial_balance = Decimal(str(pos_initial_balance))

        pos_cash_balance = request.data.get('pos_cash_balance')
        if pos_cash_balance is not None:
            settings.pos_cash_balance = Decimal(str(pos_cash_balance))

        tin_number = request.data.get('tin_number')
        if tin_number is not None:
            normalized_tin = str(tin_number).strip()
            if not TIN_NUMBER_REGEX.fullmatch(normalized_tin):
                return Response(
                    {
                        "error": "TIN number must follow the format 000-000-000-000.",
                        "field_errors": {
                            "tin_number": "TIN must contain 12 digits formatted as 000-000-000-000.",
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            settings.tin_number = normalized_tin

        receipt_phone = request.data.get('receipt_phone')
        if receipt_phone is not None:
            normalized_phone = str(receipt_phone).strip()
            if not normalized_phone:
                return Response(
                    {
                        "error": "Receipt phone number must not be blank.",
                        "field_errors": {
                            "receipt_phone": "Receipt phone number is required.",
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not RECEIPT_PHONE_REGEX.fullmatch(normalized_phone):
                return Response(
                    {
                        "error": "Receipt phone must use a valid phone format.",
                        "field_errors": {
                            "receipt_phone": "Use digits, spaces, +, -, and parentheses only.",
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            settings.receipt_phone = normalized_phone

        settings.save()

        return Response({
            "message": "Settings updated successfully.",
            "store_is_open": settings.store_is_open,
            "max_coupons_per_order": settings.max_coupons_per_order,
            "pos_initial_balance": settings.pos_initial_balance,
            "pos_cash_balance": settings.pos_cash_balance, # [NEW] Return updated balance
            "tin_number": settings.tin_number,
            "receipt_phone": settings.receipt_phone,
        }, status=status.HTTP_200_OK)
