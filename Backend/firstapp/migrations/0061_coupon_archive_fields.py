from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0060_emailverificationtoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='coupon',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='coupon',
            name='is_archived',
            field=models.BooleanField(default=False),
        ),
    ]
