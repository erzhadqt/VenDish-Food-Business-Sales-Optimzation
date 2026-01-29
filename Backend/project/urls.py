from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

from firstapp.views import (
    CreateUserView, 
    UserViewSet, 
    UserDetailView, 
    HomePageViewSet, 
    AboutPageViewSet, 
    TestimonialViewSet,
    ContactPageViewSet, 
    CurrentUserView,
    featured_products  # add this
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('firstapp/user/register/', CreateUserView.as_view(), name='register'),
    path('firstapp/token/', TokenObtainPairView.as_view(), name='get_token'),
    path('firstapp/token/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('firstapp-auth/', include('rest_framework.urls')),
    path("firstapp/users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    
    # HomePage API endpoints - ADD firstapp/ prefix
    path('firstapp/home/', HomePageViewSet.as_view({'get': 'list', 'post': 'create'}), name='home-list'),
    path('firstapp/home/<int:pk>/', HomePageViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='home-detail'),
    path('firstapp/products/featured/', featured_products, name='featured-products'),

    path('firstapp/user/me/', CurrentUserView.as_view(), name='current_user'),
    path('firstapp/', include('firstapp.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)