from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('firstapp', '0053_receipt_payment_and_paymenttransaction'),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentWebhookEventLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_id', models.CharField(max_length=100, unique=True)),
                ('event_type', models.CharField(max_length=120)),
                ('signature_hash', models.CharField(db_index=True, max_length=128)),
                ('processed', models.BooleanField(default=False)),
                ('received_at', models.DateTimeField(auto_now_add=True)),
                ('transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='webhook_events', to='firstapp.paymenttransaction')),
            ],
        ),
    ]
