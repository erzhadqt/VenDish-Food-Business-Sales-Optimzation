from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0044_storesettings_max_coupons_per_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='homepage',
            name='popular_dish_1',
            field=models.CharField(default='Chicken Adobo', max_length=100),
        ),
        migrations.AddField(
            model_name='homepage',
            name='popular_dish_2',
            field=models.CharField(default='Pork Sisig', max_length=100),
        ),
        migrations.AddField(
            model_name='homepage',
            name='popular_dish_3',
            field=models.CharField(default='Beef Sinigang', max_length=100),
        ),
        migrations.AddField(
            model_name='homepage',
            name='popular_dish_4',
            field=models.CharField(default='Kare-Kare', max_length=100),
        ),
    ]
