from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase


class AccountReactivationFlowTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.password = 'StrongPassword123!'

        self.deactivated_user = user_model.objects.create_user(
            username='reactivate_target',
            email='reactivate_target@example.com',
            password=self.password,
            is_active=False,
        )
        self.deactivated_user.profile.deactivated_at = timezone.now() - timedelta(days=3)
        self.deactivated_user.profile.save(update_fields=['deactivated_at'])

        self.pending_user = user_model.objects.create_user(
            username='pending_reactivation',
            email='pending_reactivation@example.com',
            password=self.password,
            is_active=False,
        )

    def test_deactivated_login_returns_reactivation_hint(self):
        response = self.client.post(
            '/firstapp/token/',
            {
                'username': self.deactivated_user.username,
                'password': self.password,
                'platform': 'app',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('deactivated', str(response.data.get('detail', '')).lower())

    def test_reactivate_deactivated_account_then_login_success(self):
        response = self.client.post(
            '/firstapp/users/reactivate/',
            {
                'username': self.deactivated_user.username,
                'password': self.password,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('reactivated', str(response.data.get('message', '')).lower())

        self.deactivated_user.refresh_from_db()
        self.assertTrue(self.deactivated_user.is_active)
        self.assertIsNone(self.deactivated_user.profile.deactivated_at)

        login_response = self.client.post(
            '/firstapp/token/',
            {
                'username': self.deactivated_user.username,
                'password': self.password,
                'platform': 'app',
            },
            format='json',
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_response.data)
        self.assertIn('refresh', login_response.data)

    def test_reactivation_rejects_incorrect_password(self):
        response = self.client.post(
            '/firstapp/users/reactivate/',
            {
                'username': self.deactivated_user.username,
                'password': 'WrongPassword123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('incorrect password', str(response.data.get('error', '')).lower())

        self.deactivated_user.refresh_from_db()
        self.assertFalse(self.deactivated_user.is_active)
        self.assertIsNotNone(self.deactivated_user.profile.deactivated_at)

    def test_reactivation_rejects_pending_verification_account(self):
        response = self.client.post(
            '/firstapp/users/reactivate/',
            {
                'username': self.pending_user.username,
                'password': self.password,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('verify your email', str(response.data.get('error', '')).lower())

        self.pending_user.refresh_from_db()
        self.assertFalse(self.pending_user.is_active)
        self.assertIsNone(self.pending_user.profile.deactivated_at)
