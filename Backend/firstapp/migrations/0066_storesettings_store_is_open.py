from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0065_couponcriteria_max_discount_amount'),
    ]

    operations = [
        migrations.AddField(
            model_name='storesettings',
            name='store_is_open',
            field=models.BooleanField(default=True),
        ),
    ]
