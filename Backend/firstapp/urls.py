from django.urls import path, include
from .views import ProductViewSet, CostingViewSet, FeedbackViewSet, ReceiptViewSet, CouponViewSet, HomePageViewSet, AboutPageViewSet, ContactPageViewSet, UserViewSet, DailySalesReportViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'costing', CostingViewSet)
router.register(r'sales', DailySalesReportViewSet, basename='sales-report')
router.register(r'feedback', FeedbackViewSet)

router.register(r'home', HomePageViewSet)
router.register(r'about', AboutPageViewSet)
router.register(r'contact', ContactPageViewSet)

router.register(r'users', UserViewSet)
router.register(r'receipt', ReceiptViewSet)
router.register(r'coupons', CouponViewSet, basename='coupon')



urlpatterns = [
    path('', include(router.urls)),
]