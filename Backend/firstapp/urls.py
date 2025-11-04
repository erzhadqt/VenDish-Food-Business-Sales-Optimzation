from django.urls import path
from . import views

urlpatterns = [
    path('products/', views.ProductListCreate.as_view(), name='product-list'),
    path('product/delete/<int:pk>/', views.ProductDelete.as_view(), name='delete-product'),
]