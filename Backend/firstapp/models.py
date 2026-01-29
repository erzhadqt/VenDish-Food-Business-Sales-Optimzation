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
        if self.usage_limit is not None and self.usage_limit <= 0:
            self.status = self.Status.REDEEMED
        elif self.usage_limit is not None and self.usage_limit > 0 and self.status == self.Status.REDEEMED:
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
    """
    Content Management for Homepage

    """
    
    # Hero Section - Line 1
    hero_line1_start = models.CharField(
        max_length=100, 
        default="SAVOR THE TASTE OF",
        help_text="First part of headline line 1"
    )
    hero_line1_highlight = models.CharField(
        max_length=50, 
        default="LOVE",
        help_text="Highlighted (red) word in line 1"
    )
    hero_line1_end = models.CharField(
        max_length=100, 
        default="AND TRADITION",
        help_text="End part of headline line 1"
    )
    
    # Hero Section - Line 2
    hero_line2_start = models.CharField(
        max_length=100, 
        default="IN EVERY",
        help_text="First part of headline line 2"
    )
    hero_line2_highlight = models.CharField(
        max_length=50, 
        default="BITE",
        help_text="Highlighted (red) word in line 2"
    )
    
    # Description Content
    description_start = models.CharField(
        max_length=100, 
        default="At",
        help_text="Opening word of description"
    )
    brand_name = models.CharField(
        max_length=100, 
        default="Kuya Vince Karinderya",
        help_text="Brand name (shown in red)"
    )
    description_middle = models.TextField(
        default=", we take pride in serving the best",
        help_text="Middle section of description"
    )
    cuisine_type = models.CharField(
        max_length=100, 
        default="Pinoy bayan cuisine",
        help_text="Type of cuisine (shown in red)"
    )
    description_end = models.TextField(
        default="— flavorful, hearty, and made just like how",
        help_text="Description before lola text"
    )
    lola_text = models.CharField(
        max_length=50, 
        default="lola",
        help_text="Word 'lola' (shown in bold)"
    )
    description_final = models.TextField(
        default="used to cook.",
        help_text="Final part of description"
    )
    
    # Popular Dishes Section Title
    dishes = models.CharField(
        max_length=50, 
        default="POPULAR DISHES",
        help_text="Title for popular dishes section"
    )
    
    # Banner Image
    banner_image = models.ImageField(
        upload_to="homepage/", 
        null=True,
        blank=True,
        help_text="Homepage hero banner image (optional)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Home Page Content"
        verbose_name_plural = "Home Page Content"
    
    def __str__(self):
        return "Home Page Content"
    
    def save(self, *args, **kwargs):
        """Ensure only one HomePage instance exists"""
        if not self.pk and HomePage.objects.exists():
            existing = HomePage.objects.first()
            self.pk = existing.pk
        return super().save(*args, **kwargs)


class PopularDish(models.Model):
    """
    Popular dishes shown on homepage
    Client can add/edit/delete these dishes
    """
    name = models.CharField(
        max_length=100,
        help_text="Name of the popular dish"
    )
    image = models.ImageField(
        upload_to="popular_dishes/",
        null=True,
        blank=True,
        help_text="Image of the dish (optional)"
    )
    order = models.IntegerField(
        default=0,
        help_text="Display order (lower numbers appear first)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Show this dish on homepage"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'name']
        verbose_name = "Popular Dish"
        verbose_name_plural = "Popular Dishes"
    
    def __str__(self):
        return self.name


class HomePageImage(models.Model):
    """
    Additional images for homepage (carousel, features, etc.)
    """
    IMAGE_TYPES = [
        ('carousel', 'Carousel Image'),
        ('feature', 'Feature Image'),
        ('footer', 'Footer Image'),
        ('other', 'Other'),
    ]
    
    title = models.CharField(
        max_length=100,
        help_text="Title/description of this image"
    )
    image = models.ImageField(
        upload_to="homepage_images/",
        help_text="Upload image"
    )
    image_type = models.CharField(
        max_length=20,
        choices=IMAGE_TYPES,
        default='other',
        help_text="Where this image will be used"
    )
    order = models.IntegerField(
        default=0,
        help_text="Display order (for carousel/galleries)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Show this image on homepage"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['image_type', 'order', 'title']
        verbose_name = "Homepage Image"
        verbose_name_plural = "Homepage Images"
    
    def __str__(self):
        return f"{self.get_image_type_display()} - {self.title}"

class ServicesPage(models.Model):
    """
    Services page header content
    
    """
    title_prefix = models.CharField(
        max_length=50,
        default="OUR",
        help_text="Title prefix text"
    )
    title_highlight = models.CharField(
        max_length=50,
        default="SERVICES",
        help_text="Title highlight text (shown in red)"
    )
    description = models.TextField(
        default="At Kuya Vince Karinderya, we extend our warm Filipino hospitality through a wide variety of services designed to bring authentic Pinoy Bayan Cuisine to every occasion.",
        help_text="Services page description"
    )
    
    # Highlight Box fields (inline)
    highlight_title = models.CharField(
        max_length=200,
        default="AUTHENTIC FILIPINO DINING EXPERIENCE",
        help_text="Highlight box title"
    )
    highlight_description = models.TextField(
        default="Experience the warmth of Filipino hospitality and the rich flavors of traditional Pinoy Bayan Cuisine.",
        help_text="Highlight box description"
    )
    highlight_stats = models.JSONField(
        default=list,
        help_text="Stats as JSON array: [{'label': 'Dishes', 'value': '50+'}, ...]"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Services Page"
        verbose_name_plural = "Services Page"
    
    def __str__(self):
        return "Services Page Content"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and ServicesPage.objects.exists():
            raise ValueError('Only one ServicesPage instance is allowed')
        return super().save(*args, **kwargs)


class Service(models.Model):
    """
    Individual service cards
    """
    ICON_CHOICES = [
        ('Clock', 'Clock'),
        ('Heart', 'Heart'),
        ('Star', 'Star'),
        ('Utensils', 'Utensils'),
        ('Users', 'Users'),
        ('PartyPopper', 'PartyPopper'),
        ('Quote', 'Quote'),
    ]
    
    title = models.CharField(
        max_length=100,
        help_text="Service title (e.g., DAILY)"
    )
    subtitle = models.CharField(
        max_length=100,
        help_text="Service subtitle (e.g., SPECIALS)"
    )
    icon_name = models.CharField(
        max_length=50,
        choices=ICON_CHOICES,
        default='Clock',
        help_text="Icon to display"
    )
    description = models.TextField(
        help_text="Service description"
    )
    features = models.JSONField(
        default=list,
        help_text="List of features as JSON array: ['Feature 1', 'Feature 2', ...]"
    )
    featured = models.BooleanField(
        default=False,
        help_text="Mark as featured (red background)"
    )
    order = models.IntegerField(
        default=0,
        help_text="Display order (lower numbers first)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Show this service on the page"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'title']
        verbose_name = "Service"
        verbose_name_plural = "Services"
    
    def __str__(self):
        return f"{self.title} {self.subtitle}"
    
class AboutPage(models.Model):
    """
    About page content
    Only one instance should exist
    """
    # Header Section
    header_line1 = models.CharField(max_length=100, default="WE'RE MORE")
    header_line1_highlight = models.CharField(max_length=100, default="THAN")
    header_line1_end = models.CharField(max_length=100, default="JUST A")
    header_line1_highlight2 = models.CharField(max_length=100, default="PLACE TO EAT,")
    
    header_line2 = models.CharField(max_length=100, default="WE'RE A")
    header_line2_highlight = models.CharField(max_length=100, default="TASTE")
    header_line2_end = models.CharField(max_length=100, default="OF")
    header_line2_highlight2 = models.CharField(max_length=100, default="HOME.")
    
    # Core Values - stored as JSON
    values = models.JSONField(
        default=list,
        help_text="Array of values: [{'title': 'MALASAKIT', 'desc': '...', 'iconName': 'Heart'}, ...]"
    )
    
    # Story Section
    story_title = models.CharField(max_length=200, default="Our Story")
    story_p1 = models.TextField(default="Inspired by the warmth of Filipino karinderyas...")
    story_p2 = models.TextField(default="Our journey started with a simple mission...")
    story_footer = models.CharField(max_length=200, default="Masarap, malasakit, tulad ng pamilya!")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "About Page"
        verbose_name_plural = "About Page"
    
    def __str__(self):
        return "About Page Content"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and AboutPage.objects.exists():
            raise ValueError('Only one AboutPage instance is allowed')
        return super().save(*args, **kwargs)


class Testimonial(models.Model):
    """
    Individual testimonials
    """
    text = models.TextField(help_text="Testimonial content")
    author = models.CharField(max_length=100, help_text="Author name")
    role = models.CharField(max_length=100, help_text="Author role/title")
    order = models.IntegerField(default=0, help_text="Display order")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = "Testimonial"
        verbose_name_plural = "Testimonials"
    
    def __str__(self):
        return f"{self.author} - {self.text[:50]}..."
    

class ContactPage(models.Model):
    """
    Contact page header content
    Only one instance should exist
    """
    # Header Section
    header_highlight = models.CharField(
        max_length=50,
        default="CONTACT",
        help_text="Highlighted text (shown in red)"
    )
    header_suffix = models.CharField(
        max_length=50,
        default="US",
        help_text="Suffix text after highlight"
    )
    header_subtitle = models.TextField(
        default="We'd love to hear from you!",
        help_text="Subtitle under the header"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Contact Page"
        verbose_name_plural = "Contact Page"
    
    def __str__(self):
        return "Contact Page Content"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and ContactPage.objects.exists():
            existing = ContactPage.objects.first()
            self.pk = existing.pk
        return super().save(*args, **kwargs)


class ContactInfo(models.Model):
    """
    Individual contact information items
    """
    ICON_CHOICES = [
        ('Phone', 'Phone'),
        ('Mail', 'Email'),
        ('MapPin', 'Map Pin'),
        ('Facebook', 'Facebook'),
        ('Instagram', 'Instagram'),
        ('Twitter', 'Twitter'),
        ('Globe', 'Website'),
    ]
    
    COLOR_CHOICES = [
        ('purple', 'Purple'),
        ('red', 'Red'),
        ('pink', 'Pink'),
        ('blue', 'Blue'),
        ('green', 'Green'),
        ('yellow', 'Yellow'),
        ('indigo', 'Indigo'),
    ]
    
    label = models.CharField(
        max_length=50,
        help_text="Label (e.g., Phone, Email)"
    )
    value = models.CharField(
        max_length=200,
        help_text="Contact value (e.g., phone number, email address)"
    )
    link = models.CharField(
        max_length=500,
        help_text="Link (e.g., tel:, mailto:, https://)"
    )
    icon_name = models.CharField(
        max_length=50,
        choices=ICON_CHOICES,
        default='Phone',
        help_text="Icon to display"
    )
    color = models.CharField(
        max_length=20,
        choices=COLOR_CHOICES,
        default='purple',
        help_text="Color theme"
    )
    order = models.IntegerField(
        default=0,
        help_text="Display order (lower numbers first)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Show this contact info"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'label']
        verbose_name = "Contact Information"
        verbose_name_plural = "Contact Information"
    
    def __str__(self):
        return f"{self.label}: {self.value}"