from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import OTP, PasswordResetToken


@override_settings(
	EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
	DEFAULT_FROM_EMAIL='noreply@example.com',
)
class ForgotPasswordOTPFlowTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.user = user_model.objects.create_user(
			username='otp_test_user',
			email='otp_test_user@example.com',
			password='OldStrongPassword123!',
		)

	def _set_otp(self, otp_value=123456, expires_at=None, is_valid=True):
		if expires_at is None:
			expires_at = timezone.now() + timedelta(minutes=15)

		otp, _ = OTP.objects.update_or_create(
			user=self.user,
			defaults={
				'otp': otp_value,
				'is_valid': is_valid,
				'expires_at': expires_at,
			},
		)
		return otp

	def test_request_otp_sets_15_minute_expiry(self):
		now_before = timezone.now()

		response = self.client.post(
			'/request-otp/',
			{'email': self.user.email},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)

		otp = OTP.objects.get(user=self.user)
		self.assertTrue(otp.is_valid)
		self.assertGreaterEqual(otp.otp, 100000)
		self.assertLessEqual(otp.otp, 999999)

		lifetime_seconds = (otp.expires_at - now_before).total_seconds()
		self.assertGreaterEqual(lifetime_seconds, 15 * 60 - 5)
		self.assertLessEqual(lifetime_seconds, 15 * 60 + 5)

		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('15 minutes', mail.outbox[0].body)

	def test_verify_expired_otp_is_rejected_and_invalidated(self):
		self._set_otp(expires_at=timezone.now() - timedelta(seconds=1), is_valid=True)

		response = self.client.post(
			'/verify-otp/',
			{'email': self.user.email, 'otp': '123456'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data.get('label'), 'Expired OTP')

		otp = OTP.objects.get(user=self.user)
		self.assertFalse(otp.is_valid)

	def test_verify_otp_expires_at_boundary_is_rejected(self):
		self._set_otp(expires_at=timezone.now(), is_valid=True)

		response = self.client.post(
			'/verify-otp/',
			{'email': self.user.email, 'otp': '123456'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data.get('label'), 'Expired OTP')

	def test_verify_otp_requires_six_digit_numeric_input(self):
		self._set_otp(is_valid=True)

		response = self.client.post(
			'/verify-otp/',
			{'email': self.user.email, 'otp': '12ab56'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data.get('label'), 'Invalid OTP Format')

	def test_verified_otp_cannot_be_used_again(self):
		self._set_otp(expires_at=timezone.now() + timedelta(minutes=15), is_valid=True)

		first = self.client.post(
			'/verify-otp/',
			{'email': self.user.email, 'otp': '123456'},
			format='json',
		)
		self.assertEqual(first.status_code, status.HTTP_200_OK)
		self.assertTrue(bool(first.data.get('token')))

		second = self.client.post(
			'/verify-otp/',
			{'email': self.user.email, 'otp': '123456'},
			format='json',
		)
		self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(second.data.get('label'), 'Invalid OTP')

	def test_password_reset_token_cannot_be_reused(self):
		token = PasswordResetToken.objects.create(
			user=self.user,
			token='token-for-one-time-reset',
			expires_at=timezone.now() + timedelta(minutes=5),
			used=False,
		)

		first = self.client.post(
			'/change-password-token/',
			{
				'email': self.user.email,
				'token': token.token,
				'password': 'NewStrongPassword123!',
			},
			format='json',
		)
		self.assertEqual(first.status_code, status.HTTP_200_OK)

		second = self.client.post(
			'/change-password-token/',
			{
				'email': self.user.email,
				'token': token.token,
				'password': 'AnotherStrongPassword123!',
			},
			format='json',
		)
		self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(second.data.get('label'), 'Used Token')
