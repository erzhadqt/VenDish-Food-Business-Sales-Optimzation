from django.contrib import admin
from .models import Product, Costing, Receipt, ReceiptItem, Discount, Feedback, HomePage, AboutPage, ContactPage

# Register your models here
admin.site.register(Product)
admin.site.register(Costing)
admin.site.register(Receipt)
admin.site.register(ReceiptItem)


admin.site.register(Discount)

admin.site.register(Feedback)

admin.site.register(HomePage)
admin.site.register(AboutPage)
admin.site.register(ContactPage)