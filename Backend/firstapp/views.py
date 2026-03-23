from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.conf import settings
from django.db.models import F
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import timedelta
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from django.utils.dateparse import parse_datetime

from django.db.models import Sum, Count, Q, Exists, OuterRef

from django.contrib.auth.hashers import make_password, check_password
import base64
import hashlib
import hmac
import json
import requests
import uuid

import secrets

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.permissions import AllowAny

from .serializers import (
    UserSerializer, FeedbackSerializer, ProductSerializer, CategorySerializer, ReceiptSerializer, CouponSerializer, HomePageSerializer, ServicesPageSerializer, AboutPageSerializer, ContactPageSerializer, CouponCriteriaSerializer, StaffPerformanceSerializer, ReviewSerializer, OTPSerializer
)   
from .models import Product, Category, Receipt, Coupon, Feedback, HomePage, ServicesPage, AboutPage, ContactPage, CouponCriteria, ReceiptItem, Review, OTP, PasswordResetToken, StoreSettings, StaffInvitationToken, PaymentTransaction, PaymentWebhookEventLog
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


def _process_coupon_usage(receipt, target_customer):
    for coupon_ref in receipt.coupons.all():
        coupon = Coupon.objects.select_for_update().get(id=coupon_ref.id)

        if coupon.criteria and coupon.criteria.valid_to and coupon.criteria.valid_to < timezone.now():
            raise Exception(f"Coupon {coupon.code} has expired.")

        if coupon.criteria and coupon.criteria.min_spend > 0:
            if receipt.subtotal < coupon.criteria.min_spend:
                raise Exception(f"Coupon {coupon.code} requires a minimum spend of ₱{coupon.criteria.min_spend}.")

        if not target_customer:
            raise Exception("Coupons are tied to user accounts. Please select a customer first.")

        has_claim = coupon.claimed_by.filter(id=target_customer.id).exists()
        if not has_claim:
            raise Exception(f"Coupon {coupon.code} is not claimed by user {target_customer.username}.")

        already_used = Receipt.objects.filter(
            coupons=coupon,
            customer=target_customer,
            status='COMPLETED'
        ).exclude(id=receipt.id).exists()

        if already_used:
            raise Exception(f"User {target_customer.username} has already used coupon {coupon.code}.")

        if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
            raise Exception(f"Coupon {coupon.code} is sold out.")

        coupon.times_used += 1
        if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
            coupon.status = 'Redeemed'
        coupon.save()


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
        receipt.provider_reference = payment_txn.reference
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
        response = requests.get(
            f"https://api.paymongo.com/v1/checkout_sessions/{payment_txn.provider_checkout_id}",
            headers=_paymongo_headers(),
            timeout=20,
        )
        if response.status_code >= 400:
            return payment_txn

        response_data = response.json()
        checkout_data = response_data.get('data') or {}
        checkout_attributes = checkout_data.get('attributes') or {}
        checkout_status = checkout_attributes.get('status') or ''

        payments_list = checkout_attributes.get('payments')
        payment_status = ''
        if isinstance(payments_list, list) and payments_list:
            first_payment = payments_list[0] or {}
            if isinstance(first_payment, dict):
                payment_txn.provider_payment_id = first_payment.get('id') or payment_txn.provider_payment_id
                payment_status = first_payment.get('attributes', {}).get('status') or ''
                
        payment_intent = checkout_attributes.get('payment_intent') or {}
        if isinstance(payment_intent, dict):
            intent_status = payment_intent.get('attributes', {}).get('status') or ''
            if intent_status in ['succeeded', 'paid']:
                payment_status = intent_status

        final_status_to_check = payment_status if payment_status in ['succeeded', 'paid'] else checkout_status
        normalized = _normalize_payment_status(raw_status=final_status_to_check)
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


# -------------------------------
# USER CRUD
# -------------------------------

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # Public endpoint — skip JWT validation

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
            StaffInvitationToken.objects.create(user=user, token=token_str)

            # Define your frontend URL (Update this in production)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ven-dish-food-business-sales-optimz.vercel.app')
            
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
                        f"If you did not expect this, please ignore this email."
                    ),
                    html_message=(
                        f"<div style='font-family: sans-serif;'>"
                        f"<h3>Hi {user.first_name or user.username},</h3>"
                        f"<p>You have been invited to join Kuya Vince Karinderya as a staff member.</p>"
                        f"<p><a href='{accept_link}' style='padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; display: inline-block;'>Accept Invitation</a></p>"
                        f"<p><a href='{reject_link}' style='padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; display: inline-block;'>Reject Invitation</a></p>"
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
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # This calls UserSerializer.create(), which saves all fields in 'validated_data'
            user = serializer.save() 
            return Response({
                "user": serializer.data,
                "message": "User created successfully"
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='claimed-coupons')
    def claimed_coupons(self, request, pk=None):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({"error": "Only staff can access customer coupon wallets."}, status=status.HTTP_403_FORBIDDEN)

        customer = get_object_or_404(User, id=pk)

        claimed_coupons = Coupon.objects.filter(claimed_by=customer).annotate(
            is_used_by_user=Exists(
                Receipt.objects.filter(
                    coupons=OuterRef('pk'),
                    customer=customer,
                    status='COMPLETED'
                )
            )
        ).order_by('-created_at')

        serializer = CouponSerializer(claimed_coupons, many=True, context={'request': request})
        data = serializer.data

        for index, coupon in enumerate(claimed_coupons):
            data[index]['is_used'] = coupon.is_used_by_user

        return Response(data, status=status.HTTP_200_OK)

    # [NEW] 2. NEW ACTION TO HANDLE THE VERIFICATION FROM EMAIL
    @action(detail=False, methods=['get', 'post'], permission_classes=[AllowAny], url_path='verify-invite')
    def verify_invite(self, request):
        payload = request.data if request.method == 'POST' else request.query_params
        token = payload.get('token')
        action_type = (payload.get('action') or '').lower()  # 'accept' or 'reject'

        if not token or action_type not in ['accept', 'reject']:
            return Response({"error": "Valid token and action ('accept' or 'reject') are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invite_token = StaffInvitationToken.objects.get(token=token, is_valid=True)
            user = invite_token.user

            if action_type == 'accept':
                user.is_active = True
                user.save()
                invite_token.is_valid = False
                invite_token.save()
                return Response({"message": "Account activated successfully. You can now log in."}, status=status.HTTP_200_OK)
            
            elif action_type == 'reject':
                # If they reject, we delete the pending account entirely to keep the DB clean
                user.delete() 
                return Response({"message": "Invitation rejected. The pending account has been removed."}, status=status.HTTP_200_OK)

        except StaffInvitationToken.DoesNotExist:
            return Response({"error": "Invalid or expired invitation token."}, status=status.HTTP_400_BAD_REQUEST)

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

        if platform == "web" and user.is_staff and not user.is_active:
            raise AuthenticationFailed("This staff account is blocked from web login")

        if platform == "app" and not user.is_staff and not user.is_active:
            raise AuthenticationFailed("This user account is blocked from app login")

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

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]
    
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

    # ---------------------------------------------------------
    # 1. CREATE RECEIPT (Checkout)
    # ---------------------------------------------------------
    def create(self, request, *args, **kwargs):
        settings, _ = StoreSettings.objects.get_or_create(id=1)
        max_allowed_coupons = settings.max_coupons_per_order

        coupons_data = request.data.get('coupons', [])
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

                    if receipt.payment_method == Receipt.PaymentMethod.CASH and not receipt.paid_at:
                        receipt.paid_at = timezone.now()
                        receipt.payment_status = Receipt.PaymentStatus.PAID
                        receipt.save(update_fields=['paid_at', 'payment_status'])

                    if target_customer:
                        _process_coupon_usage(receipt, target_customer)

                    return Response(
                        {"receipt_id": receipt.id, **serializer.data},
                        status=status.HTTP_201_CREATED
                    )

            except Exception as e:
                return Response({"error": f"Transaction failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
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

                    if coupon.usage_limit is not None and coupon.times_used < coupon.usage_limit:
                        coupon.status = 'Active'

                    coupon.save()

                receipt.status = 'VOIDED'
                receipt.void_reason = request.data.get('reason', "Voided via POS")
                receipt.voided_at = timezone.now()
                receipt.voided_by = request.user
                receipt.save()

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
            if amount <= 0:
                raise ValueError
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

        paymongo_payload = {
            'data': {
                'attributes': {
                    'line_items': [
                        {
                            'currency': currency,
                            'amount': amount,
                            'name': description[:120],
                            'quantity': 1,
                        }
                    ],
                    'payment_method_types': ['gcash'],
                    'description': description[:255],
                    'reference_number': reference,
                    'show_line_items': True,
                    'show_description': True,
                    'success_url': success_url,
                    'cancel_url': cancel_url,
                    'metadata': {
                        'reference': reference,
                        'transaction_id': str(payment_txn.id),
                    },
                }
            }
        }

        try:
            response = requests.post(
                'https://api.paymongo.com/v1/checkout_sessions',
                headers=_paymongo_headers(idempotency_key=idempotency_key),
                json=paymongo_payload,
                timeout=30,
            )
            response_data = response.json()
        except Exception as exc:
            payment_txn.status = PaymentTransaction.Status.FAILED
            payment_txn.raw_provider_payload = {'error': str(exc)}
            payment_txn.save(update_fields=['status', 'raw_provider_payload', 'updated_at'])
            return Response({'error': 'Failed to connect to PayMongo.'}, status=status.HTTP_502_BAD_GATEWAY)

        if response.status_code >= 400:
            payment_txn.status = PaymentTransaction.Status.FAILED
            payment_txn.raw_provider_payload = response_data if isinstance(response_data, dict) else {'raw': str(response_data)}
            payment_txn.save(update_fields=['status', 'raw_provider_payload', 'updated_at'])
            return Response({'error': 'PayMongo rejected checkout creation.', 'details': response_data}, status=status.HTTP_400_BAD_REQUEST)

        checkout_data = response_data.get('data', {})
        checkout_attributes = checkout_data.get('attributes', {})
        checkout_url = checkout_attributes.get('checkout_url')

        payment_txn.provider_checkout_id = checkout_data.get('id')
        payment_txn.checkout_url = checkout_url
        payment_txn.raw_provider_payload = response_data if isinstance(response_data, dict) else {}
        payment_txn.save(update_fields=['provider_checkout_id', 'checkout_url', 'raw_provider_payload', 'updated_at'])

        return Response({
            'transaction_id': payment_txn.id,
            'reference': payment_txn.reference,
            'status': payment_txn.status,
            'checkout_url': payment_txn.checkout_url,
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
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        
        # Base query for public coupons
        public_coupons = Coupon.objects.filter(status='Active')

        if user.is_authenticated:
            # FIX: Allow STAFF (Cashiers) to see ALL coupons
            if user.is_superuser or user.is_staff:
                return Coupon.objects.all().order_by('-id')
            
            # For Users: Show Active Public + Coupons they own
            return Coupon.objects.filter(
                Q(status='Active') | 
                Q(claimed_by=user)
            ).distinct().order_by('-id')
        
        return public_coupons.order_by('-id')
    
    def destroy(self, request, *args, **kwargs):
        coupon = self.get_object()
        # Optional: You can prevent deletion if it's already used
        if coupon.times_used > 0:
            return Response({"error": "Cannot delete a coupon that has been used."}, status=status.HTTP_400_BAD_REQUEST)
        
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='claim')
    def claim(self, request, pk=None):
        user = request.user

        try:
            with transaction.atomic():
                coupon = Coupon.objects.select_for_update().get(id=pk)

                if coupon.criteria and coupon.criteria.valid_to and coupon.criteria.valid_to < timezone.now():
                    return Response({"error": "This coupon has expired."}, status=status.HTTP_400_BAD_REQUEST)

                if coupon.status != 'Active':
                    return Response({"error": "This coupon is no longer active."}, status=status.HTTP_400_BAD_REQUEST)

                if coupon.claimed_by.filter(id=user.id).exists():
                    return Response({"message": "You already have this coupon in your wallet."}, status=status.HTTP_200_OK)

                current_claims = coupon.claimed_by.count()
                if coupon.claim_limit is not None and current_claims >= coupon.claim_limit:
                    return Response({"error": "This coupon is fully claimed (Sold Out in App)."}, status=status.HTTP_400_BAD_REQUEST)

                coupon.claimed_by.add(user)
                coupon.times_claimed = coupon.claimed_by.count()
                coupon.save()

            serializer = self.get_serializer(coupon)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='mine')
    def my_coupons(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        # Check if a COMPLETED receipt exists for this specific user & coupon
        my_coupons = Coupon.objects.filter(claimed_by=user).annotate(
            is_used_by_user=Exists(
                Receipt.objects.filter(
                    coupons=OuterRef('pk'),
                    customer=user,
                    status='COMPLETED'
                )
            )
        ).order_by('-created_at')
        
        serializer = self.get_serializer(my_coupons, many=True)
        data = serializer.data
        
        # Inject the 'is_used' boolean directly into the serialized data
        for index, coupon in enumerate(my_coupons):
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

    def list(self, request):
        queryset = Receipt.objects.filter(status='COMPLETED')
        user = request.user
        
        cashier_filter = request.query_params.get('cashier', None)

        if not user.is_superuser:
            queryset = queryset.filter(cashier=user)
        elif cashier_filter: 
            queryset = queryset.filter(cashier__username=cashier_filter)
        
        report_data = (
            queryset
            .annotate(report_date=TruncDate('created_at'))
            .values('report_date')
            .annotate(
                total_revenue=Sum('total'),
                total_orders=Count('id'),
            )
            .order_by('-report_date')
        )

        void_queryset = Receipt.objects.filter(status='VOIDED')
        if not user.is_superuser:
            void_queryset = void_queryset.filter(cashier=user)
        elif cashier_filter:
            void_queryset = void_queryset.filter(cashier__username=cashier_filter)
            
        void_data = (
            void_queryset
            .annotate(report_date=TruncDate('created_at'))
            .values('report_date')
            .annotate(voided_orders=Count('id'))
        )
        void_map = {str(item['report_date']): item['voided_orders'] for item in void_data}

        top_seller_map = {}
        receipt_ids = queryset.values_list('id', flat=True)
        if receipt_ids:
            item_stats = (
                ReceiptItem.objects.filter(receipt__in=receipt_ids)
                .annotate(sale_date=TruncDate('receipt__created_at'))
                .values('sale_date', 'product_name')
                .annotate(qty_sold=Sum('quantity'))
                .order_by('sale_date', '-qty_sold') 
            )
            for stat in item_stats:
                date_str = str(stat['sale_date']) 
                if date_str not in top_seller_map:
                    top_seller_map[date_str] = stat['product_name']

        final_response = []
        for item in report_data:
            date_str = str(item['report_date'])
            total_rev = item['total_revenue'] or 0
            
            final_response.append({
                "report_date": date_str,
                "total_revenue": total_rev,
                "net_profit": total_rev,
                "total_cost": 0,
                "total_orders": item['total_orders'],
                "voided_orders": void_map.get(date_str, 0),
                "top_selling_product": top_seller_map.get(date_str, "N/A")
            })

        return Response(final_response)

    @action(detail=False, methods=['get'], url_path='by-staff')
    def by_staff(self, request):
        if not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=403)

        staff_data = (
            Receipt.objects.filter(status='COMPLETED')
            .values('cashier__username', 'cashier__first_name', 'cashier__last_name')
            .annotate(
                total_revenue=Sum('total'),
                total_orders=Count('id')
            )
            .order_by('-total_revenue')
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

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().order_by('-created_at')
    serializer_class = ReviewSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
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
        review_type = request.data.get('review_type', 'shop')

        if review_type == 'food':
            product_id = request.data.get('product')
            if not product_id:
                return Response({"error": "Product ID is required for food reviews."}, status=status.HTTP_400_BAD_REQUEST)
            
            # RULE 1: User can only write a review once per food ever
            if Review.objects.filter(user=user, review_type='food', product_id=product_id).exists():
                return Response({"error": "You have already reviewed this food item."}, status=status.HTTP_400_BAD_REQUEST)

        elif review_type == 'shop':
            # RULE 2: User can only write a shop review once per day
            today = timezone.now().date()
            if Review.objects.filter(user=user, review_type='shop', created_at__date=today).exists():
                return Response({"error": "You can only submit one shop review per day."}, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Automatically attach the authenticated user to the review
        serializer.save(user=self.request.user)

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

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

import random
import secrets
from django.core.mail import send_mail
    
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
            # Update or create the OTP record
            otp_record, created = OTP.objects.update_or_create(
                user=user,
                defaults={
                    'otp': random_otp,
                    'is_valid': True,
                    'expires_at': timezone.localtime() + timedelta(minutes=15),
                }
            )

            # Send the OTP via email (Brevo / Anymail)
            try:
                send_mail(
                    subject='Your Password Reset OTP – Kuya Vince Karinderya',
                    message=(
                        f'Hi {user.first_name or user.username},\n\n'
                        f'Your one-time password (OTP) is: {random_otp}\n\n'
                        f'This code will expire in 15 minutes.\n'
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
            'details': 'If an account with that email exists, an OTP has been sent. Please check your inbox.'
        }, status=status.HTTP_200_OK)


class VerifyOTPViewSet(viewsets.ModelViewSet):
    queryset = OTP.objects.all()
    serializer_class = OTPSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # Prevent stale JWTs from causing 401 on this public endpoint

    def create(self, request):
        received_otp = request.data.get('otp')
        email = request.data.get('email', '').strip().lower()

        if not received_otp or not email:
            return Response({'type': 'error', 'label': 'Missing Data', 'details': 'Both OTP and email are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp = OTP.objects.get(otp=received_otp, user__email__iexact=email)
            user = User.objects.filter(email__iexact=email).first()

            if not otp.is_valid:
                return Response({'type': 'error', 'label': 'Invalid OTP', 'details': 'The OTP you have sent is no longer valid. Please request another OTP'}, status=status.HTTP_400_BAD_REQUEST)


            if otp.expires_at < timezone.localtime():
                return Response({'type': 'error', 'label': 'Expired OTP', 'details': 'The OTP you have sent has expired. Please request another OTP'}, status=status.HTTP_400_BAD_REQUEST)
            
            otp.is_valid = False
            otp.save(update_fields=['is_valid'])

            token = secrets.token_urlsafe(32)

            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=timezone.localtime() + timedelta(minutes=5)
            )

            return Response({'type': 'success', 'label': 'OTP has been verified', 'details': 'Your OTP has now been verified. Please change your password within 5 minutes.', 'token': token}, status=status.HTTP_200_OK)

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

            if token.expires_at < timezone.localtime():
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
class StoreSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings, _ = StoreSettings.objects.get_or_create(id=1)
        return Response({
            "max_coupons_per_order": settings.max_coupons_per_order
        }, status=status.HTTP_200_OK)

    def post(self, request):
        # Only admins can update the settings
        if not request.user.is_superuser:
            return Response({"error": "Only administrators can change store settings."}, status=status.HTTP_403_FORBIDDEN)

        settings, _ = StoreSettings.objects.get_or_create(id=1)
        
        max_coupons = request.data.get('max_coupons_per_order')
        if max_coupons is not None:
            settings.max_coupons_per_order = int(max_coupons)
            settings.save()

        return Response({
            "message": "Settings updated successfully.",
            "max_coupons_per_order": settings.max_coupons_per_order
        }, status=status.HTTP_200_OK)