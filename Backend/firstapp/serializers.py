from django.contrib.auth.models import User
from rest_framework import serializers
from django.db import transaction

from .models import Product, Costing, Receipt, ReceiptItem, Coupon, Feedback, HomePage, AboutPage, ContactPage, DailySalesReport


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password", "is_staff", "is_superuser"]
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

class CouponSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)

    class Meta:
        model = Coupon
        fields = '__all__'

class ReceiptItemSerializer(serializers.ModelSerializer):
    # ReadOnlyField looks for a property/method on the model with the same name.
    # This grabs the @property subtotal from your ReceiptItem model.
    subtotal = serializers.ReadOnlyField() 

    class Meta:
        model = ReceiptItem
        fields = ['id', 'product', 'product_name', 'price', 'quantity', 'subtotal', 'coupon',]
        # 'product' is included so you can send the ID when creating, 
        # but 'product_name' stores the snapshot of the name at time of purchase.

class ReceiptSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(many=True)
    
    # WRITE ONLY: The frontend sends the ID here when creating a receipt
    coupon = serializers.PrimaryKeyRelatedField(
        queryset=Coupon.objects.all(), 
        required=False, 
        allow_null=True, 
        write_only=True
    )

    coupon_details = CouponSerializer(source='coupon', read_only=True)

    class Meta:
        model = Receipt
        fields = [
            'id', 'subtotal', 'vat', 'total', 
            'cash_given', 'change', 'created_at', 
            'items', 
            'coupon',
            'coupon_details',
            'status',
            'void_reason'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items") 
        
        # Extract coupon if present
        coupon = validated_data.get('coupon', None)

        with transaction.atomic():  
            # 1. Create the Receipt
            receipt = Receipt.objects.create(**validated_data)

            # 2. Logic: If a coupon is used, mark it as Redeemed?
            # (Optional: depends on your business logic)
            if coupon and coupon.status == Coupon.Status.ACTIVE:
                coupon.status = Coupon.Status.REDEEMED
                coupon.save()

            # 3. Create Items
            items_to_create = []
            for item_data in items_data:
                # If specific items have their own coupons (from previous logic), keep them
                # Otherwise, ReceiptItem creation is standard
                items_to_create.append(ReceiptItem(receipt=receipt, **item_data))
            
            ReceiptItem.objects.bulk_create(items_to_create)

        return receipt

class DailySalesReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySalesReport
        fields = [
            'id', 
            'report_date', 
            'total_revenue', 
            'total_cost', 
            'net_profit', 
            'total_orders', 
            'voided_orders', 
            'top_selling_product',
            'updated_at'
        ]
        # 'read_only_fields' ensures the API cannot overwrite calculated data manually
        read_only_fields = fields

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