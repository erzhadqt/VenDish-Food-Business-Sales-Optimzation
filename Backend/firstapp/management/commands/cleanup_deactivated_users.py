from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Deletes only non-staff user accounts that have been deactivated for more than 30 days.'

    def handle(self, *args, **kwargs):
        # Calculate the cutoff date (exactly 30 days ago)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Query: Find ONLY regular users who are deactivated for at least 30 days.
        # Staff/admin accounts are always excluded from this cleanup.
        users_to_delete = User.objects.filter(
            is_active=False,
            is_staff=False,
            profile__deactivated_at__lte=thirty_days_ago
        )

        count = users_to_delete.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No accounts are scheduled for deletion today."))
            return

        # Execute the deletion
        users_to_delete.delete()
        
        # Log success
        self.stdout.write(self.style.SUCCESS(f"Successfully deleted {count} user account(s) that exceeded the 30-day deactivation period."))