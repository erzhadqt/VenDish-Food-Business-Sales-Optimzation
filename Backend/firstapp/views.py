from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, generics, permissions
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter

from .serializers import (
    UserSerializer, FeedbackSerializer, ProductSerializer, 
    CostingSerializer, HomePageSerializer, AboutPageSerializer, ContactPageSerializer
)
from .models import Product, Costing, Feedback, HomePage, AboutPage, ContactPage
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
    permission_classes = [AllowAny]   # Only admins can view/edit/delete users

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # Ensure the user has admin permissions
# -------------------------------
# PRODUCT
# -------------------------------

class ProductListCreate(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ProductDelete(generics.DestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-id")
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]  # change to IsAdminUser if needed

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['product_name', 'category']


# -------------------------------
# OTHER MODELS
# -------------------------------

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
