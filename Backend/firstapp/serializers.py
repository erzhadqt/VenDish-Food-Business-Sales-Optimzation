from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Product, Costing, Order, OrderProduct, Sales, Feedback


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
        extra_kwargs = {'category_choices': {'read_only': True},
                        'product_name': {'read_only': True},
                        'category': {'read_only': True},
                        'price': {'read_only': True},
                        'stock_quantity': {'read_only': True},
                        'date_added': {'read_only': True}}

class CostingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Costing
        fields = '__all__'
        extra_kwargs = {'product': {'read_only': True},
                        'ingredient_cost': {'read_only': True},
                        'electricity_cost': {'read_only': True},
                        'gas_consumption': {'read_only': True},
                        'labor_cost': {'read_only': True},
                        'profit_margin': {'read_only': True}}

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'
        extra_kwargs = {'date_ordered': {'read_only': True},
                        'total_amount': {'read_only': True},
                        'discount': {'read_only': True},
                        'tax': {'read_only': True},
                        'status': {'read_only': True}}

class OrderProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderProduct
        fields = '__all__'
        extra_kwargs = {'order': {'read_only': True},
                        'product': {'read_only': True},
                        'quantity': {'read_only': True},
                        'subtotal': {'read_only': True}}

class SalesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sales
        fields = '__all__'
        extra_kwargs = {'order': {'read_only': True},
                        'total_sales': {'read_only': True},
                        'profit': {'read_only': True},
                        'date_recorded': {'read_only': True}}

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = '__all__'
        extra_kwargs = {'message': {'read_only': True},
                        'date_submitted': {'read_only': True}}