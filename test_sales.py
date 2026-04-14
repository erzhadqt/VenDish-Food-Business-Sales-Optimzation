import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from firstapp.models import Receipt

print(Receipt.objects.count())
