from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0057_storesettings_pos_cash_balance'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='admin_reply',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='review',
            name='admin_reply_updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
