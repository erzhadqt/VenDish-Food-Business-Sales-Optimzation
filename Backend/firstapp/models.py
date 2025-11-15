from django.db import models
from django.utils import timezone


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

    def __str__(self):
        return self.product_name


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


# ORDER
class Order(models.Model):
    date_ordered = models.DateTimeField(default=timezone.now)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    tax = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled')
        ],
        default='pending'
    )

    def __str__(self):
        return f"Order #{self.id} - {self.status}"


# ORDER PRODUCT (Order Items)
class OrderProduct(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="order_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} × {self.product.product_name}"



# SALES
class Sales(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    total_sales = models.DecimalField(max_digits=10, decimal_places=2)
    profit = models.DecimalField(max_digits=10, decimal_places=2)
    date_recorded = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Sales Record for Order #{self.order.id}"



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
