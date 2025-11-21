from django.urls import path, include
from .views import ProductViewSet, CostingViewSet, FeedbackViewSet, ReceiptViewSet, DiscountViewSet, HomePageViewSet, AboutPageViewSet, ContactPageViewSet, UserViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'costing', CostingViewSet)
# router.register(r'order', OrderViewSet)
# router.register(r'order-product', OrderProductViewSet)
# router.register(r'sales', SalesViewSet)
router.register(r'feedback', FeedbackViewSet)

router.register(r'home', HomePageViewSet)
router.register(r'about', AboutPageViewSet)
router.register(r'contact', ContactPageViewSet)

router.register(r'users', UserViewSet)
router.register(r'receipt', ReceiptViewSet)
router.register(r'discount', DiscountViewSet)



urlpatterns = [
    # path('products/', views.ProductListCreate.as_view(), name='product-list'),
    # path('product/delete/<int:pk>/', views.ProductDelete.as_view(), name='delete-product'),
    path('', include(router.urls)),
]