import os
import django
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from firstapp.models import Receipt, ReceiptItem
from django.utils import timezone
from django.db.models.functions import TruncDay
from django.db.models import Sum, Count

today = timezone.localtime(timezone.now()).date()

print("Today:", today)
receipts = Receipt.objects.filter(created_at__date=today, status='COMPLETED')
print("Receipts today:", receipts.count())

if receipts.exists():
    items = ReceiptItem.objects.filter(receipt__in=receipts).values('product_name').annotate(qty=Sum('quantity')).order_by('-qty')
    print("Items:", list(items))

