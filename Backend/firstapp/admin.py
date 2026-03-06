from django.contrib import admin
from .models import Product, Category, Receipt, ReceiptItem, Coupon, Feedback, HomePage, ServicesPage, AboutPage, ContactPage, CouponCriteria, Review, UserProfile, OTP, PasswordResetToken, StoreSettings

# Register your models here

admin.site.register(UserProfile)
admin.site.register(Product)
admin.site.register(Category)
admin.site.register(Receipt)
admin.site.register(ReceiptItem)

admin.site.register(OTP)
admin.site.register(PasswordResetToken)
admin.site.register(StoreSettings)

admin.site.register(Coupon)
admin.site.register(CouponCriteria)

admin.site.register(Feedback)
admin.site.register(Review)

admin.site.register(HomePage)
admin.site.register(AboutPage)
admin.site.register(ServicesPage)
admin.site.register(ContactPage)