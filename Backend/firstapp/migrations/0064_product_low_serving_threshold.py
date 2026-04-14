from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0063_storesettings_receipt_phone'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='low_serving_threshold',
            field=models.PositiveIntegerField(default=10),
        ),
    ]
