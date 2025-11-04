from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics
from rest_framework import viewsets
from .serializers import UserSerializer
from .models import Product
from .serializers import ProductSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

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

    def perform_create(self, serializer):
        serializer.delete(author=self.request.user)

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
