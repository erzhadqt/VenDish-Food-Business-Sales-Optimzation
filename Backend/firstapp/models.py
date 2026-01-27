from django.db import models
from django.db.models import Sum
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
import uuid
from django.conf import settings

# PRODUCT
class Product(models.Model):
    CATEGORY_CHOICES = [
        ('chicken', 'Chicken'),
        ('beef', 'Beef'),
        ('fish', 'Fish'),
        ('vegetables', 'Vegetables'),
        ('combo_meal', 'Combo Meal'),
        ('value_meal', 'Value Meal'),
        ('add_on', 'Add-on'),
        ('others', 'Others'),
    ]
    product_name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
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
        # FIX: Updated logic for Static Limit
        # If usage limit is set and times_used meets/exceeds it, mark as REDEEMED (Sold Out)
        if self.usage_limit is not None and self.times_used >= self.usage_limit:
            self.status = self.Status.REDEEMED
        # If space frees up (e.g. voided receipt), and it was REDEEMED, open it back up
        elif self.usage_limit is not None and self.times_used < self.usage_limit and self.status == self.Status.REDEEMED:
            self.status = self.Status.ACTIVE
            
        super().save(*args, **kwargs)

# RECEIPT 
class Receipt(models.Model):
    class Status(models.TextChoices):
        COMPLETED = 'COMPLETED', 'Completed'
        VOIDED = 'VOIDED', 'Voided'

    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, null=True, blank=True, related_name='receipt')
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

# ... [Rest of models (DailySalesReport, Feedback, etc) stay the same] ...
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

class Feedback(models.Model):
    message = models.TextField()
    date_submitted = models.DateTimeField(default=timezone.now)
    def __str__(self): return f"Feedback #{self.id}"

class HomePage(models.Model):
    dishes = models.CharField(max_length=50)
    banner_image = models.ImageField(upload_to="homepage/")
    def __str__(self): return "Home Page Content"

class AboutPage(models.Model):
    story = models.TextField(blank=True)
    subtitle = models.TextField(blank=True)
    message = models.ForeignKey(Feedback, on_delete=models.SET_NULL, null=True, blank=True, related_name="about_messages")
    def __str__(self): return "About Page Content"

class ContactPage(models.Model):
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.CharField(max_length=100)
    fb_page = models.CharField(max_length=100)
    def __str__(self): return "Contact Page Content"