from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0069_couponclaim_coupon_targeting_and_nullable_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='is_pos_best_seller',
            field=models.BooleanField(default=False),
        ),
    ]
