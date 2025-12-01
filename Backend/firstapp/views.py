from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from django.db.models import F
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter

from .serializers import (
    UserSerializer, FeedbackSerializer, ProductSerializer, ReceiptSerializer, CouponSerializer,
    CostingSerializer, HomePageSerializer, AboutPageSerializer, ContactPageSerializer, DailySalesReportSerializer
)
from .models import Product, Costing, Receipt, Coupon, Feedback, HomePage, AboutPage, ContactPage, DailySalesReport
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser, DjangoModelPermissions, DjangoModelPermissionsOrAnonReadOnly


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


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-id")
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]  # change to IsAdminUser if needed

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['product_name']
    filterset_fields = ['category']


class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.all().order_by('-created_at')
    serializer_class = ReceiptSerializer
    lookup_field = "id"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            try:
                # 1. Start a database transaction to ensure data integrity
                with transaction.atomic():
                    # 2. Save the receipt (and its items via nested serializer)
                    receipt = serializer.save()

                    # 3. SUBTRACT STOCK: Loop through the created items and update Product
                    for item in receipt.items.all():
                        if item.product:
                            # Use F() expression to safely subtract avoiding race conditions
                            item.product.stock_quantity = F('stock_quantity') - item.quantity
                            item.product.save()
                            
                            # Optional: Check if stock went negative and raise error if you want strict control
                            # item.product.refresh_from_db()
                            # if item.product.stock_quantity < 0:
                            #     raise Exception(f"Not enough stock for {item.product.name}")

                    # 4. UPDATE COUPON: Mark coupon as Redeemed if used
                    if receipt.coupon:
                        receipt.coupon.status = 'Redeemed' # Or whatever status indicates it's used
                        receipt.coupon.save()

                    # 5. Return success response
                    return Response(
                        {"receipt_id": receipt.id, **serializer.data},
                        status=status.HTTP_201_CREATED
                    )

            except Exception as e:
                # If anything fails inside the atomic block, DB rolls back
                return Response(
                    {"error": f"Transaction failed: {str(e)}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='void')
    def void_receipt(self, request, pk=None, id=None):
        # 1. Let DRF handle finding the object automatically
        receipt = self.get_object() 

        # 2. Check if already voided
        if receipt.status == 'VOIDED': 
            return Response(
                {"error": "This receipt is already voided."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # A. Restore Inventory (ADD BACK)
                for item in receipt.items.all():
                    if item.product:
                        # Use F() to add back safely
                        item.product.stock_quantity = F('stock_quantity') + item.quantity
                        item.product.save()

                # B. Restore Coupon (Make Active Again)
                if receipt.coupon:
                    if receipt.coupon.claimed_by:
                        receipt.coupon.status = 'Claimed' 
                    else:
                        receipt.coupon.status = 'Active' 
                    receipt.coupon.save()

                    # Also restore item-level coupons if you have them
                    for item in receipt.items.all():
                        if item.coupon:
                            item.coupon.status = 'Active' 
                            item.coupon.save()

                # C. Mark as Void
                receipt.status = 'VOIDED' 
                receipt.void_reason = request.data.get('reason', "Voided via POS")
                receipt.voided_at = timezone.now()
                receipt.voided_by = request.user
                receipt.save()

                return Response({"status": "Receipt voided successfully", "receipt_id": receipt.id})

        except Exception as e:
            return Response({"error": str(e)}, status=500)

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    # Default: Everyone can see the list of coupons
    permission_classes = [AllowAny]

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def claim(self, request, pk=None):
        """
        Endpoint: POST /coupons/{id}/claim/
        """
        coupon = self.get_object()
        
        # 1. Strict Check: Can only claim if currently ACTIVE
        # We do NOT use coupon.is_valid here, because is_valid returns True for Claimed coupons (for POS)
        if coupon.status != Coupon.Status.ACTIVE:
             return Response(
                 {'error': 'This coupon has already been claimed or is expired.'}, 
                 status=status.HTTP_400_BAD_REQUEST
             )

        # 2. Assign the User and Change Status
        # Note: You need to make sure your Model has 'claimed_by'

        coupon.status = Coupon.Status.CLAIMED
        
        # 3. Save to Database
        coupon.save()
        
        return Response({
            'status': 'success', 
            'message': 'Coupon claimed successfully',
            'coupon': self.get_serializer(coupon).data
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def mine(self, request):
        """
        GET /coupons/mine/
        Returns all coupons claimed by the current logged-in user.
        """
        user = request.user
        # Get coupons where claimed_by is the user
        # This includes Active AND Redeemed coupons
        my_coupons = Coupon.objects.filter(claimed_by=user).order_by('-created_at')
        serializer = self.get_serializer(my_coupons, many=True)
        return Response(serializer.data)

class DailySalesReportViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows sales reports to be viewed.
    Supports filtering by date range.
    """
    serializer_class = DailySalesReportSerializer

    def get_queryset(self):
        """
        Standard queryset, but allows filtering via URL parameters:
        Example: /api/sales-reports/?start_date=2023-10-01&end_date=2023-10-31
        """
        queryset = DailySalesReport.objects.all().order_by('-report_date')
        
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(report_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(report_date__lte=end_date)
            
        return queryset

    @action(detail=False, methods=['post'], url_path='refresh-today')
    def refresh_today(self, request):
        """
        Custom endpoint to force-calculate today's sales immediately.
        Call this via POST to: /api/sales-reports/refresh-today/
        """
        today = timezone.now().date()
        
        # Get or create the report object for today
        report, created = DailySalesReport.objects.get_or_create(report_date=today)
        
        # Run the calculation logic defined in the model
        report.generate_report()
        
        # Serialize the updated data and return it
        serializer = self.get_serializer(report)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CostingViewSet(viewsets.ModelViewSet):
    queryset = Costing.objects.all()
    serializer_class = CostingSerializer
    permission_classes = [IsAuthenticated]


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