from django.db import models
from django.db.models import Sum
from django.utils import timezone

from django.contrib.auth.models import User
from django.contrib.auth import get_user_model

from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
import uuid
from django.conf import settings

# Create your models here.
User = get_user_model()

class OTP(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='otp')
    otp = models.IntegerField()
    is_valid = models.BooleanField()
    expires_at = models.DateTimeField()


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

# User
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    profile_pic = models.ImageField(upload_to='profile_pics/', blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    # Signal to create/update Profile automatically when User is created/updated
    @receiver(post_save, sender=User)
    def create_user_profile(sender, instance, created, **kwargs):
        if created:
            UserProfile.objects.create(user=instance)

    @receiver(post_save, sender=User)
    def save_user_profile(sender, instance, **kwargs):
        try:
            instance.profile.save()
        except:
            UserProfile.objects.create(user=instance)

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# PRODUCT
class Product(models.Model):
    product_name = models.CharField(max_length=100)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    track_stock = models.BooleanField(default=False)
    stock_quantity = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)
    date_added = models.DateTimeField(default=timezone.now)
    image = models.ImageField(upload_to="product_images/", null=True, blank=True)

    def __str__(self):
        return self.product_name

class CouponCriteria(models.Model):
    DISCOUNT_TYPES = [
        ('percentage', 'Percentage Off'),
        ('fixed', 'Fixed Amount Off'),
        ('free_item', 'Free Item (Buy X Get Y)'),
    ]

    name = models.CharField(max_length=100, help_text="Internal name like 'Summer Sale 20%'")
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES, default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Percentage or Fixed Amount")
    
    min_spend = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_quantity = models.PositiveIntegerField(default=0, help_text="Min total items in cart or min items of specific category")
    
    target_category = models.CharField(max_length=50, blank=True, null=True, help_text="If set, applies only to this category")
    is_new_user_only = models.BooleanField(default=False)
    
    free_product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='criteria_free_product')
    target_product = models.ForeignKey(
        'Product', 
        on_delete=models.SET_NULL,
        null=True, 
        blank=True, 
        related_name='targeted_coupons',
        help_text="If set, the discount applies ONLY to this product, not the total bill."
    )

    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name

# COUPON
class Coupon(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        CLAIMED = 'Claimed', 'Claimed' 
        REDEEMED = 'Redeemed', 'Redeemed'
        EXPIRED = 'Expired', 'Expired'

    code = models.CharField(max_length=50, unique=True)
    criteria = models.ForeignKey(CouponCriteria, on_delete=models.SET_NULL, related_name='coupons', null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    
    usage_limit = models.PositiveIntegerField(null=True, blank=True, help_text="Total times this code can be claimed")
    times_used = models.PositiveIntegerField(default=0)

    # Track who has CLAIMED it (Wallet)
    claimed_by = models.ManyToManyField(User, blank=True, related_name='claimed_coupons')
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        criteria_name = self.criteria.name if self.criteria else "Legacy Coupon"
        return f"{self.code} - {criteria_name}"

    def save(self, *args, **kwargs):
        # 1. CHECK EXPIRATION FIRST
        # If an expiration date exists and has passed, force status to EXPIRED
        if self.criteria and self.criteria.valid_to and self.criteria.valid_to < timezone.now():
            self.status = self.Status.EXPIRED
            
        # 2. CHECK USAGE LIMIT (Only if not already expired)
        elif self.usage_limit is not None and self.times_used >= self.usage_limit:
            self.status = self.Status.REDEEMED
            
        # 3. RE-ACTIVATE (If limit opens up and not expired)
        elif self.usage_limit is not None and self.times_used < self.usage_limit and self.status == self.Status.REDEEMED:
             # Ensure we don't accidentally reactivate an expired coupon
            if not (self.criteria and self.criteria.valid_to and self.criteria.valid_to < timezone.now()):
                self.status = self.Status.ACTIVE
            
        super().save(*args, **kwargs)

# RECEIPT 
class Receipt(models.Model):
    class Status(models.TextChoices):
        COMPLETED = 'COMPLETED', 'Completed'
        VOIDED = 'VOIDED', 'Voided'

    coupons = models.ManyToManyField(Coupon, blank=True, related_name='receipts')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    vat = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    cash_given = models.DecimalField(max_digits=10, decimal_places=2)
    change = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(default=timezone.now)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    void_reason = models.TextField(null=True, blank=True)
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(User, related_name='voided_receipts', on_delete=models.SET_NULL, null=True, blank=True)

    # Staff who processed it
    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_receipts')

    # [NEW] Customer who bought it (Allows us to check "Used" status in Wallet)
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_receipts')

    def __str__(self):
        return f"Receipt #{self.id} - {self.status}"   
    
class ReceiptItem(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True, related_name="applied_items")
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    product_name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    @property
    def subtotal(self):
        return self.price * self.quantity

    def __str__(self):
        return f"{self.quantity} × {self.product_name}"

class DailySalesReport(models.Model):
    report_date = models.DateField(unique=True)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    net_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_orders = models.PositiveIntegerField(default=0)
    voided_orders = models.PositiveIntegerField(default=0)
    top_selling_product = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Report: {self.report_date} | Profit: {self.net_profit}"

    def generate_report(self):
        receipts = Receipt.objects.filter(created_at__date=self.report_date)
        completed_receipts = receipts.filter(status=Receipt.Status.COMPLETED)
        self.total_revenue = completed_receipts.aggregate(Sum('total'))['total__sum'] or 0.00
        self.total_orders = completed_receipts.count()
        self.voided_orders = receipts.filter(status=Receipt.Status.VOIDED).count()

        total_cost_accumulated = 0
        items_sold = ReceiptItem.objects.filter(receipt__in=completed_receipts)

        for item in items_sold:
            if item.product and hasattr(item.product, 'costing'):
                cost_per_unit = item.product.costing.total_cost()
                total_cost_accumulated += (cost_per_unit * item.quantity)
        
        self.total_cost = total_cost_accumulated
        self.net_profit = float(self.total_revenue) - float(self.total_cost)

        top_item = items_sold.values('product_name').annotate(
            total_qty=Sum('quantity')
        ).order_by('-total_qty').first()

        if top_item:
            self.top_selling_product = top_item['product_name']

        self.save()

    @receiver(post_save, sender=Receipt)
    def update_sales_report(sender, instance, created, **kwargs):
        if instance.created_at:
            date = instance.created_at.date()
            report, _ = DailySalesReport.objects.get_or_create(report_date=date)
            report.generate_report()

class Review(models.Model):
    REVIEW_TYPES = [
        ('shop', 'Shop Review'),
        ('food', 'Food Review'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    review_type = models.CharField(max_length=10, choices=REVIEW_TYPES, default='shop')
    
    # Optional: If it's a food review, link it to a product
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviews')
    
    rating = models.IntegerField()
    comment = models.TextField()
    image = models.ImageField(upload_to='review_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.rating} stars ({self.review_type})"

class Feedback(models.Model):
    message = models.TextField()
    date_submitted = models.DateTimeField(default=timezone.now)
    def __str__(self): return f"Feedback #{self.id}"

class HomePage(models.Model):
    # Hero Section
    line1_start = models.CharField(max_length=100, default="SAVOR THE TASTE OF")
    line1_highlight = models.CharField(max_length=100, default="LOVE")
    line1_end = models.CharField(max_length=100, default="AND TRADITION")
    
    line2_start = models.CharField(max_length=100, default="IN EVERY")
    line2_highlight = models.CharField(max_length=100, default="BITE")
    
    # Description
    description_start = models.CharField(max_length=100, default="At")
    brand_name = models.CharField(max_length=100, default="Kuya Vince Karinderya")
    description_middle = models.CharField(max_length=100, default=", we take pride in serving the best")
    cuisine_type = models.CharField(max_length=100, default="Pinoy bayan cuisine")
    description_end = models.TextField(default="— flavorful, hearty, and made just like how")
    lola_text = models.CharField(max_length=50, default="lola")
    description_final = models.CharField(max_length=100, default="used to cook.")

    def __str__(self): return "Home Page Content"

class ServicesPage(models.Model):
    # Header
    title_prefix = models.CharField(max_length=50, default="OUR")
    title_highlight = models.CharField(max_length=50, default="SERVICES")
    description = models.TextField(default="At Kuya Vince Karinderya, we extend our warm Filipino hospitality...")

    # Service 1
    s1_title = models.CharField(max_length=50, default="DAILY")
    s1_subtitle = models.CharField(max_length=50, default="SPECIALS")
    s1_desc = models.TextField(default="Freshly cooked meals prepared daily.")

    # Service 2
    s2_title = models.CharField(max_length=50, default="AFFORDABLE")
    s2_subtitle = models.CharField(max_length=50, default="MEAL PLANS")
    s2_desc = models.TextField(default="Budget-friendly meal packages.")
    
    def __str__(self): return "Services Page Content"

class AboutPage(models.Model):
    # Header
    line1 = models.CharField(max_length=100, default="WE'RE MORE")
    line1_highlight = models.CharField(max_length=50, default="THAN")
    line1_end = models.CharField(max_length=50, default="JUST A")
    line1_highlight2 = models.CharField(max_length=100, default="PLACE TO EAT,")
    
    line2 = models.CharField(max_length=50, default="WE'RE A")
    line2_highlight = models.CharField(max_length=50, default="TASTE")
    line2_end = models.CharField(max_length=50, default="OF")
    line2_highlight2 = models.CharField(max_length=50, default="HOME.")

    # Story
    story_title = models.CharField(max_length=100, default="Our Story")
    story_p1 = models.TextField(default="Inspired by the warmth...")
    story_p2 = models.TextField(default="Our journey started...")
    footer_text = models.CharField(max_length=100, default="Masarap, malasakit, tulad ng pamilya!")

    def __str__(self): return "About Page Content"

class ContactPage(models.Model):
    header_highlight = models.CharField(max_length=50, default="CONTACT")
    header_suffix = models.CharField(max_length=50, default="US")
    subtitle = models.CharField(max_length=200, default="We’d love to hear from you!")
    
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.CharField(max_length=200)
    fb_page = models.CharField(max_length=200)
    fb_label = models.CharField(max_length=100, default="Kuya Vince Karinderya")

    def __str__(self): return "Contact Page Content"