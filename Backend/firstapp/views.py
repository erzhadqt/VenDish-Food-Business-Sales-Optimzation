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
    UserSerializer, FeedbackSerializer, ProductSerializer, ReceiptSerializer, CouponSerializer, HomePageSerializer, AboutPageSerializer, ContactPageSerializer, DailySalesReportSerializer, CouponCriteriaSerializer
)
from .models import Product, Receipt, Coupon, Feedback, HomePage, AboutPage, ContactPage, DailySalesReport, CouponCriteria, ReceiptItem
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser


# -------------------------------
# USER CRUD
# -------------------------------

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]     # Anyone can register

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]   # Only admins can view/edit/delete users

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]  # Ensure the user has admin permissions

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-id")
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]  # change to IsAdminUser if needed

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['product_name']
    filterset_fields = ['category']

    def get_permissions(self):
        # Allow any authenticated user (Staff or Admin) to list/retrieve
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            # Only Admins can create, update, or delete
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]
    
class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.all().order_by('-created_at')
    serializer_class = ReceiptSerializer
    lookup_field = "id"

    def get_queryset(self):
        # 1. Get base queryset
        queryset = Receipt.objects.all().order_by('-created_at')
        
        # 2. Get current user
        user = self.request.user

        # 3. Apply Filter
        if not user.is_authenticated:
            return Receipt.objects.none()

        # FIX: Only Superusers (Admins) see all. 
        # Even if they have 'is_staff=True', they will still be filtered 
        # unless they are a Superuser.
        if user.is_superuser: 
            return queryset
        
        # Everyone else (Cashiers) ONLY sees their own receipts
        return queryset.filter(cashier=user)

    # ---------------------------------------------------------
    # 1. CREATE RECEIPT (Checkout)
    # ---------------------------------------------------------
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            try:
                with transaction.atomic():
                    # 1. Save Receipt with CURRENT USER as Cashier
                    receipt = serializer.save(cashier=request.user)

                    # 2. UPDATE COUPON
                    if receipt.coupon:
                        coupon = Coupon.objects.select_for_update().get(id=receipt.coupon.id)
                        coupon.times_used += 1
                        if coupon.usage_limit and coupon.times_used >= coupon.usage_limit:
                            coupon.status = Coupon.Status.REDEEMED
                        coupon.save()

                    return Response(
                        {"receipt_id": receipt.id, **serializer.data},
                        status=status.HTTP_201_CREATED
                    )

            except Exception as e:
                return Response({"error": f"Transaction failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ---------------------------------------------------------
    # 2. LOG VOID (Partial Void from Cart) - NEW FUNCTION
    # ---------------------------------------------------------
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

                # Create Receipt (Save 'cashier' here as well so they see their voids)
                receipt = Receipt.objects.create(
                    status='VOIDED',
                    cashier=user, # <--- Added this line
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

    # ---------------------------------------------------------
    # 3. VOID FULL RECEIPT (Post-Transaction)
    # ---------------------------------------------------------
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
                # (Stock restoration logic removed as requested)

                # A. Restore Coupon
                if receipt.coupon:
                    coupon = Coupon.objects.select_for_update().get(id=receipt.coupon.id)
                    
                    if coupon.times_used > 0:
                        coupon.times_used -= 1
                    
                    if coupon.status == Coupon.Status.REDEEMED:
                        if getattr(coupon, 'claimed_by', None): 
                            coupon.status = Coupon.Status.CLAIMED
                        else:
                            coupon.status = Coupon.Status.ACTIVE
                    
                    coupon.save()

                # B. Mark Receipt as Void
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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        By default, list Active coupons (Public) OR Coupons owned by the user.
        """
        user = self.request.user
        if user.is_superuser:
            return Coupon.objects.all().order_by('-id')
        
        # Show coupons that are:
        # 1. Active AND Unclaimed (Public Promos)
        # 2. OR Claimed by THIS user (My Wallet)
        return Coupon.objects.filter(
            status__in=['Active', 'Claimed']
        ).filter(
            Q(claimed_by=None) | Q(claimed_by=user)
        ).order_by('-id')

    # ------------------------------------------------------------
    # 2. THE FIX: ADD THE CLAIM ACTION
    # ------------------------------------------------------------
    @action(detail=True, methods=['post'], url_path='claim')
    def claim(self, request, pk=None):
        """
        Endpoint: POST /firstapp/coupons/{id}/claim/
        """
        coupon = self.get_object()
        user = request.user

        # A. Validation: Is it already claimed?
        if coupon.status != 'Active':
            return Response(
                {"error": "This coupon is no longer active."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if coupon.claimed_by is not None:
            # If the user already owns it, just return success
            if coupon.claimed_by == user:
                return Response({"message": "You already own this coupon."})
            
            return Response(
                {"error": "This coupon has already been claimed by someone else."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # B. Claim Logic
        try:
            coupon.claimed_by = user
            coupon.status = 'Claimed' # Update status so it doesn't show for others
            coupon.save()

            # Return the updated coupon data
            serializer = self.get_serializer(coupon)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='my-coupons')
    def my_coupons(self, request):
        """
        Fetch only the coupons claimed by the logged-in user.
        """
        user = request.user
        
        # Safety check
        if not user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        # Filter coupons where claimed_by is the current user
        my_coupons = Coupon.objects.filter(claimed_by=user).order_by('-created_at')
        
        serializer = self.get_serializer(my_coupons, many=True)
        return Response(serializer.data)

class CouponCriteriaViewSet(viewsets.ModelViewSet):
    queryset = CouponCriteria.objects.all().order_by('-id')
    serializer_class = CouponCriteriaSerializer
    permission_classes = [IsAuthenticated] # Or IsAdminUser

class DailySalesReportViewSet(viewsets.ViewSet):
    """
    Unified ViewSet for all Sales Reports (Timeline & Staff Performance).
    Calculates data dynamically from Receipts (No static tables).
    """
    permission_classes = [IsAuthenticated]

    # ------------------------------------------------------------------
    # 1. TIMELINE VIEW (Daily/Monthly Stats)
    # Endpoint: GET /firstapp/sales/
    # ------------------------------------------------------------------
    def list(self, request):
        # A. Base Query
        queryset = Receipt.objects.filter(status='COMPLETED')
        user = request.user
        
        # B. Filter: Admin sees all, Staff sees own
        if not user.is_superuser:
            queryset = queryset.filter(cashier=user)
        
        # C. Aggregate Financials
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

        # D. Get Void Data
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

        # E. Top Seller Logic (Fixed for N/A issue)
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
            # Map date string to product name
            for stat in item_stats:
                date_str = str(stat['sale_date'])
                if date_str not in top_seller_map:
                    top_seller_map[date_str] = stat['product_name']

        # F. Build Response
        final_response = []
        for item in report_data:
            date_str = str(item['report_date'])
            total_rev = item['total_revenue'] or 0
            
            final_response.append({
                "report_date": date_str,
                "total_revenue": total_rev,
                "net_profit": total_rev, # Gross Income
                "total_cost": 0,
                "total_orders": item['total_orders'],
                "voided_orders": void_map.get(date_str, 0),
                "top_selling_product": top_seller_map.get(date_str, "N/A")
            })

        return Response(final_response)

    # ------------------------------------------------------------------
    # 2. STAFF PERFORMANCE VIEW (Admin Only)
    # Endpoint: GET /firstapp/sales/by-staff/
    # ------------------------------------------------------------------
    @action(detail=False, methods=['get'], url_path='by-staff')
    def by_staff(self, request):
        """
        Groups sales by Cashier.
        """
        # Security: Only admins can see comparison
        if not request.user.is_superuser:
            return Response(
                {"error": "Unauthorized"}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Group by Cashier User ID
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
            username = item['cashier__username'] or "Unassigned / Legacy"
            # Format Name: "John Doe" or just "johndoe"
            first = item['cashier__first_name']
            last = item['cashier__last_name']
            
            if first or last:
                display_name = f"{first} {last}".strip()
            else:
                display_name = username

            response_data.append({
                "name": display_name,
                "revenue": item['total_revenue'] or 0,
                "orders": item['total_orders']
            })

        return Response(response_data)

    @action(detail=False, methods=['post'], url_path='refresh-today')
    def refresh_today(self, request):
        return Response({"message": "Data synchronized"}, status=200)

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]


class HomePageViewSet(viewsets.ModelViewSet):
    queryset = HomePage.objects.all()
    serializer_class = HomePageSerializer
    permission_classes = [IsAuthenticated]


class AboutPageViewSet(viewsets.ModelViewSet):
    queryset = AboutPage.objects.all()
    serializer_class = AboutPageSerializer
    permission_classes = [IsAuthenticated]


class ContactPageViewSet(viewsets.ModelViewSet):
    queryset = ContactPage.objects.all()
    serializer_class = ContactPageSerializer
    permission_classes = [AllowAny]

    def list(self, request, *args, **kwargs):
        latest = ContactPage.objects.order_by('-id').first()
        if not latest:
            return Response([], status=200)
        serializer = self.get_serializer(latest)
        return Response(serializer.data)