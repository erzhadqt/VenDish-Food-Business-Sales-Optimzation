from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Product, Costing, Receipt, ReceiptItem, Discount, Feedback, HomePage, AboutPage, ContactPage


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", 'password', "is_staff"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class ProductSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False)
    
    class Meta:
        model = Product
        fields = '__all__'
        extra_kwargs = {'date_added': {'read_only': True}}
        

class CostingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Costing
        fields = '__all__'

class ReceiptItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReceiptItem
        fields = ['id', 'product', 'product_name', 'price', 'quantity']

class ReceiptSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(many=True)  # Explicitly define the items field

    class Meta:
        model = Receipt
        fields = ['id', 'subtotal', 'vat', 'total', 'cash_given', 'change', 'created_at', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop("items")  # Extract items data
        receipt = Receipt.objects.create(**validated_data)  # Create the receipt

        # Create ReceiptItem objects for each item in items_data
        for item in items_data:
            ReceiptItem.objects.create(receipt=receipt, **item)

        return receipt

class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discount
        fields = '__all__'

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = '__all__'
        # extra_kwargs = {'message': {'read_only': True},
        #                 'date_submitted': {'read_only': True}}

class HomePageSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomePage
        fields = '__all__'

class AboutPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AboutPage
        fields = '__all__'

class ContactPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactPage
        fields = '__all__'