from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, time

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from firstapp.models import Receipt

PH_VAT_DIVISOR = Decimal("1.12")
MONEY_PRECISION = Decimal("0.01")
SENIOR_PWD_DISCOUNT_RATE = Decimal("0.20")
SENIOR_PWD_TOLERANCE = Decimal("0.01")


def quantize_money(value):
    amount = Decimal(str(value or "0"))
    return amount.quantize(MONEY_PRECISION, rounding=ROUND_HALF_UP)


def compute_vat_from_vat_inclusive_total(total):
    safe_total = quantize_money(total)
    if safe_total <= 0:
        return Decimal("0.00")

    vat_amount = safe_total - (safe_total / PH_VAT_DIVISOR)
    return quantize_money(vat_amount)


class Command(BaseCommand):
    help = (
        "Recalculate historical Receipt.vat using PH VAT-inclusive formula "
        "(VAT = total - total/1.12). Supports dry-run and optional senior/PWD legacy heuristic."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview affected receipts without writing changes.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply VAT corrections to matching receipts.",
        )
        parser.add_argument(
            "--from",
            dest="from_value",
            help="Filter receipts created on/after this ISO datetime/date.",
        )
        parser.add_argument(
            "--to",
            dest="to_value",
            help="Filter receipts created on/before this ISO datetime/date.",
        )
        parser.add_argument(
            "--no-vat-exempt-heuristic",
            action="store_true",
            help=(
                "Disable legacy VAT-exempt inference for likely senior/PWD sales "
                "(20 percent discount with no coupons)."
            ),
        )

    def _parse_datetime_input(self, raw_value, is_end=False):
        if not raw_value:
            return None

        parsed_dt = parse_datetime(str(raw_value))
        if parsed_dt:
            if timezone.is_naive(parsed_dt):
                parsed_dt = timezone.make_aware(parsed_dt)
            return parsed_dt

        parsed_date = parse_date(str(raw_value))
        if parsed_date:
            if is_end:
                dt = datetime.combine(parsed_date, time.max)
            else:
                dt = datetime.combine(parsed_date, time.min)
            return timezone.make_aware(dt)

        return None

    def _is_probable_senior_or_pwd_legacy_sale(self, receipt):
        subtotal = quantize_money(receipt.subtotal)
        total = quantize_money(receipt.total)
        if subtotal <= 0 or total <= 0:
            return False

        if receipt.coupons.exists():
            return False

        discount_amount = quantize_money(subtotal - total)
        target_discount = quantize_money(subtotal * SENIOR_PWD_DISCOUNT_RATE)
        return abs(discount_amount - target_discount) <= SENIOR_PWD_TOLERANCE

    def handle(self, *args, **options):
        dry_run = bool(options.get("dry_run")) or not bool(options.get("apply"))
        use_exempt_heuristic = not bool(options.get("no_vat_exempt_heuristic"))

        from_dt = self._parse_datetime_input(options.get("from_value"), is_end=False)
        to_dt = self._parse_datetime_input(options.get("to_value"), is_end=True)

        if options.get("from_value") and from_dt is None:
            self.stderr.write(self.style.ERROR("Invalid --from value. Use ISO datetime/date."))
            return

        if options.get("to_value") and to_dt is None:
            self.stderr.write(self.style.ERROR("Invalid --to value. Use ISO datetime/date."))
            return

        queryset = Receipt.objects.filter(status=Receipt.Status.COMPLETED).order_by("id").prefetch_related("coupons")

        if from_dt:
            queryset = queryset.filter(created_at__gte=from_dt)
        if to_dt:
            queryset = queryset.filter(created_at__lte=to_dt)

        total_checked = 0
        total_changed = 0
        vat_exempt_inferred = 0
        before_vat_sum = Decimal("0.00")
        after_vat_sum = Decimal("0.00")
        sample_updates = []

        self.stdout.write(
            self.style.WARNING(
                "Running in DRY-RUN mode. No data will be changed."
                if dry_run
                else "Applying VAT corrections now."
            )
        )

        with transaction.atomic():
            for receipt in queryset.iterator(chunk_size=500):
                total_checked += 1

                current_vat = quantize_money(receipt.vat)
                before_vat_sum += current_vat

                is_vat_exempt = False
                if use_exempt_heuristic and self._is_probable_senior_or_pwd_legacy_sale(receipt):
                    is_vat_exempt = True
                    vat_exempt_inferred += 1

                expected_vat = Decimal("0.00") if is_vat_exempt else compute_vat_from_vat_inclusive_total(receipt.total)
                after_vat_sum += expected_vat

                if expected_vat == current_vat:
                    continue

                total_changed += 1
                if len(sample_updates) < 10:
                    sample_updates.append(
                        f"Receipt #{receipt.id}: {current_vat} -> {expected_vat}"
                    )

                if not dry_run:
                    Receipt.objects.filter(id=receipt.id).update(vat=expected_vat)

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(f"Receipts scanned: {total_checked}"))
        self.stdout.write(self.style.SUCCESS(f"Receipts requiring VAT update: {total_changed}"))
        self.stdout.write(self.style.SUCCESS(f"Legacy VAT-exempt inferred (senior/PWD heuristic): {vat_exempt_inferred}"))
        self.stdout.write(self.style.SUCCESS(f"Current VAT sum: {quantize_money(before_vat_sum)}"))
        self.stdout.write(self.style.SUCCESS(f"Expected VAT sum: {quantize_money(after_vat_sum)}"))

        if sample_updates:
            self.stdout.write(self.style.WARNING("Sample updates:"))
            for line in sample_updates:
                self.stdout.write(f"  - {line}")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-run complete. Re-run with --apply to persist updates."))
        else:
            self.stdout.write(self.style.SUCCESS("VAT correction complete and committed."))
