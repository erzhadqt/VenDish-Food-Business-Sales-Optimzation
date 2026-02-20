from django.contrib.auth.models import User
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone

from .models import Product, Category, Receipt, ReceiptItem, Coupon, Feedback, HomePage, ServicesPage, AboutPage, ContactPage, DailySalesReport, CouponCriteria, Review, UserProfile, OTP

class UserSerializer(serializers.ModelSerializer):
    # [NEW] Map fields from the Profile relationship
    middle_name = serializers.CharField(source='profile.middle_name', required=False, allow_blank=True)
    phone = serializers.CharField(source='profile.phone', required=False, allow_blank=True)
    address = serializers.CharField(source='profile.address', required=False, allow_blank=True)
    # profile_pic = serializers.ImageField(source='profile.profile_pic', required=False)

    class Meta:
        model = User
        # [UPDATED] Add 'middle_name' to fields
        fields = ["id", "username", "email", "first_name", "last_name", "middle_name", "phone", "address", "password", "is_superuser", "is_staff"]
        extra_kwargs = {"password": {"write_only": True},
                        "is_superuser": {"read_only": True}}

    def create(self, validated_data):
        # Extract profile data from the validated data
        profile_data = validated_data.pop('profile', {})
        
        # Create User
        user = User.objects.create_user(**validated_data)
        
        # Update the automatically created profile with extra data
        if profile_data:
            for attr, value in profile_data.items():
                setattr(user.profile, attr, value)
            user.profile.save()
            
        return user

    def update(self, instance, validated_data):
        # Handle profile update
        profile_data = validated_data.pop('profile', {})
        
        # Update standard User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update Profile fields
        if profile_data:
            for attr, value in profile_data.items():
                setattr(instance.profile, attr, value)
            instance.profile.save()
            
        return instance
    
class OTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTP
        fields = ['id', 'user', 'otp', 'is_valid']
        read_only_fields = fields

class ProductSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False)

    category = serializers.SlugRelatedField(
        queryset=Category.objects.all(),
        slug_field='name'
    )
    
    class Meta:
        model = Product
        fields = '__all__'
        extra_kwargs = {'date_added': {'read_only': True}}

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'created_at']

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
    
    # Check if current user has used this coupon
    is_used = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'status', 'usage_limit', 'times_used', 
            'created_at', 'criteria_details', 'criteria_id',
            'name', 'product_name', 'rate', 'description', 
            'is_used'
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # If the valid_to date has passed, force the status to 'Expired' in the API response
        # This ensures the frontend sees it immediately even if the DB record hasn't been saved recently.
        if instance.criteria and instance.criteria.valid_to and instance.criteria.valid_to < timezone.now():
            data['status'] = 'Expired'
            
        return data
    
    def get_name(self, obj):
        return obj.criteria.name if obj.criteria else "Promo Code"

    def get_rate(self, obj):
        return obj.criteria.discount_value if obj.criteria else 0

    def get_product_name(self, obj):
        if not obj.criteria: return "General Discount"
        if obj.criteria.target_product: return obj.criteria.target_product.product_name
        if obj.criteria.free_product: return f"Free {obj.criteria.free_product.product_name}"
        if obj.criteria.target_category: return f"{obj.criteria.target_category} Special"
        return "SWAKNASWAK"

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
        FIX: Updated 'coupon' to 'coupons' to match ManyToManyField
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Receipt.objects.filter(
                coupons=obj,  # <--- CHANGED from 'coupon' to 'coupons'
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
    cashier_name = serializers.SerializerMethodField()
    
    # FIX: Changed to accept multiple IDs (many=True)
    coupons = serializers.PrimaryKeyRelatedField(
        queryset=Coupon.objects.all(), 
        many=True,      # <--- Allow list
        required=False, 
        write_only=True
    )

    # FIX: Return details for list of coupons
    coupon_details = CouponSerializer(source='coupons', many=True, read_only=True)

    class Meta:
        model = Receipt
        fields = [
            'id', 'subtotal', 'vat', 'total', 
            'cash_given', 'change', 'created_at', 
            'items', 
            'coupons',          # <--- Renamed from coupon
            'coupon_details',
            'status',
            'void_reason',
            'cashier_name'
        ]

    def get_cashier_name(self, obj):
        return obj.cashier.username if obj.cashier else "Unknown"

    def create(self, validated_data):
        items_data = validated_data.pop("items") 
        coupons_data = validated_data.pop("coupons", []) # Extract list

        with transaction.atomic():  
            # Note: cashier and customer are added in ViewSet
            receipt = Receipt.objects.create(**validated_data)

            # Set Many-to-Many relationship
            if coupons_data:
                receipt.coupons.set(coupons_data)

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

class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    product_name = serializers.CharField(source='product.product_name', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'user', 'username', 'review_type', 
            'product', 'product_name', 
            'rating', 'comment', 'image', 'created_at'
        ]
        read_only_fields = ['user', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class StaffPerformanceSerializer(serializers.Serializer):
    name = serializers.CharField(read_only=True)
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    orders = serializers.IntegerField(read_only=True)

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta: model = Feedback; fields = '__all__'

class HomePageSerializer(serializers.ModelSerializer):
    class Meta: model = HomePage; fields = '__all__'

class ServicesPageSerializer(serializers.ModelSerializer):
    class Meta: model = ServicesPage; fields = '__all__'

class AboutPageSerializer(serializers.ModelSerializer):
    class Meta: model = AboutPage; fields = '__all__'

class ContactPageSerializer(serializers.ModelSerializer):
    class Meta: model = ContactPage; fields = '__all__'