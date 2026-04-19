from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
import re

from .models import Product, Category, Receipt, ReceiptItem, Coupon, Feedback, HomePage, ServicesPage, AboutPage, ContactPage, CouponCriteria, Review, UserProfile, OTP, Notification, StaffInvitationToken, EmailVerificationToken, ProfitLog, DrawerBalanceLog


def _normalize_gcash_reference(value):
    if value is None:
        return ''
    return re.sub(r'[^A-Za-z0-9]', '', str(value)).upper()


PH_VAT_INCLUSIVE_DIVISOR = Decimal('1.12')
MONEY_PRECISION = Decimal('0.01')


def _compute_ph_vat_from_vat_inclusive_total(vat_inclusive_total):
    total = Decimal(str(vat_inclusive_total or '0'))
    if total <= 0:
        return Decimal('0.00')

    vat_amount = total - (total / PH_VAT_INCLUSIVE_DIVISOR)
    return vat_amount.quantize(MONEY_PRECISION, rounding=ROUND_HALF_UP)

class UserSerializer(serializers.ModelSerializer):
    # [NEW] Map fields from the Profile relationship
    middle_name = serializers.CharField(source='profile.middle_name', required=False, allow_blank=True)
    phone = serializers.CharField(source='profile.phone', required=False, allow_blank=True)
    address = serializers.CharField(source='profile.address', required=False, allow_blank=True)
    profile_pic = serializers.ImageField(source='profile.profile_pic', required=False, allow_null=True)
    has_completed_transaction = serializers.SerializerMethodField(read_only=True)
    role = serializers.SerializerMethodField(read_only=True)
    account_status = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "middle_name", "phone", "address", "profile_pic", "password", "is_superuser", "is_staff", "is_active", "has_completed_transaction", "role", "account_status"]
        extra_kwargs = {"password": {"write_only": True},
                        "is_superuser": {"read_only": True}}

    def _pending_invitation_user_ids(self):
        if not hasattr(self, '_pending_invitation_user_ids_cache'):
            invitation_expiry_minutes = max(1, int(getattr(settings, 'STAFF_INVITATION_EXPIRY_MINUTES', 15)))
            invitation_cutoff = timezone.now() - timedelta(minutes=invitation_expiry_minutes)
            self._pending_invitation_user_ids_cache = set(
                StaffInvitationToken.objects.filter(
                    is_valid=True,
                    created_at__gte=invitation_cutoff,
                ).values_list('user_id', flat=True)
            )
        return self._pending_invitation_user_ids_cache

    def _pending_email_verification_user_ids(self):
        if not hasattr(self, '_pending_email_verification_user_ids_cache'):
            self._pending_email_verification_user_ids_cache = set(
                EmailVerificationToken.objects.filter(
                    is_valid=True,
                    expires_at__gte=timezone.now(),
                ).values_list('user_id', flat=True)
            )
        return self._pending_email_verification_user_ids_cache

    def get_has_completed_transaction(self, obj):
        # Check if the user has any receipt where they are the customer and status is completed
        # Excluding voided ones, assuming status=COMPLETED is what we count
        return obj.customer_receipts.filter(status__iexact=Receipt.Status.COMPLETED).exists()

    def get_role(self, obj):
        if obj.is_staff and obj.is_superuser:
            return "admin"
        if obj.is_staff:
            return "staff"
        return "user"

    def get_account_status(self, obj):
        if obj.is_active:
            return "Active"

        if obj.is_staff and obj.id in self._pending_invitation_user_ids():
            return "Pending"

        if not obj.is_staff and obj.id in self._pending_email_verification_user_ids():
            return "Pending"

        return "Deactivated"

    def validate_email(self, value):
        if value:
            # Case-insensitive check to see if email exists
            qs = User.objects.filter(email__iexact=value)
            
            # If we are updating an existing user, exclude them from the check
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
                
            if qs.exists():
                raise serializers.ValidationError("A user with this email address already exists.")
        return value

    def validate_password(self, value):
        if value is None or value == "":
            return value

        user = self.instance
        if user is None:
            user = User(
                username=self.initial_data.get("username", ""),
                email=self.initial_data.get("email", ""),
                first_name=self.initial_data.get("first_name", ""),
                last_name=self.initial_data.get("last_name", ""),
            )

        validate_password(value, user=user)
        return value

    def create(self, validated_data):
        # Extract profile data from the validated data
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password')
        
        # Create User
        user = User.objects.create_user(password=password, **validated_data)
        
        # Update the automatically created profile with extra data
        if profile_data:
            for attr, value in profile_data.items():
                setattr(user.profile, attr, value)
            user.profile.save()
            
        return user

    def update(self, instance, validated_data):
        # Handle profile update
        profile_data = validated_data.pop('profile', {})
        raw_password = validated_data.pop('password', None)
        previous_is_active = instance.is_active
        
        # Update standard User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if raw_password not in (None, ""):
            instance.set_password(raw_password)

        instance.save()

        profile = getattr(instance, 'profile', None)
        if profile is None:
            profile, _ = UserProfile.objects.get_or_create(user=instance)

        profile_dirty = False

        # Update Profile fields
        if profile_data:
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile_dirty = True

        # Keep account lifecycle metadata in sync with is_active changes.
        if 'is_active' in validated_data and previous_is_active != instance.is_active:
            if instance.is_active:
                if profile.deactivated_at is not None:
                    profile.deactivated_at = None
                    profile_dirty = True
            else:
                profile.deactivated_at = timezone.now()
                profile_dirty = True
                StaffInvitationToken.objects.filter(user=instance, is_valid=True).update(is_valid=False)

        if profile_dirty:
            profile.save()
            
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
        slug_field='name',
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Product
        fields = '__all__'
        extra_kwargs = {'date_added': {'read_only': True}}

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        if 'stock_quantity' in attrs:
            stock_quantity = attrs.get('stock_quantity')
        elif instance is not None:
            stock_quantity = instance.stock_quantity
        else:
            stock_quantity = 0

        if 'is_archived' in attrs:
            is_archived = attrs.get('is_archived')
        elif instance is not None:
            is_archived = instance.is_archived
        else:
            is_archived = False

        attrs['track_stock'] = True
        attrs['is_available'] = (stock_quantity > 0) and (not is_archived)
        return attrs

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

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        discount_type = attrs.get('discount_type', getattr(instance, 'discount_type', None))
        max_discount_amount = attrs.get('max_discount_amount', getattr(instance, 'max_discount_amount', None))

        if max_discount_amount is not None and Decimal(str(max_discount_amount)) <= 0:
            raise serializers.ValidationError({
                'max_discount_amount': 'Maximum discount amount must be greater than 0.'
            })

        # Caps only apply to percentage-based discounts.
        if discount_type != 'percentage':
            attrs['max_discount_amount'] = None

        return attrs

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
    times_claimed = serializers.SerializerMethodField() # NEW FIELD

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'status', 'target_audience', 'min_completed_orders', 'usage_limit', 'claim_limit', 'times_used', 'times_claimed',
            'created_at', 'is_archived', 'archived_at', 'criteria_details', 'criteria_id',
            'name', 'product_name', 'rate', 'description', 
            'is_used'
        ]
        read_only_fields = ['is_archived', 'archived_at']

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)

        target_audience = attrs.get('target_audience', getattr(instance, 'target_audience', Coupon.TargetAudience.ALL_USERS))
        min_completed_orders = attrs.get('min_completed_orders', getattr(instance, 'min_completed_orders', 0) or 0)

        if target_audience == Coupon.TargetAudience.FREQUENT_CUSTOMERS and int(min_completed_orders) < 1:
            raise serializers.ValidationError({
                'min_completed_orders': 'Minimum completed orders must be at least 1 for frequent-customer targeting.'
            })

        if target_audience != Coupon.TargetAudience.FREQUENT_CUSTOMERS:
            attrs['min_completed_orders'] = 0

        return attrs

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
        if not obj.criteria:
            return "0"
        c = obj.criteria
        if c.discount_type == 'percentage':
            # Strip trailing zeros: 15.00 → "15%", 7.50 → "7.5%"
            val = f"{c.discount_value:g}"
            return f"{val}%"
        elif c.discount_type == 'fixed':
            val = f"{c.discount_value:g}"
            return f"₱{val}"
        elif c.discount_type == 'free_item':
            return "FREE"
        return str(c.discount_value)

    def get_product_name(self, obj):
        if not obj.criteria: return "General Discount"
        if obj.criteria.target_product: return obj.criteria.target_product.product_name
        if obj.criteria.free_product: return f"Free {obj.criteria.free_product.product_name}"
        if obj.criteria.target_category: return f"{obj.criteria.target_category} Special"
        return "Discount on any order"

    def get_description(self, obj):
        if not obj.criteria: return "Special exclusive discount."
        c = obj.criteria

        min_spend = float(c.min_spend) if c.min_spend else 0
        target = c.target_product.product_name if c.target_product else None
        category = c.target_category if c.target_category else None
        free = c.free_product.product_name if c.free_product else None

        if c.discount_type == 'percentage':
            cap_suffix = ""
            if c.max_discount_amount and c.max_discount_amount > 0:
                cap_suffix = f" (up to ₱{c.max_discount_amount:g})"
            val = f"{c.discount_value:g}%{cap_suffix}"
            if target and min_spend > 0:
                return f"Spend at least ₱{min_spend:g} and get {val} OFF on {target}."
            elif target:
                return f"Get {val} OFF on {target}."
            elif category and min_spend > 0:
                return f"Spend at least ₱{min_spend:g} on {category} items and get {val} OFF."
            elif category:
                return f"Get {val} OFF on {category} items."
            elif min_spend > 0:
                return f"Spend at least ₱{min_spend:g} and get {val} OFF your order."
            return f"Get {val} OFF on selected items."

        elif c.discount_type == 'fixed':
            val = f"₱{c.discount_value:g}"
            if target and min_spend > 0:
                return f"Spend at least ₱{min_spend:g} and save {val} on {target}."
            elif target:
                return f"Save {val} on {target}."
            elif category and min_spend > 0:
                return f"Spend at least ₱{min_spend:g} on {category} items and save {val}."
            elif category:
                return f"Save {val} on {category} items."
            elif min_spend > 0:
                return f"Spend at least ₱{min_spend:g} and save {val} on your order."
            return f"Save {val} on your order."

        elif c.discount_type == 'free_item':
            prod = free or "item"
            if min_spend > 0:
                return f"Spend at least ₱{min_spend:g} and get a free {prod}!"
            return f"Get a free {prod} with your order!"

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
                status__iexact=Receipt.Status.COMPLETED,
            ).exists()
        return False
    
    def get_times_claimed(self, obj):
        return max(obj.times_claimed, obj.claimed_by.count())

class ReceiptItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField() 

    class Meta:
        model = ReceiptItem
        fields = ['id', 'product', 'product_name', 'price', 'quantity', 'subtotal', 'coupon',]

class ReceiptSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(many=True)
    cashier_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_first_name = serializers.SerializerMethodField()
    customer_last_name = serializers.SerializerMethodField()
    
    # FIX: Changed to accept multiple IDs (many=True)
    coupons = serializers.PrimaryKeyRelatedField(
        queryset=Coupon.objects.filter(is_archived=False), 
        many=True,      # <--- Allow list
        required=False, 
        write_only=True
    )
    coupon_codes = serializers.DictField(
        child=serializers.CharField(allow_blank=True),
        required=False,
        write_only=True,
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
            'coupon_codes',
            'coupon_details',
            'payment_method',
            'payment_status',
            'paid_at',
            'provider_payment_id',
            'provider_reference',
            'status',
            'void_reason',
            'cashier_name',
            'customer_name',
            'customer_first_name',
            'customer_last_name'
        ]
        read_only_fields = ['payment_status', 'paid_at', 'provider_payment_id']

    def get_cashier_name(self, obj):
        return obj.cashier.username if obj.cashier else "Unknown"

    def get_customer_name(self, obj):
        if not obj.customer:
            return "Walk-in"

        full_name = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full_name or obj.customer.username

    def get_customer_first_name(self, obj):
        if not obj.customer:
            return ""
        return obj.customer.first_name or ""

    def get_customer_last_name(self, obj):
        if not obj.customer:
            return ""
        return obj.customer.last_name or ""

    def validate_provider_reference(self, value):
        if value in [None, '']:
            return value

        normalized_value = _normalize_gcash_reference(value)
        if len(normalized_value) < 8:
            raise serializers.ValidationError('GCash reference number must be at least 8 alphanumeric characters.')

        existing_refs = Receipt.objects.exclude(provider_reference__isnull=True).exclude(provider_reference='')
        if self.instance:
            existing_refs = existing_refs.exclude(id=self.instance.id)

        for existing_ref in existing_refs.values_list('provider_reference', flat=True).iterator():
            if _normalize_gcash_reference(existing_ref) == normalized_value:
                raise serializers.ValidationError('This GCash reference number has already been used in a previous transaction.')

        return normalized_value

    def create(self, validated_data):
        items_data = validated_data.pop("items") 
        coupons_data = validated_data.pop("coupons", []) # Extract list
        validated_data.pop("coupon_codes", None)

        computed_subtotal = sum(
            (Decimal(str(item_data.get("price", 0))) * Decimal(str(item_data.get("quantity", 0))))
            for item_data in items_data
        )
        computed_subtotal = computed_subtotal.quantize(MONEY_PRECISION, rounding=ROUND_HALF_UP)

        raw_discount_type = str(self.initial_data.get("discount_type", "")).strip().lower()
        is_vat_exempt_sale = raw_discount_type in {"senior", "pwd"}

        sale_total = Decimal(str(validated_data.get("total") or "0"))
        validated_data["subtotal"] = computed_subtotal
        validated_data["vat"] = Decimal("0.00") if is_vat_exempt_sale else _compute_ph_vat_from_vat_inclusive_total(sale_total)

        requested_per_product = {}
        for item_data in items_data:
            product = item_data.get("product")
            quantity = item_data.get("quantity", 0)
            if product is None:
                continue
            product_id = product.id
            requested_per_product[product_id] = requested_per_product.get(product_id, 0) + quantity

        with transaction.atomic():  
            if requested_per_product:
                locked_products = {
                    product.id: product
                    for product in Product.objects.select_for_update().filter(id__in=requested_per_product.keys())
                }

                for product_id, requested_qty in requested_per_product.items():
                    product = locked_products.get(product_id)
                    if not product:
                        raise serializers.ValidationError({"error": f"Product {product_id} not found."})
                    if requested_qty > product.stock_quantity:
                        raise serializers.ValidationError({
                            "error": f"Not enough servings for {product.product_name}. Only {product.stock_quantity} left."
                        })

            # Note: cashier and customer are added in ViewSet
            receipt = Receipt.objects.create(**validated_data)

            # Set Many-to-Many relationship
            if coupons_data:
                receipt.coupons.set(coupons_data)

            items_to_create = []
            for item_data in items_data:
                items_to_create.append(ReceiptItem(receipt=receipt, **item_data))
            
            ReceiptItem.objects.bulk_create(items_to_create)

            for product_id, requested_qty in requested_per_product.items():
                Product.objects.filter(id=product_id).update(
                    stock_quantity=F('stock_quantity') - requested_qty
                )

            Product.objects.filter(
                id__in=requested_per_product.keys(),
                stock_quantity=0
            ).update(is_available=False)

            Product.objects.filter(
                id__in=requested_per_product.keys(),
                stock_quantity__gt=0
            ).update(is_available=True)

        return receipt

class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    phone = serializers.CharField(source='user.profile.phone', read_only=True)
    address = serializers.CharField(source='user.profile.address', read_only=True)
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    product_category = serializers.CharField(source='product.category.name', read_only=True)
    profile_pic = serializers.SerializerMethodField(read_only=True)
    admin_reply = serializers.CharField(read_only=True)
    admin_reply_updated_at = serializers.DateTimeField(read_only=True)

    # ── Profanity word list ───────────────────────────────────────────────────
    # Words are matched case-insensitively as whole words.
    # Add or remove entries as needed.
    PROFANITY_LIST = [
        # English
        'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fucks',
        'shit', 'shitty', 'shits', 'bullshit',
        'ass', 'asshole', 'assholes',
        'bitch', 'bitches', 'bitching',
        'damn', 'damned', 'dammit',
        'dick', 'dicks',
        'bastard', 'bastards',
        'crap', 'crappy',
        'cunt', 'cunts',
        'piss', 'pissed',
        'whore', 'whores',
        'slut', 'sluts',
        'cock', 'cocks',
        'wtf', 'stfu', 'lmfao',
        'motherfucker', 'motherfuckers', 'motherfucking',
        'retard', 'retarded',
        'idiot', 'idiots',
        'stupid',
        'dumbass', 'dumbasses',
        'nigga', 'niggas', 'nigger', 'niggers',
        # Filipino / Tagalog
        'putangina', 'putang ina', 'tangina', 'tang ina',
        'gago', 'gaga',
        'bobo', 'boba',
        'tanga', 'tangang',
        'ulol', 'olol',
        'tarantado', 'tarantada',
        'leche', 'letse', 'lintik',
        'punyeta', 'pakshet', 'pakyu',
        'kupal',
        'hinayupak', 'hayop ka',
        'peste',
        'siraulo',
        'bwisit',
        'animal ka',
        'kingina', 'kinginamo',
    ]

    class Meta:
        model = Review
        fields = [
            'id', 'user', 'username', 
            'email', 'first_name', 'last_name', 'phone', 'address', # <--- Add them to fields
            'profile_pic', 'review_type', 
            'product', 'product_name', 'product_category',
            'rating', 'comment', 'image', 'admin_reply', 'admin_reply_updated_at', 'created_at'
        ]
        read_only_fields = ['user', 'admin_reply', 'admin_reply_updated_at', 'created_at']

    # ── Profanity filter applied during validation ────────────────────────────
    @staticmethod
    def _censor_word(match):
        """Replace the matched word with asterisks of the same length."""
        return '*' * len(match.group())

    def validate_comment(self, value):
        """Auto-censor profane words in the comment before saving."""
        import re
        for word in self.PROFANITY_LIST:
            # \b ensures whole-word matching; re.IGNORECASE handles any casing
            pattern = r'\b' + re.escape(word) + r'\b'
            value = re.sub(pattern, self._censor_word, value, flags=re.IGNORECASE)
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def get_profile_pic(self, obj):
        """Return the reviewer's profile picture URL, if set."""
        try:
            pic = obj.user.profile.profile_pic
            if pic:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(pic.url)
                return pic.url
        except Exception:
            pass
        return None
    
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class StaffPerformanceSerializer(serializers.Serializer):
    name = serializers.CharField(read_only=True)
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    orders = serializers.IntegerField(read_only=True)


class ProfitLogSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField(read_only=True)
    period_label = serializers.CharField(source='get_period_display', read_only=True)

    class Meta:
        model = ProfitLog
        fields = [
            'id',
            'created_by',
            'created_by_name',
            'period',
            'period_label',
            'revenue',
            'expenses',
            'net_profit',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'period_label', 'net_profit', 'created_at']

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return 'Deleted user'

        first_name = (obj.created_by.first_name or '').strip()
        last_name = (obj.created_by.last_name or '').strip()
        full_name = f"{first_name} {last_name}".strip()
        return full_name or obj.created_by.username

    def validate(self, attrs):
        revenue = attrs.get('revenue', Decimal('0'))
        expenses = attrs.get('expenses', Decimal('0'))

        if revenue < 0:
            raise serializers.ValidationError({'revenue': 'Revenue cannot be negative.'})

        if expenses < 0:
            raise serializers.ValidationError({'expenses': 'Expenses cannot be negative.'})

        return attrs

    def create(self, validated_data):
        revenue = Decimal(str(validated_data.get('revenue', 0)))
        expenses = Decimal(str(validated_data.get('expenses', 0)))
        validated_data['net_profit'] = revenue - expenses
        return super().create(validated_data)


class DrawerBalanceLogSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DrawerBalanceLog
        fields = [
            'id',
            'created_by',
            'created_by_name',
            'opening_balance',
            'today_sales_total',
            'projected_total',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'projected_total', 'created_at']

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return 'Deleted user'

        first_name = (obj.created_by.first_name or '').strip()
        last_name = (obj.created_by.last_name or '').strip()
        full_name = f"{first_name} {last_name}".strip()
        return full_name or obj.created_by.username

    def validate(self, attrs):
        opening_balance = attrs.get('opening_balance', Decimal('0'))
        today_sales_total = attrs.get('today_sales_total', Decimal('0'))

        if opening_balance < 0:
            raise serializers.ValidationError({'opening_balance': 'Opening balance cannot be negative.'})

        if today_sales_total < 0:
            raise serializers.ValidationError({'today_sales_total': 'Today sales total cannot be negative.'})

        return attrs

    def create(self, validated_data):
        opening_balance = Decimal(str(validated_data.get('opening_balance', 0)))
        today_sales_total = Decimal(str(validated_data.get('today_sales_total', 0)))
        validated_data['projected_total'] = opening_balance + today_sales_total
        return super().create(validated_data)

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