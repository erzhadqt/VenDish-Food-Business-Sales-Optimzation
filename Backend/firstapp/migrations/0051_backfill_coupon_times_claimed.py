from django.db import migrations
from django.db.models import Count


def backfill_times_claimed(apps, schema_editor):
    Coupon = apps.get_model('firstapp', 'Coupon')

    for coupon in Coupon.objects.annotate(real_claims=Count('claimed_by')).iterator():
        if coupon.times_claimed != coupon.real_claims:
            coupon.times_claimed = coupon.real_claims
            coupon.save(update_fields=['times_claimed'])


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0050_coupon_times_claimed'),
    ]

    operations = [
        migrations.RunPython(backfill_times_claimed, migrations.RunPython.noop),
    ]
