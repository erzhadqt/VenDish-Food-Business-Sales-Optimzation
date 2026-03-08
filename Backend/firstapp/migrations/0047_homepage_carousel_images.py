from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0046_homepage_hero_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='homepage',
            name='carousel_image_1',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_carousel/'),
        ),
        migrations.AddField(
            model_name='homepage',
            name='carousel_image_2',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_carousel/'),
        ),
        migrations.AddField(
            model_name='homepage',
            name='carousel_image_3',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_carousel/'),
        ),
        migrations.AddField(
            model_name='homepage',
            name='carousel_image_4',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_carousel/'),
        ),
        migrations.AddField(
            model_name='homepage',
            name='carousel_image_5',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_carousel/'),
        ),
        migrations.AddField(
            model_name='homepage',
            name='carousel_image_6',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_carousel/'),
        ),
        migrations.AddField(
            model_name='homepage',
            name='carousel_image_7',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_carousel/'),
        ),
        migrations.AddField(
            model_name='homepage',
            name='carousel_image_8',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_carousel/'),
        ),
        migrations.AddField(
            model_name='homepage',
            name='carousel_image_9',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_carousel/'),
        ),
        migrations.AddField(
            model_name='homepage',
            name='carousel_image_10',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_carousel/'),
        ),
    ]
