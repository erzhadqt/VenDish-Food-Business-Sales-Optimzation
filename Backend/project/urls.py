"""""
URL configuration for project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

from rest_framework.permissions import AllowAny

from firstapp.views import CreateUserView, UserViewSet, UserDetailView, HomePageViewSet, AboutPageViewSet, ContactPageViewSet, CurrentUserView, OTPViewSet, VerifyOTPViewSet, ChangePasswordViaToken, VerifyVoidPinView, UpdateVoidPinView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('firstapp/user/register/', CreateUserView.as_view(), name='register'),
    path('firstapp/token/', TokenObtainPairView.as_view(permission_classes=[AllowAny]), name='get_token'),
    path('firstapp/token/refresh/', TokenRefreshView.as_view(permission_classes=[AllowAny]), name='refresh'),
    path('firstapp-auth/', include('rest_framework.urls')),

    path("firstapp/users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    # path('home/', HomePageViewSet.as_view()),
    # path('about/', AboutPageViewSet.as_view()),
    # path('contact/', ContactPageViewSet.as_view()),

    path('firstapp/user/me/', CurrentUserView.as_view(), name='current_user'),

    path('firstapp/', include('firstapp.urls')),

    path('request-otp/', OTPViewSet.as_view({'post': 'create'}), name="request-otp"),
    path('verify-otp/', VerifyOTPViewSet.as_view({'post': 'create'}, name="verify-otp")),
    path('change-password-token/', ChangePasswordViaToken.as_view({'post': 'create'}, name="change-password-token")),

    path('update-void-pin/', UpdateVoidPinView.as_view(), name='update-void-pin'),
    path('verify-void-pin/', VerifyVoidPinView.as_view(), name='verify-void-pin')
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)