from django.urls import path, include
from .views import ProductViewSet, CategoryViewSet, FeedbackViewSet, ReceiptViewSet, CouponViewSet, HomePageViewSet, ServicesPageViewSet, AboutPageViewSet, ContactPageViewSet, UserViewSet, DailySalesReportViewSet, CouponCriteriaViewSet, ReviewViewSet, StoreSettingsView, GCashPaymentCreateView, GCashPaymentStatusView, GCashPaymentWebhookView, GCashAttachReceiptView

from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'sales', DailySalesReportViewSet, basename='sales')
router.register(r'feedback', FeedbackViewSet)

router.register(r'home', HomePageViewSet)
router.register(r'about', AboutPageViewSet)
router.register(r'services-page', ServicesPageViewSet, basename='services-page')

router.register(r'contact-page', ContactPageViewSet)

router.register(r'reviews', ReviewViewSet)

router.register(r'users', UserViewSet)
router.register(r'receipt', ReceiptViewSet)
router.register(r'coupons', CouponViewSet, basename='coupon')
router.register(r'coupons-criteria', CouponCriteriaViewSet, basename='coupons-criteria')

# router.register(r'settings', StoreSettingsView, basename='store-settings')


urlpatterns = [
    path('', include(router.urls)),
    path('payments/gcash/create/', GCashPaymentCreateView.as_view(), name='gcash-payment-create'),
    path('payments/gcash/<int:transaction_id>/status/', GCashPaymentStatusView.as_view(), name='gcash-payment-status'),
    path('payments/gcash/webhook/', GCashPaymentWebhookView.as_view(), name='gcash-payment-webhook'),
    path('payments/gcash/attach-receipt/', GCashAttachReceiptView.as_view(), name='gcash-payment-attach-receipt'),
]