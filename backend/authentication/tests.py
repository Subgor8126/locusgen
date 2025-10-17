"""
Tests for authentication app
"""

import json
import jwt
from unittest.mock import patch, MagicMock
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .authentication import CognitoJWTAuthentication

User = get_user_model()


class CognitoJWTAuthenticationTest(TestCase):
    """Test Cognito JWT authentication"""
    
    def setUp(self):
        self.auth = CognitoJWTAuthentication()
        self.client = APIClient()
    
    def test_no_auth_header(self):
        """Test request without authorization header"""
        request = MagicMock()
        request.META = {}
        
        result = self.auth.authenticate(request)
        self.assertIsNone(result)
    
    def test_invalid_auth_header(self):
        """Test request with invalid authorization header"""
        request = MagicMock()
        request.META = {'HTTP_AUTHORIZATION': 'Invalid token'}
        
        result = self.auth.authenticate(request)
        self.assertIsNone(result)
    
    @patch('authentication.authentication.requests.get')
    @patch('authentication.authentication.jwt.decode')
    @patch('authentication.authentication.jwt.get_unverified_header')
    def test_valid_token_new_user(self, mock_header, mock_decode, mock_requests):
        """Test valid token with new user creation"""
        # Mock JWT header
        mock_header.return_value = {'kid': 'test-key-id'}
        
        # Mock JWKS response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'keys': [{
                'kid': 'test-key-id',
                'kty': 'RSA',
                'n': 'test-n',
                'e': 'AQAB'
            }]
        }
        mock_requests.return_value = mock_response
        
        # Mock JWT decode
        mock_decode.return_value = {
            'sub': 'test-cognito-sub',
            'email': 'test@example.com',
            'cognito:username': 'testuser',
            'given_name': 'Test',
            'family_name': 'User'
        }
        
        # Create mock request
        request = MagicMock()
        request.META = {'HTTP_AUTHORIZATION': 'Bearer valid-token'}
        
        # Test authentication
        user, token = self.auth.authenticate(request)
        
        # Verify user was created
        self.assertIsNotNone(user)
        self.assertEqual(user.cognito_sub, 'test-cognito-sub')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(token, 'valid-token')
    
    @patch('authentication.authentication.requests.get')
    @patch('authentication.authentication.jwt.decode')
    @patch('authentication.authentication.jwt.get_unverified_header')
    def test_valid_token_existing_user(self, mock_header, mock_decode, mock_requests):
        """Test valid token with existing user"""
        # Create existing user
        existing_user = User.objects.create_user(
            username='testuser',
            email='old@example.com',
            cognito_sub='test-cognito-sub'
        )
        
        # Mock JWT header
        mock_header.return_value = {'kid': 'test-key-id'}
        
        # Mock JWKS response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'keys': [{
                'kid': 'test-key-id',
                'kty': 'RSA',
                'n': 'test-n',
                'e': 'AQAB'
            }]
        }
        mock_requests.return_value = mock_response
        
        # Mock JWT decode with updated info
        mock_decode.return_value = {
            'sub': 'test-cognito-sub',
            'email': 'updated@example.com',
            'cognito:username': 'testuser',
            'given_name': 'Updated',
            'family_name': 'User'
        }
        
        # Create mock request
        request = MagicMock()
        request.META = {'HTTP_AUTHORIZATION': 'Bearer valid-token'}
        
        # Test authentication
        user, token = self.auth.authenticate(request)
        
        # Verify user was updated
        self.assertEqual(user.id, existing_user.id)
        self.assertEqual(user.email, 'updated@example.com')
        self.assertEqual(user.first_name, 'Updated')


class AuthenticationViewsTest(APITestCase):
    """Test authentication views"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            cognito_sub='test-cognito-sub'
        )
    
    def test_auth_status_anonymous(self):
        """Test auth status for anonymous user"""
        url = reverse('authentication:auth-status')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['authenticated'], False)
        self.assertIsNone(response.data['user'])
    
    def test_auth_status_authenticated(self):
        """Test auth status for authenticated user"""
        self.client.force_authenticate(user=self.user)
        url = reverse('authentication:auth-status')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['authenticated'], True)
        self.assertIsNotNone(response.data['user'])
        self.assertEqual(response.data['user']['id'], str(self.user.id))
    
    def test_profile_anonymous(self):
        """Test profile endpoint for anonymous user"""
        url = reverse('authentication:profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_profile_authenticated(self):
        """Test profile endpoint for authenticated user"""
        self.client.force_authenticate(user=self.user)
        url = reverse('authentication:profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.user.id))
        self.assertEqual(response.data['email'], self.user.email)
    
    @patch('authentication.views.CognitoJWTAuthentication.authenticate')
    def test_validate_token_valid(self, mock_authenticate):
        """Test token validation with valid token"""
        mock_authenticate.return_value = (self.user, 'valid-token')
        
        url = reverse('authentication:validate-token')
        response = self.client.post(url, HTTP_AUTHORIZATION='Bearer valid-token')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['valid'], True)
        self.assertEqual(response.data['user']['id'], str(self.user.id))
    
    @patch('authentication.views.CognitoJWTAuthentication.authenticate')
    def test_validate_token_invalid(self, mock_authenticate):
        """Test token validation with invalid token"""
        mock_authenticate.side_effect = Exception('Invalid token')
        
        url = reverse('authentication:validate-token')
        response = self.client.post(url, HTTP_AUTHORIZATION='Bearer invalid-token')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['valid'], False)
        self.assertIn('error', response.data)


class SessionAuthenticationTest(APITestCase):
    """Test session authentication for anonymous users"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_anonymous_session_creation(self):
        """Test that anonymous users get proper session handling"""
        # Make a request that should create a session
        url = reverse('authentication:auth-status')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['authenticated'], False)
        
        # Check that session was created
        self.assertIsNotNone(self.client.session.session_key)