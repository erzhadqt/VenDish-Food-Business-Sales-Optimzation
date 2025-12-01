from django.db import models
from django.db.models import Sum
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

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
    ]
    product_name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0) 
    date_added = models.DateTimeField(default=timezone.now)
    image = models.ImageField(upload_to="product_images/", null=True, blank=True)

    def __str__(self):
        return self.product_name

# RECEIPT 
class Coupon(models.Model):
    # Define the 3 status options strictly
    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        CLAIMED = 'Claimed', 'Claimed'
        REDEEMED = 'Redeemed', 'Redeemed'

    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='coupons')
    name = models.CharField(max_length=50)
    rate = models.DecimalField(max_digits=5, decimal_places=2)
    code = models.CharField(max_length=20, unique=True)
    expiration = models.DateTimeField()
    
    # --- 2. ADD THIS FIELD ---
    claimed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='claimed_coupons'
    )

    # The Status Field
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.ACTIVE
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.name} ({self.status})"

    @property
    def is_valid(self):
        """
        Determines if the coupon can be used at the POS.
        Logic: 
        1. Must not be expired.
        2. Must not be Redeemed (Active or Claimed is fine for POS).
        """
        now = timezone.now()
        
        # Check Expiration
        if self.expiration < now:
            return False
            
        # Check Status
        return self.status in [self.Status.ACTIVE, self.Status.CLAIMED]

    # --- Optional Helper Methods for Clean State Transitions ---

    # --- 3. UPDATE THIS METHOD TO ACCEPT USER ---
    def claim(self, user):
        """Helper to mark coupon as claimed by a specific user."""
        if self.status == self.Status.ACTIVE:
            self.status = self.Status.CLAIMED
            self.claimed_by = user  # Save the user here
            self.save()
            return True
        return False

    def redeem(self):
        """Helper to mark coupon as redeemed (used)."""
        # Can be redeemed if it is Active OR Claimed
        if self.status in [self.Status.ACTIVE, self.Status.CLAIMED]:
            self.status = self.Status.REDEEMED
            self.save()
            return True
        return False
    
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
    void_reason = models.TextField(null=True, blank=True) # Must allow nulls if you aren't saving it
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(User, related_name='voided_receipts', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Receipt #{self.id} - {self.status}"   
    
class ReceiptItem(models.Model):
    coupon = models.ForeignKey(
        Coupon, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="applied_items"
    )

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
    """
    Stores aggregated financial data for a specific date.
    Used to populate charts and tables quickly without recalculating every receipt.
    """
    report_date = models.DateField(unique=True)
    
    # Financials
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    net_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Stats
    total_orders = models.PositiveIntegerField(default=0)
    voided_orders = models.PositiveIntegerField(default=0)
    
    # Insights
    top_selling_product = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Report: {self.report_date} | Profit: {self.net_profit}"

    def generate_report(self):
        """
        Logic to look at Receipts for this date and calculate revenue, cost, and profit.
        """
        # 1. Fetch Receipts for this date
        receipts = Receipt.objects.filter(
            created_at__date=self.report_date
        )

        # 2. Calculate Revenue (Only Completed sales)
        completed_receipts = receipts.filter(status=Receipt.Status.COMPLETED)
        self.total_revenue = completed_receipts.aggregate(Sum('total'))['total__sum'] or 0.00
        self.total_orders = completed_receipts.count()
        self.voided_orders = receipts.filter(status=Receipt.Status.VOIDED).count()

        # 3. Calculate Costs (The tricky part: linking ReceiptItems -> Product -> Costing)
        total_cost_accumulated = 0
        
        # We look at all items sold in completed receipts
        items_sold = ReceiptItem.objects.filter(receipt__in=completed_receipts)

        for item in items_sold:
            if item.product and hasattr(item.product, 'costing'):
                # Cost = Quantity Sold * (Ingredients + Elec + Gas + Labor)
                cost_per_unit = item.product.costing.total_cost()
                total_cost_accumulated += (cost_per_unit * item.quantity)
        
        self.total_cost = total_cost_accumulated

        # 4. Calculate Net Profit
        self.net_profit = float(self.total_revenue) - float(self.total_cost)

        # 5. Determine Top Seller
        # This finds the product name with the highest sum of quantities sold for this day
        top_item = items_sold.values('product_name').annotate(
            total_qty=Sum('quantity')
        ).order_by('-total_qty').first()

        if top_item:
            self.top_selling_product = top_item['product_name']

        self.save()

    @receiver(post_save, sender=Receipt)
    def update_sales_report(sender, instance, created, **kwargs):
        """
        Trigger: When a Receipt is saved (new or updated).
        Action: Find the DailySalesReport for that date and re-calculate the totals.
        """
        if instance.created_at:
            # Get the date from the receipt
            date = instance.created_at.date()
            
            # Get or Create a report entry for this specific day
            report, _ = DailySalesReport.objects.get_or_create(report_date=date)
            
            # Run the math (Revenue - Cost = Profit)
            report.generate_report()

# COSTING
class Costing(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="costing")
    ingredient_cost = models.DecimalField(max_digits=10, decimal_places=2)
    electricity_cost = models.DecimalField(max_digits=10, decimal_places=2)
    gas_consumption = models.DecimalField(max_digits=10, decimal_places=2)
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2)
    profit_margin = models.DecimalField(max_digits=5, decimal_places=2, help_text="In percentage")

    def total_cost(self):
        return self.ingredient_cost + self.electricity_cost + self.gas_consumption + self.labor_cost

    def __str__(self):
        return f"Costing for {self.product.product_name}"

# FEEDBACK
class Feedback(models.Model):
    message = models.TextField()
    date_submitted = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Feedback #{self.id}"


# CMS
class HomePage(models.Model):
    dishes = models.CharField(max_length=50)
    banner_image = models.ImageField(upload_to="homepage/")

    def __str__(self):
        return "Home Page Content"


class AboutPage(models.Model):
    story = models.TextField(blank=True)
    subtitle = models.TextField(blank=True)
    message = models.ForeignKey(
        Feedback,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="about_messages",
    )

    def __str__(self):
        return "About Page Content"


class ContactPage(models.Model):
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.CharField(max_length=100)
    fb_page = models.CharField(max_length=100)

    def __str__(self):
        return "Contact Page Content"