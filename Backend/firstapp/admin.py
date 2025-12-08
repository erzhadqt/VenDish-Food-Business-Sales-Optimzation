from django.contrib import admin
from .models import Product, Receipt, ReceiptItem, Coupon, Feedback, HomePage, AboutPage, ContactPage, DailySalesReport, CouponCriteria

# Register your models here
admin.site.register(Product)
admin.site.register(Receipt)
admin.site.register(ReceiptItem)
admin.site.register(DailySalesReport)


admin.site.register(Coupon)
admin.site.register(CouponCriteria)

admin.site.register(Feedback)

admin.site.register(HomePage)
admin.site.register(AboutPage)
admin.site.register(ContactPage)