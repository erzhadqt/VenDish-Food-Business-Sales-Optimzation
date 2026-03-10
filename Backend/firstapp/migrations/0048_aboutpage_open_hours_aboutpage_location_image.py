from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0047_homepage_carousel_images'),
    ]

    operations = [
        migrations.AddField(
            model_name='aboutpage',
            name='open_hours',
            field=models.CharField(blank=True, default='Everyday: 7:00 AM \u2013 10:00 PM', max_length=200),
        ),
        migrations.AddField(
            model_name='aboutpage',
            name='location_image',
            field=models.ImageField(blank=True, null=True, upload_to='location_images/'),
        ),
    ]
