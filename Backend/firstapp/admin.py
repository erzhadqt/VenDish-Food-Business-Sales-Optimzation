from django.contrib import admin
from .models import Product, Costing, Receipt, ReceiptItem, Coupon, Feedback, HomePage, AboutPage, ContactPage, DailySalesReport

# Register your models here
admin.site.register(Product)
admin.site.register(Costing)
admin.site.register(Receipt)
admin.site.register(ReceiptItem)
admin.site.register(DailySalesReport)


admin.site.register(Coupon)

admin.site.register(Feedback)

admin.site.register(HomePage)
admin.site.register(AboutPage)
admin.site.register(ContactPage)