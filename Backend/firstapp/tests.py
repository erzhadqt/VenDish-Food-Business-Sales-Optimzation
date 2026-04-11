from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import OTP, PasswordResetToken, Review, Category, Product


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


class ReviewAdminReplyTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.customer = user_model.objects.create_user(
			username='review_customer',
			email='review_customer@example.com',
			password='CustomerPass123!',
		)
		self.admin = user_model.objects.create_user(
			username='review_admin',
			email='review_admin@example.com',
			password='AdminPass123!',
			is_staff=True,
			is_superuser=True,
		)
		self.review = Review.objects.create(
			user=self.customer,
			review_type='shop',
			rating=5,
			comment='Excellent service',
		)

	def test_admin_can_reply_to_review(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.post(
			f'/firstapp/reviews/{self.review.id}/reply/',
			{'admin_reply': 'Thank you for your feedback!'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('admin_reply'), 'Thank you for your feedback!')
		self.assertIsNotNone(response.data.get('admin_reply_updated_at'))

		self.review.refresh_from_db()
		self.assertEqual(self.review.admin_reply, 'Thank you for your feedback!')
		self.assertIsNotNone(self.review.admin_reply_updated_at)

	def test_admin_can_reply_to_review_with_patch(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.patch(
			f'/firstapp/reviews/{self.review.id}/reply/',
			{'admin_reply': 'Updated via PATCH'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('admin_reply'), 'Updated via PATCH')

		self.review.refresh_from_db()
		self.assertEqual(self.review.admin_reply, 'Updated via PATCH')

	def test_non_admin_cannot_reply_to_review(self):
		self.client.force_authenticate(user=self.customer)

		response = self.client.post(
			f'/firstapp/reviews/{self.review.id}/reply/',
			{'admin_reply': 'This should fail'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_review_list_includes_admin_reply_fields(self):
		self.review.admin_reply = 'We appreciate your support.'
		self.review.admin_reply_updated_at = timezone.now()
		self.review.save(update_fields=['admin_reply', 'admin_reply_updated_at'])

		response = self.client.get('/firstapp/reviews/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		payload = response.data.get('results') if isinstance(response.data, dict) else response.data
		review_payload = next((item for item in payload if item['id'] == self.review.id), None)

		self.assertIsNotNone(review_payload)
		self.assertIn('admin_reply', review_payload)
		self.assertIn('admin_reply_updated_at', review_payload)
		self.assertEqual(review_payload['admin_reply'], 'We appreciate your support.')


class ProductArchiveTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.admin = user_model.objects.create_user(
			username='archive_admin',
			email='archive_admin@example.com',
			password='AdminPass123!',
			is_staff=True,
		)
		self.customer = user_model.objects.create_user(
			username='archive_customer',
			email='archive_customer@example.com',
			password='CustomerPass123!',
		)

		self.category = Category.objects.create(name='Meals')
		self.product_a = Product.objects.create(
			product_name='Burger',
			category=self.category,
			price='99.00',
			stock_quantity=10,
			is_available=True,
		)
		self.product_b = Product.objects.create(
			product_name='Fries',
			category=self.category,
			price='59.00',
			stock_quantity=8,
			is_available=True,
		)
		self.product_uncategorized = Product.objects.create(
			product_name='Mystery Meal',
			category=None,
			price='129.00',
			stock_quantity=12,
			is_available=True,
		)

	def test_admin_can_archive_multiple_products(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.post(
			'/firstapp/products/archive/',
			{'product_ids': [self.product_a.id, self.product_b.id]},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('archived_count'), 2)

		self.product_a.refresh_from_db()
		self.product_b.refresh_from_db()

		self.assertTrue(self.product_a.is_archived)
		self.assertTrue(self.product_b.is_archived)
		self.assertIsNotNone(self.product_a.archived_at)
		self.assertIsNotNone(self.product_b.archived_at)
		self.assertEqual(self.product_a.stock_quantity, 0)
		self.assertEqual(self.product_b.stock_quantity, 0)
		self.assertFalse(self.product_a.is_available)
		self.assertFalse(self.product_b.is_available)

	def test_admin_can_archive_multiple_products_with_patch(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.patch(
			'/firstapp/products/archive/',
			{'product_ids': [self.product_a.id, self.product_b.id]},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('archived_count'), 2)

		self.product_a.refresh_from_db()
		self.product_b.refresh_from_db()

		self.assertTrue(self.product_a.is_archived)
		self.assertTrue(self.product_b.is_archived)
		self.assertEqual(self.product_a.stock_quantity, 0)
		self.assertEqual(self.product_b.stock_quantity, 0)

	def test_non_admin_cannot_archive_products(self):
		self.client.force_authenticate(user=self.customer)

		response = self.client.post(
			'/firstapp/products/archive/',
			{'product_ids': [self.product_a.id]},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_archived_products_hidden_from_default_list(self):
		self.client.force_authenticate(user=self.admin)
		self.client.post(
			'/firstapp/products/archive/',
			{'product_ids': [self.product_a.id]},
			format='json',
		)
		self.client.force_authenticate(user=None)

		response = self.client.get('/firstapp/products/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		returned_ids = {item['id'] for item in response.data}
		self.assertNotIn(self.product_a.id, returned_ids)
		self.assertIn(self.product_b.id, returned_ids)

	def test_delete_product_is_disabled(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.delete(f'/firstapp/products/{self.product_a.id}/')

		self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
		self.product_a.refresh_from_db()
		self.assertFalse(self.product_a.is_archived)

	def test_admin_can_unarchive_multiple_products(self):
		self.client.force_authenticate(user=self.admin)
		self.client.post(
			'/firstapp/products/archive/',
			{'product_ids': [self.product_a.id, self.product_b.id]},
			format='json',
		)

		response = self.client.post(
			'/firstapp/products/unarchive/',
			{'product_ids': [self.product_a.id, self.product_b.id]},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('unarchived_count'), 2)

		self.product_a.refresh_from_db()
		self.product_b.refresh_from_db()

		self.assertFalse(self.product_a.is_archived)
		self.assertFalse(self.product_b.is_archived)
		self.assertIsNone(self.product_a.archived_at)
		self.assertIsNone(self.product_b.archived_at)
		self.assertEqual(self.product_a.stock_quantity, 0)
		self.assertEqual(self.product_b.stock_quantity, 0)
		self.assertFalse(self.product_a.is_available)
		self.assertFalse(self.product_b.is_available)

	def test_admin_can_unarchive_multiple_products_with_patch(self):
		self.client.force_authenticate(user=self.admin)
		self.client.post(
			'/firstapp/products/archive/',
			{'product_ids': [self.product_a.id, self.product_b.id]},
			format='json',
		)

		response = self.client.patch(
			'/firstapp/products/unarchive/',
			{'product_ids': [self.product_a.id, self.product_b.id]},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('unarchived_count'), 2)

		self.product_a.refresh_from_db()
		self.product_b.refresh_from_db()

		self.assertFalse(self.product_a.is_archived)
		self.assertFalse(self.product_b.is_archived)
		self.assertEqual(self.product_a.stock_quantity, 0)
		self.assertEqual(self.product_b.stock_quantity, 0)
		self.assertFalse(self.product_a.is_available)
		self.assertFalse(self.product_b.is_available)

	def test_unarchived_products_return_to_default_list(self):
		self.client.force_authenticate(user=self.admin)
		self.client.post(
			'/firstapp/products/archive/',
			{'product_ids': [self.product_a.id]},
			format='json',
		)
		self.client.post(
			'/firstapp/products/unarchive/',
			{'product_ids': [self.product_a.id]},
			format='json',
		)
		self.client.force_authenticate(user=None)

		response = self.client.get('/firstapp/products/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		returned_ids = {item['id'] for item in response.data}
		self.assertIn(self.product_a.id, returned_ids)

	def test_uncategorized_filter_returns_only_uncategorized_products(self):
		response = self.client.get('/firstapp/products/?uncategorized=true')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		returned_ids = {item['id'] for item in response.data}
		self.assertIn(self.product_uncategorized.id, returned_ids)
		self.assertNotIn(self.product_a.id, returned_ids)
		self.assertNotIn(self.product_b.id, returned_ids)
