from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import transaction
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
from rest_framework.decorators import action

from django.contrib.auth.hashers import make_password, check_password

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.permissions import AllowAny

from .serializers import (
    UserSerializer, FeedbackSerializer, ProductSerializer, CategorySerializer, ReceiptSerializer, CouponSerializer, HomePageSerializer, ServicesPageSerializer, AboutPageSerializer, ContactPageSerializer, CouponCriteriaSerializer, StaffPerformanceSerializer, ReviewSerializer, OTPSerializer
)   
from .models import Product, Category, Receipt, Coupon, Feedback, HomePage, ServicesPage, AboutPage, ContactPage, CouponCriteria, ReceiptItem, Review, OTP, PasswordResetToken, StoreSettings
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser


# -------------------------------
# USER CRUD
# -------------------------------

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer
    # permission_classes = [IsAdminUser]

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

    # [NEW] 'Me' Endpoint to fetch current user details
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='me')
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

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

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

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
        coupons_data = request.data.get('coupons', [])
        if isinstance(coupons_data, list) and len(coupons_data) > 2:
            return Response(
                {"error": "Maximum of 2 coupons allowed per order."}, 
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

                    # 3. UPDATE COUPONS (Loop through all applied)
                    # FIX: Iterate over receipt.coupons.all()
                    for coupon_ref in receipt.coupons.all():
                        # Lock the coupon row
                        coupon = Coupon.objects.select_for_update().get(id=coupon_ref.id)
                        
                        # --- VALIDATION LOGIC ---

                        if coupon.criteria and coupon.criteria.valid_to and coupon.criteria.valid_to < timezone.now():
                            raise Exception(f"Coupon {coupon.code} has expired.")

                        if coupon.criteria and coupon.criteria.min_spend > 0:
                            if receipt.subtotal < coupon.criteria.min_spend:
                                raise Exception(f"Coupon {coupon.code} requires a minimum spend of ₱{coupon.criteria.min_spend}.")

                        # RULE A: ONE USE PER USER (If customer is identified)
                        if target_customer:
                            already_used = Receipt.objects.filter(
                                coupons=coupon, # M2M check
                                customer=target_customer,
                                status='COMPLETED'
                            ).exclude(id=receipt.id).exists()

                            if already_used:
                                raise Exception(f"User {target_customer.username} has already used coupon {coupon.code}.")

                        # RULE B: GLOBAL USAGE LIMIT
                        if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
                            if not target_customer:
                                raise Exception(f"Coupon {coupon.code} is sold out.")
                            
                            has_claim = coupon.claimed_by.filter(id=target_customer.id).exists()
                            if not has_claim:
                                raise Exception(f"Coupon {coupon.code} is sold out and not claimed by user.")

                        # --- END VALIDATION ---

                        # Increment global usage
                        coupon.times_used += 1
                        
                        # Auto-update status if limit reached
                        if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
                            coupon.status = 'Redeemed'
                            
                        coupon.save() 

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
                # FIX: Revert ALL coupons
                for coupon_ref in receipt.coupons.all():
                    coupon = Coupon.objects.select_for_update().get(id=coupon_ref.id)
                    
                    if coupon.times_used > 0:
                        coupon.times_used -= 1
                    
                    # Revert status to Active if space opens up
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
        coupon = self.get_object()
        user = request.user

        # [NEW] Expiration Check
        if coupon.criteria and coupon.criteria.valid_to and coupon.criteria.valid_to < timezone.now():
             return Response({"error": "This coupon has expired."}, status=status.HTTP_400_BAD_REQUEST)

        if coupon.status != 'Active':
            return Response({"error": "This coupon is no longer active."}, status=status.HTTP_400_BAD_REQUEST)
        
        if coupon.claimed_by.filter(id=user.id).exists():
            return Response({"message": "You already have this coupon in your wallet."})

        if coupon.usage_limit is not None and coupon.claimed_by.count() >= coupon.usage_limit:
             return Response({"error": "This coupon is fully claimed (Sold Out)."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                coupon = Coupon.objects.select_for_update().get(id=coupon.id)
                
                if coupon.usage_limit is not None and coupon.claimed_by.count() >= coupon.usage_limit:
                     return Response({"error": "Sold Out just now."}, status=400)

                coupon.claimed_by.add(user)
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

        my_coupons = Coupon.objects.filter(claimed_by=user).order_by('-created_at')
        serializer = self.get_serializer(my_coupons, many=True)
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
    
class OTPViewSet(viewsets.ModelViewSet):
    queryset = OTP.objects.all()
    serializer_class = OTPSerializer
    permission_classes = [AllowAny]

    def create(self, request):
        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response({'type': 'error', 'label': 'No Email', 'details': 'No email has been sent'}, status=status.HTTP_400_BAD_REQUEST)

        random_otp = int(''.join(map(str, [random.randint(1, 6) for _ in range(6)])))
        user = None
        otp = None

        try:
            # user = User.objects.get(email=email)
            user = User.objects.filter(email=email).first()
        except User.DoesNotExist:
            pass
        
        if user:
            try:
                otp = OTP.objects.get(user__email=email)

                otp.otp = random_otp
                otp.is_valid = True
                otp.expires_at=timezone.localtime() + timedelta(minutes=15)
                otp.save()

            except OTP.DoesNotExist:
                otp = OTP.objects.create(
                    user=user,
                    otp=random_otp,
                    is_valid=True,
                    expires_at=timezone.localtime() + timedelta(minutes=15)
                )
                serializer = self.get_serializer(otp)
                if serializer.is_valid():
                    serializer.save()
        
        return Response({'otp': str(random_otp), 'type': 'success', 'label': 'OTP Sent!', 'details': 'The OTP has been sent! Check your email address for more information'}, status=status.HTTP_200_OK)


class VerifyOTPViewSet(viewsets.ModelViewSet):
    queryset = OTP.objects.all()
    serializer_class = OTPSerializer
    permission_classes = [AllowAny]

    def create(self, request):
        received_otp = request.data.get('otp')
        email = request.data.get('email')

        print(received_otp, email)

        try:
            otp = OTP.objects.get(otp=received_otp, user__email__iexact=email)
            user = User.objects.filter(email=email).first()

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

    def create(self, request):
        received_token = request.data.get('token')
        password = request.data.get('password')
        email = request.data.get('email')

        if not received_token or not password or not email:
            return Response({'type': 'error', 'label': 'Missing Data', 'details': 'Token, email, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        print(received_token)
        print(password)
        print(email)

        try:
            token = PasswordResetToken.objects.get(token=received_token)

            if token.expires_at < timezone.localtime():
                return Response({'type': 'error', 'label': 'Expired Token', 'details': 'Your token has expired. Please redo the process carefully'}, status=status.HTTP_400_BAD_REQUEST)

            user = User.objects.filter(email=email).first()

            print('User is motherfucker: ', user)

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