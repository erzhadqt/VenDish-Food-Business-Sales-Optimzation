from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from datetime import timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Deletes deactivated non-staff user accounts after a retention period. Intended for automated cron runs.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=max(1, int(getattr(settings, 'DEACTIVATED_USER_RETENTION_DAYS', 30))),
            help='Retention period in days before permanent deletion (default from settings, fallback 30).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show how many accounts would be deleted without deleting anything.',
        )

    def handle(self, *args, **kwargs):
        retention_days = max(1, kwargs['days'])
        cutoff_time = timezone.now() - timedelta(days=retention_days)
        
        # Query: Find ONLY regular users who are deactivated for at least 30 days.
        # Staff/admin accounts are always excluded from this cleanup.
        users_to_delete = User.objects.filter(
            is_active=False,
            is_staff=False,
            is_superuser=False,
            profile__deactivated_at__isnull=False,
            profile__deactivated_at__lte=cutoff_time,
        )

        count = users_to_delete.count()

        if kwargs['dry_run']:
            self.stdout.write(self.style.WARNING(
                f"[DRY RUN] {count} user account(s) are eligible for deletion after {retention_days} day(s)."
            ))
            return
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No accounts are scheduled for deletion in this run."))
            return

        # Execute the deletion
        users_to_delete.delete()
        
        # Log success
        self.stdout.write(self.style.SUCCESS(
            f"Successfully deleted {count} user account(s) that exceeded the {retention_days}-day deactivation period."
        ))