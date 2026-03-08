from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0045_homepage_popular_dishes'),
    ]

    operations = [
        migrations.AddField(
            model_name='homepage',
            name='hero_image',
            field=models.ImageField(blank=True, null=True, upload_to='homepage_images/'),
        ),
    ]
