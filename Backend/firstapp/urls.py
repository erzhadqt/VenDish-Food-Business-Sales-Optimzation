from django.urls import path, include
from .views import ProductViewSet, FeedbackViewSet, ReceiptViewSet, CouponViewSet, HomePageViewSet, PopularDishViewSet, HomePageImageViewSet, ServicesPageViewSet, ServiceViewSet, AboutPageViewSet, TestimonialViewSet, ContactPageViewSet, ContactInfoViewSet, UserViewSet, DailySalesReportViewSet, CouponCriteriaViewSet, featured_products #i add
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'sales', DailySalesReportViewSet, basename='sales')
router.register(r'feedback', FeedbackViewSet)

router.register(r'home', HomePageViewSet)
router.register(r'popular-dishes', PopularDishViewSet, basename='popular-dishes')
router.register(r'homepage-images', HomePageImageViewSet, basename='homepage-images')

router.register(r'services-page', ServicesPageViewSet, basename='services-page')
router.register(r'services', ServiceViewSet, basename='services')


router.register(r'about-page', AboutPageViewSet)
router.register(r'testimonials', TestimonialViewSet)

router.register(r'contact-page', ContactPageViewSet)
router.register(r'contact-info', ContactInfoViewSet, basename='contact-info')

router.register(r'users', UserViewSet)
router.register(r'receipt', ReceiptViewSet)
router.register(r'coupons', CouponViewSet, basename='coupon')
router.register(r'coupons-criteria', CouponCriteriaViewSet, basename='coupons-criteria')



urlpatterns = [
    path('', include(router.urls)),
    path('products/featured/', featured_products), # add
]