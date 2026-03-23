from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0052_staffinvitationtoken'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='receipt',
            name='paid_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='receipt',
            name='payment_method',
            field=models.CharField(choices=[('CASH', 'Cash'), ('GCASH', 'GCash')], default='CASH', max_length=20),
        ),
        migrations.AddField(
            model_name='receipt',
            name='payment_status',
            field=models.CharField(choices=[('PENDING', 'Pending'), ('PAID', 'Paid'), ('FAILED', 'Failed'), ('EXPIRED', 'Expired')], default='PAID', max_length=20),
        ),
        migrations.AddField(
            model_name='receipt',
            name='provider_payment_id',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='receipt',
            name='provider_reference',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.CreateModel(
            name='PaymentTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(choices=[('PAYMONGO', 'PayMongo')], default='PAYMONGO', max_length=20)),
                ('reference', models.CharField(max_length=64, unique=True)),
                ('transaction_idempotency_key', models.CharField(max_length=64, unique=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('PAID', 'Paid'), ('FAILED', 'Failed'), ('EXPIRED', 'Expired'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=20)),
                ('amount', models.PositiveIntegerField(help_text='Amount in centavos')),
                ('currency', models.CharField(default='PHP', max_length=10)),
                ('checkout_url', models.URLField(blank=True, null=True)),
                ('provider_checkout_id', models.CharField(blank=True, max_length=100, null=True)),
                ('provider_payment_id', models.CharField(blank=True, max_length=100, null=True)),
                ('provider_event_id', models.CharField(blank=True, max_length=100, null=True)),
                ('webhook_verified', models.BooleanField(default=False)),
                ('order_payload', models.JSONField(blank=True, default=dict)),
                ('raw_provider_payload', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('cashier', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_payment_transactions', to=settings.AUTH_USER_MODEL)),
                ('customer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payment_transactions', to=settings.AUTH_USER_MODEL)),
                ('receipt', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payment_transaction', to='firstapp.receipt')),
            ],
        ),
    ]
