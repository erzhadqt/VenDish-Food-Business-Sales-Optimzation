from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import OTP, PasswordResetToken, EmailVerificationToken, Review, Category, Product, Coupon, CouponCriteria, StoreSettings, Receipt


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


@override_settings(
	EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
	DEFAULT_FROM_EMAIL='noreply@example.com',
	APP_DEEP_LINK_SCHEME='food',
	BACKEND_BASE_URL='http://localhost:8000',
	EMAIL_VERIFICATION_EXPIRY_MINUTES=30,
)
class EmailVerificationSignupFlowTests(APITestCase):
	def setUp(self):
		self.password = 'StrongPassword123!'
		self.signup_payload = {
			'username': 'pending_user',
			'email': 'pending_user@example.com',
			'password': self.password,
			'first_name': 'Pending',
			'last_name': 'User',
		}

	def test_register_creates_pending_user_and_sends_verification_email(self):
		now_before = timezone.now()

		response = self.client.post('/firstapp/users/register/', self.signup_payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertIn('verify your email', response.data.get('message', '').lower())

		user_model = get_user_model()
		user = user_model.objects.get(username=self.signup_payload['username'])
		self.assertFalse(user.is_active)

		verification = EmailVerificationToken.objects.get(user=user)
		self.assertTrue(verification.is_valid)

		lifetime_seconds = (verification.expires_at - now_before).total_seconds()
		self.assertGreaterEqual(lifetime_seconds, 30 * 60 - 5)
		self.assertLessEqual(lifetime_seconds, 30 * 60 + 5)

		self.assertEqual(len(mail.outbox), 1)
		email_body = mail.outbox[0].body
		self.assertIn('food://verify-email?token=', email_body)
		self.assertIn('/firstapp/users/verify-email/?token=', email_body)
		self.assertIn(verification.token, email_body)

	def test_unverified_user_cannot_login_until_email_is_verified(self):
		self.client.post('/firstapp/users/register/', self.signup_payload, format='json')

		login_response = self.client.post(
			'/firstapp/token/',
			{
				'username': self.signup_payload['username'],
				'password': self.password,
				'platform': 'app',
			},
			format='json',
		)

		self.assertEqual(login_response.status_code, status.HTTP_401_UNAUTHORIZED)
		self.assertIn('verify your email', str(login_response.data.get('detail', '')).lower())

		user_model = get_user_model()
		user = user_model.objects.get(username=self.signup_payload['username'])
		verification = EmailVerificationToken.objects.get(user=user)

		verify_response = self.client.get(f'/firstapp/users/verify-email/?token={verification.token}')
		self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

		user.refresh_from_db()
		verification.refresh_from_db()
		self.assertTrue(user.is_active)
		self.assertFalse(verification.is_valid)
		self.assertIsNotNone(verification.verified_at)

		login_after_verify = self.client.post(
			'/firstapp/token/',
			{
				'username': self.signup_payload['username'],
				'password': self.password,
				'platform': 'app',
			},
			format='json',
		)

		self.assertEqual(login_after_verify.status_code, status.HTTP_200_OK)
		self.assertIn('access', login_after_verify.data)
		self.assertIn('refresh', login_after_verify.data)

	def test_expired_verification_token_is_rejected(self):
		user_model = get_user_model()
		user = user_model.objects.create_user(
			username='expired_pending_user',
			email='expired_pending_user@example.com',
			password=self.password,
			is_active=False,
		)

		verification = EmailVerificationToken.objects.create(
			user=user,
			token='expired-verification-token',
			expires_at=timezone.now() - timedelta(minutes=1),
			is_valid=True,
		)

		response = self.client.get(f'/firstapp/users/verify-email/?token={verification.token}')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('expired', str(response.data.get('error', '')).lower())

		user.refresh_from_db()
		verification.refresh_from_db()
		self.assertFalse(user.is_active)
		self.assertFalse(verification.is_valid)


class StoreOpenCloseLoginGuardTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.staff_user = user_model.objects.create_user(
			username='store_guard_staff',
			email='store_guard_staff@example.com',
			password='StaffPass123!',
			is_staff=True,
		)
		self.admin_user = user_model.objects.create_user(
			username='store_guard_admin',
			email='store_guard_admin@example.com',
			password='AdminPass123!',
			is_staff=True,
			is_superuser=True,
		)

	def test_staff_web_login_blocked_when_store_closed(self):
		StoreSettings.objects.update_or_create(
			id=1,
			defaults={'store_is_open': False},
		)

		response = self.client.post(
			'/firstapp/token/',
			{
				'username': self.staff_user.username,
				'password': 'StaffPass123!',
				'platform': 'web',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
		self.assertIn('store is currently closed', str(response.data.get('detail', '')).lower())

	def test_superuser_web_login_allowed_when_store_closed(self):
		StoreSettings.objects.update_or_create(
			id=1,
			defaults={'store_is_open': False},
		)

		response = self.client.post(
			'/firstapp/token/',
			{
				'username': self.admin_user.username,
				'password': 'AdminPass123!',
				'platform': 'web',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('access', response.data)

	def test_admin_can_toggle_store_open_status_via_settings(self):
		self.client.force_authenticate(user=self.admin_user)

		initial_response = self.client.get('/settings/')
		self.assertEqual(initial_response.status_code, status.HTTP_200_OK)
		self.assertIn('store_is_open', initial_response.data)

		update_response = self.client.post(
			'/settings/',
			{'store_is_open': False},
			format='json',
		)

		self.assertEqual(update_response.status_code, status.HTTP_200_OK)
		self.assertFalse(update_response.data.get('store_is_open'))

		settings = StoreSettings.objects.get(id=1)
		self.assertFalse(settings.store_is_open)

	def test_public_store_status_endpoint_reflects_current_state(self):
		StoreSettings.objects.update_or_create(
			id=1,
			defaults={'store_is_open': False},
		)

		self.client.force_authenticate(user=None)
		response = self.client.get('/store-status/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('store_is_open', response.data)
		self.assertFalse(response.data.get('store_is_open'))


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


class CouponArchiveTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.admin = user_model.objects.create_user(
			username='coupon_archive_admin',
			email='coupon_archive_admin@example.com',
			password='AdminPass123!',
			is_staff=True,
		)
		self.customer = user_model.objects.create_user(
			username='coupon_archive_customer',
			email='coupon_archive_customer@example.com',
			password='CustomerPass123!',
		)

		self.criteria = CouponCriteria.objects.create(
			name='Archive Test Rule',
			discount_type='fixed',
			discount_value='20.00',
		)
		self.coupon_a = Coupon.objects.create(
			code='ARCHIVEA',
			criteria=self.criteria,
			status='Active',
		)
		self.coupon_b = Coupon.objects.create(
			code='ARCHIVEB',
			criteria=self.criteria,
			status='Active',
		)

	def test_admin_can_archive_multiple_coupons(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.post(
			'/firstapp/coupons/archive/',
			{'coupon_ids': [self.coupon_a.id, self.coupon_b.id]},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('archived_count'), 2)

		self.coupon_a.refresh_from_db()
		self.coupon_b.refresh_from_db()

		self.assertTrue(self.coupon_a.is_archived)
		self.assertTrue(self.coupon_b.is_archived)
		self.assertIsNotNone(self.coupon_a.archived_at)
		self.assertIsNotNone(self.coupon_b.archived_at)

	def test_admin_can_unarchive_multiple_coupons(self):
		self.client.force_authenticate(user=self.admin)
		self.client.post(
			'/firstapp/coupons/archive/',
			{'coupon_ids': [self.coupon_a.id, self.coupon_b.id]},
			format='json',
		)

		response = self.client.post(
			'/firstapp/coupons/unarchive/',
			{'coupon_ids': [self.coupon_a.id, self.coupon_b.id]},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('unarchived_count'), 2)

		self.coupon_a.refresh_from_db()
		self.coupon_b.refresh_from_db()

		self.assertFalse(self.coupon_a.is_archived)
		self.assertFalse(self.coupon_b.is_archived)
		self.assertIsNone(self.coupon_a.archived_at)
		self.assertIsNone(self.coupon_b.archived_at)

	def test_non_admin_cannot_archive_coupons(self):
		self.client.force_authenticate(user=self.customer)

		response = self.client.post(
			'/firstapp/coupons/archive/',
			{'coupon_ids': [self.coupon_a.id]},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_archived_coupons_hidden_from_default_list_for_staff(self):
		self.client.force_authenticate(user=self.admin)
		self.client.post(
			'/firstapp/coupons/archive/',
			{'coupon_ids': [self.coupon_a.id]},
			format='json',
		)

		response = self.client.get('/firstapp/coupons/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		returned_ids = {item['id'] for item in response.data}
		self.assertNotIn(self.coupon_a.id, returned_ids)
		self.assertIn(self.coupon_b.id, returned_ids)

	def test_admin_can_include_archived_coupons_in_list(self):
		self.client.force_authenticate(user=self.admin)
		self.client.post(
			'/firstapp/coupons/archive/',
			{'coupon_ids': [self.coupon_a.id]},
			format='json',
		)

		response = self.client.get('/firstapp/coupons/?include_archived=true')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		returned_ids = {item['id'] for item in response.data}
		self.assertIn(self.coupon_a.id, returned_ids)
		self.assertIn(self.coupon_b.id, returned_ids)

	def test_delete_coupon_is_disabled(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.delete(f'/firstapp/coupons/{self.coupon_a.id}/')

		self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
		self.coupon_a.refresh_from_db()
		self.assertFalse(self.coupon_a.is_archived)

	def test_archived_coupon_cannot_be_claimed(self):
		self.client.force_authenticate(user=self.admin)
		self.client.post(
			'/firstapp/coupons/archive/',
			{'coupon_ids': [self.coupon_a.id]},
			format='json',
		)

		self.client.force_authenticate(user=self.customer)
		response = self.client.post(f'/firstapp/coupons/{self.coupon_a.id}/claim/', format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('archived', str(response.data.get('error', '')).lower())

	def test_archived_active_coupon_hidden_from_pos_code_lookup(self):
		self.client.force_authenticate(user=self.admin)
		self.client.post(
			'/firstapp/coupons/archive/',
			{'coupon_ids': [self.coupon_a.id]},
			format='json',
		)

		response = self.client.get('/firstapp/coupons/?code=ARCHIVEA')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 0)

	def test_unarchived_active_coupon_visible_again_for_pos_lookup(self):
		self.client.force_authenticate(user=self.admin)
		self.client.post(
			'/firstapp/coupons/archive/',
			{'coupon_ids': [self.coupon_a.id]},
			format='json',
		)
		self.client.post(
			'/firstapp/coupons/unarchive/',
			{'coupon_ids': [self.coupon_a.id]},
			format='json',
		)

		response = self.client.get('/firstapp/coupons/?code=ARCHIVEA')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0].get('id'), self.coupon_a.id)

	def test_claim_limit_blocks_third_unique_user(self):
		user_model = get_user_model()
		claimer_one = user_model.objects.create_user(
			username='claimer_one',
			email='claimer_one@example.com',
			password='CustomerPass123!',
		)
		claimer_two = user_model.objects.create_user(
			username='claimer_two',
			email='claimer_two@example.com',
			password='CustomerPass123!',
		)
		claimer_three = user_model.objects.create_user(
			username='claimer_three',
			email='claimer_three@example.com',
			password='CustomerPass123!',
		)

		limited_coupon = Coupon.objects.create(
			code='LIMITTWO',
			criteria=self.criteria,
			status='Active',
			claim_limit=2,
		)

		self.client.force_authenticate(user=claimer_one)
		first = self.client.post(f'/firstapp/coupons/{limited_coupon.id}/claim/', format='json')
		self.assertEqual(first.status_code, status.HTTP_200_OK)

		self.client.force_authenticate(user=claimer_two)
		second = self.client.post(f'/firstapp/coupons/{limited_coupon.id}/claim/', format='json')
		self.assertEqual(second.status_code, status.HTTP_200_OK)

		self.client.force_authenticate(user=claimer_three)
		third = self.client.post(f'/firstapp/coupons/{limited_coupon.id}/claim/', format='json')
		self.assertEqual(third.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('fully claimed', str(third.data.get('error', '')).lower())

		limited_coupon.refresh_from_db()
		self.assertEqual(limited_coupon.claimed_by.count(), 2)
		self.assertEqual(limited_coupon.times_claimed, 2)


class CouponCriteriaDiscountCapTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.admin = user_model.objects.create_user(
			username='criteria_cap_admin',
			email='criteria_cap_admin@example.com',
			password='AdminPass123!',
			is_staff=True,
		)
		self.client.force_authenticate(user=self.admin)

	def test_percentage_coupon_criteria_accepts_positive_cap(self):
		response = self.client.post(
			'/firstapp/coupons-criteria/',
			{
				'name': 'Capable Percentage Promo',
				'discount_type': 'percentage',
				'discount_value': '20.00',
				'max_discount_amount': '120.00',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data.get('max_discount_amount'), '120.00')

	def test_percentage_coupon_criteria_rejects_non_positive_cap(self):
		response = self.client.post(
			'/firstapp/coupons-criteria/',
			{
				'name': 'Invalid Cap Promo',
				'discount_type': 'percentage',
				'discount_value': '15.00',
				'max_discount_amount': '0',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('max_discount_amount', response.data)

	def test_non_percentage_coupon_criteria_clears_cap(self):
		response = self.client.post(
			'/firstapp/coupons-criteria/',
			{
				'name': 'Fixed Promo No Cap',
				'discount_type': 'fixed',
				'discount_value': '75.00',
				'max_discount_amount': '200.00',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertIsNone(response.data.get('max_discount_amount'))

		created_criteria = CouponCriteria.objects.get(id=response.data['id'])
		self.assertIsNone(created_criteria.max_discount_amount)


class SalesByStaffFilteringTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.admin = user_model.objects.create_user(
			username='sales_admin',
			email='sales_admin@example.com',
			password='AdminPass123!',
			is_staff=True,
			is_superuser=True,
		)
		self.cashier_alpha = user_model.objects.create_user(
			username='cashier_alpha',
			email='cashier_alpha@example.com',
			password='CashierPass123!',
			is_staff=True,
			first_name='Alpha',
			last_name='Cashier',
		)
		self.cashier_beta = user_model.objects.create_user(
			username='cashier_beta',
			email='cashier_beta@example.com',
			password='CashierPass123!',
			is_staff=True,
			first_name='Beta',
			last_name='Cashier',
		)
		self.client.force_authenticate(user=self.admin)

	def _create_completed_receipt(self, *, cashier, total, created_at):
		return Receipt.objects.create(
			subtotal=str(total),
			vat='0.00',
			total=str(total),
			cash_given=str(total),
			change='0.00',
			created_at=created_at,
			status=Receipt.Status.COMPLETED,
			cashier=cashier,
		)

	def _to_float(self, value):
		return float(str(value or 0))

	def test_by_staff_respects_selected_date_range(self):
		now = timezone.now()
		in_range_start = now - timedelta(hours=2)
		in_range_end = now + timedelta(hours=2)

		self._create_completed_receipt(cashier=self.cashier_alpha, total='100.00', created_at=now)
		self._create_completed_receipt(cashier=self.cashier_beta, total='250.00', created_at=now)
		self._create_completed_receipt(
			cashier=self.cashier_alpha,
			total='999.00',
			created_at=now - timedelta(days=10),
		)

		response = self.client.get(
			'/firstapp/sales/by-staff/',
			{
				'start': in_range_start.isoformat(),
				'end': in_range_end.isoformat(),
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		rows = {row['name']: row for row in response.data}

		self.assertIn('Alpha Cashier', rows)
		self.assertIn('Beta Cashier', rows)
		self.assertEqual(self._to_float(rows['Alpha Cashier']['revenue']), 100.00)
		self.assertEqual(rows['Alpha Cashier']['orders'], 1)
		self.assertEqual(self._to_float(rows['Beta Cashier']['revenue']), 250.00)
		self.assertEqual(rows['Beta Cashier']['orders'], 1)

	def test_by_staff_uses_orders_as_tie_breaker_when_revenue_is_equal(self):
		now = timezone.now()
		start = now - timedelta(days=1)
		end = now + timedelta(days=1)

		self._create_completed_receipt(cashier=self.cashier_alpha, total='100.00', created_at=now)
		self._create_completed_receipt(cashier=self.cashier_alpha, total='100.00', created_at=now)
		self._create_completed_receipt(cashier=self.cashier_beta, total='200.00', created_at=now)

		response = self.client.get(
			'/firstapp/sales/by-staff/',
			{
				'start': start.isoformat(),
				'end': end.isoformat(),
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertGreaterEqual(len(response.data), 2)
		self.assertEqual(response.data[0]['name'], 'Alpha Cashier')
		self.assertEqual(self._to_float(response.data[0]['revenue']), 200.00)
		self.assertEqual(response.data[0]['orders'], 2)

	def test_by_staff_accepts_cashier_filter(self):
		now = timezone.now()
		self._create_completed_receipt(cashier=self.cashier_alpha, total='150.00', created_at=now)
		self._create_completed_receipt(cashier=self.cashier_beta, total='175.00', created_at=now)

		response = self.client.get(
			'/firstapp/sales/by-staff/',
			{'cashier': self.cashier_beta.username},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]['name'], 'Beta Cashier')
		self.assertEqual(self._to_float(response.data[0]['revenue']), 175.00)
		self.assertEqual(response.data[0]['orders'], 1)
