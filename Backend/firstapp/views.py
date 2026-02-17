from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
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

from .serializers import (
    UserSerializer, FeedbackSerializer, ProductSerializer, ReceiptSerializer, CouponSerializer, HomePageSerializer, AboutPageSerializer, ContactPageSerializer, DailySalesReportSerializer, CouponCriteriaSerializer, StaffPerformanceSerializer, ReviewSerializer
)
from .models import Product, Receipt, Coupon, Feedback, HomePage, AboutPage, ContactPage, DailySalesReport, CouponCriteria, ReceiptItem, Review
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
        Sets is_active=False.
        """
        user = request.user
        password = request.data.get('password')

        if not password:
            return Response({"error": "Password is required to deactivate account."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify password
        if not user.check_password(password):
            return Response({"error": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)

        # Deactivate
        user.is_active = False
        user.save()

        return Response({"message": "Account deactivated successfully."}, status=status.HTTP_200_OK)

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
    filterset_fields = ['category']

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
        
        if not user.is_superuser:
            queryset = queryset.filter(cashier=user)
        
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

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

class HomePageViewSet(viewsets.ModelViewSet):
    queryset = HomePage.objects.all()
    serializer_class = HomePageSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

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