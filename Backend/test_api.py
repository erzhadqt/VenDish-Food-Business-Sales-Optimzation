import os
import django
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from firstapp.models import Receipt, ReceiptItem
from django.utils import timezone
from django.db.models import Sum

today = timezone.localtime(timezone.now()).date()

print("Today:", today)
receipts = Receipt.objects.filter(status='COMPLETED')
print("Total Completed Receipts:", receipts.count())

for r in receipts.order_by('-created_at')[:3]:
    print(r.created_at)

