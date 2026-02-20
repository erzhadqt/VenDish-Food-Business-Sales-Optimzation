from django.urls import path, include
from .views import ProductViewSet, FeedbackViewSet, ReceiptViewSet, CouponViewSet, HomePageViewSet, ServicesPageViewSet, AboutPageViewSet, ContactPageViewSet, UserViewSet, DailySalesReportViewSet, CouponCriteriaViewSet, ReviewViewSet

from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'sales', DailySalesReportViewSet, basename='sales')
router.register(r'feedback', FeedbackViewSet)

router.register(r'home', HomePageViewSet)
router.register(r'about', AboutPageViewSet)
router.register(r'services-page', ServicesPageViewSet, basename='services-page')

# FIX: Changed 'contact' to 'contact-page' to match the frontend API calls
router.register(r'contact-page', ContactPageViewSet)

router.register(r'reviews', ReviewViewSet)

router.register(r'users', UserViewSet)
router.register(r'receipt', ReceiptViewSet)
router.register(r'coupons', CouponViewSet, basename='coupon')
router.register(r'coupons-criteria', CouponCriteriaViewSet, basename='coupons-criteria')


urlpatterns = [
    path('', include(router.urls)),
]