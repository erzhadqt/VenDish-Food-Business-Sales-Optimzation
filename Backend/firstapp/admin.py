from django.contrib import admin
from .models import (
    Product, 
    Receipt, 
    ReceiptItem, 
    Coupon, 
    Feedback, 
    HomePage, 
    PopularDish,
    HomePageImage,
    ServicesPage, 
    Service,
    AboutPage,
    Testimonial, 
    ContactPage, 
    ContactInfo,
    DailySalesReport, 
    CouponCriteria
)

# Register your models here
admin.site.register(Product)
admin.site.register(Receipt)
admin.site.register(ReceiptItem)
admin.site.register(DailySalesReport)

admin.site.register(Coupon)
admin.site.register(CouponCriteria)

admin.site.register(Feedback)

admin.site.register(HomePage)
admin.site.register(PopularDish)
admin.site.register(HomePageImage)

admin.site.register(ServicesPage)
admin.site.register(Service)

admin.site.register(AboutPage)
admin.site.register(Testimonial)

admin.site.register(ContactPage)
admin.site.register(ContactInfo)