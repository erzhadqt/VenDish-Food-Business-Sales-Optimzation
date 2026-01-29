from django.contrib.auth.models import User
from rest_framework import serializers
from django.db import transaction

from .models import Product, Receipt, ReceiptItem, Coupon, Feedback, HomePage, PopularDish, HomePageImage, ServicesPage, Service, AboutPage, Testimonial, ContactPage, ContactInfo, DailySalesReport, CouponCriteria

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

class CouponCriteriaSerializer(serializers.ModelSerializer):
    free_product_name = serializers.CharField(source='free_product.product_name', read_only=True)
    target_product_name = serializers.CharField(source='target_product.product_name', read_only=True)

    class Meta:
        model = CouponCriteria
        fields = '__all__'

class CouponSerializer(serializers.ModelSerializer):
    # Nesting
    criteria_details = CouponCriteriaSerializer(source='criteria', read_only=True)
    criteria_id = serializers.PrimaryKeyRelatedField(
        queryset=CouponCriteria.objects.all(), source='criteria', write_only=True, required=True
    )

    # Flattened Fields
    name = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    rate = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    
    # NEW: Check if current user has used this coupon
    is_used = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'status', 'usage_limit', 'times_used', 
            'created_at', 'criteria_details', 'criteria_id',
            'name', 'product_name', 'rate', 'description', 
            'is_used' # Added field
        ]
    
    def get_name(self, obj):
        return obj.criteria.name if obj.criteria else "Promo Code"

    def get_rate(self, obj):
        return obj.criteria.discount_value if obj.criteria else 0

    def get_product_name(self, obj):
        if not obj.criteria: return "General Discount"
        if obj.criteria.target_product: return obj.criteria.target_product.product_name
        if obj.criteria.free_product: return f"Free {obj.criteria.free_product.product_name}"
        if obj.criteria.target_category: return f"{obj.criteria.target_category} Special"
        return "Site-wide Deal"

    def get_description(self, obj):
        if not obj.criteria: return "Special exclusive discount."
        c = obj.criteria
        if c.discount_type == 'percentage': return f"Get {c.discount_value}% OFF on selected items."
        elif c.discount_type == 'fixed': return f"Save ₱{c.discount_value} on your order."
        elif c.discount_type == 'free_item':
            prod = c.free_product.product_name if c.free_product else "item"
            return f"Buy required items and get a {prod} for free!"
        return "Limited time offer."

    def get_is_used(self, obj):
        """
        Checks if the logged-in user has a COMPLETED receipt with this coupon.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Check Receipt table for (coupon=this, customer=me)
            return Receipt.objects.filter(
                coupon=obj, 
                customer=request.user, 
                status='COMPLETED'
            ).exists()
        return False

class ReceiptItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField() 

    class Meta:
        model = ReceiptItem
        fields = ['id', 'product', 'product_name', 'price', 'quantity', 'subtotal', 'coupon',]

class ReceiptSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(many=True)
    cashier_name = serializers.CharField(source='cashier.username', read_only=True)
    
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
            'void_reason',
            'cashier_name'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items") 
        validated_data.get('coupon', None)

        with transaction.atomic():  
            # Note: cashier and customer are added in ViewSet, not here
            receipt = Receipt.objects.create(**validated_data)

            items_to_create = []
            for item_data in items_data:
                items_to_create.append(ReceiptItem(receipt=receipt, **item_data))
            
            ReceiptItem.objects.bulk_create(items_to_create)

        return receipt

class DailySalesReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySalesReport
        fields = [
            'id', 'report_date', 'total_revenue', 'total_cost', 
            'net_profit', 'total_orders', 'voided_orders', 
            'top_selling_product', 'updated_at'
        ]
        read_only_fields = fields

class StaffPerformanceSerializer(serializers.Serializer):
    name = serializers.CharField(read_only=True)
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    orders = serializers.IntegerField(read_only=True)

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta: model = Feedback; fields = '__all__'

class HomePageSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomePage
        fields = '__all__'
        extra_kwargs = {
            'banner_image': {
                'required': False,  
                'allow_null': True,  
            }
        }
    
    def update(self, instance, validated_data):
        """
        Custom update to handle banner_image properly.
        If banner_image is not in validated_data, keep the existing one.
        """
        # Only update banner_image if a new one was provided
        if 'banner_image' not in validated_data:
            # No new image provided, keep the existing one
            validated_data['banner_image'] = instance.banner_image
        
        return super().update(instance, validated_data)

class PopularDishSerializer(serializers.ModelSerializer):
    class Meta:
        model = PopularDish
        fields = '__all__'


class HomePageImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomePageImage
        fields = '__all__'

class ServicesPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicesPage
        fields = '__all__'


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'

class AboutPageSerializer(serializers.ModelSerializer):
    class Meta: model = AboutPage; fields = '__all__'

class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = '__all__'
    

class ContactPageSerializer(serializers.ModelSerializer):
    class Meta: 
        model = ContactPage; 
        fields = '__all__'

class ContactInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInfo
        fields = '__all__'