from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0064_product_low_serving_threshold'),
    ]

    operations = [
        migrations.AddField(
            model_name='couponcriteria',
            name='max_discount_amount',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                default=None,
                help_text='Optional cap amount for percentage discounts.',
                max_digits=10,
                null=True,
            ),
        ),
    ]
