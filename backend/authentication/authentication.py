"""
AWS Cognito JWT Authentication for Django REST Framework
"""

import jwt
import requests
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework import authentication, exceptions
from rest_framework.authentication import get_authorization_header
from django.contrib.auth import get_user_model

User = get_user_model()


class CognitoJWTAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class for AWS Cognito JWT tokens
    """
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        auth_header = get_authorization_header(request).split()
        
        print(f"🔍 Auth header: {auth_header}")
        
        if not auth_header or auth_header[0].lower() != b'bearer':
            print("❌ No Bearer token found")
            return None
            
        if len(auth_header) == 1:
            msg = 'Invalid token header. No credentials provided.'
            print(f"❌ {msg}")
            raise exceptions.AuthenticationFailed(msg)
        elif len(auth_header) > 2:
            msg = 'Invalid token header. Token string should not contain spaces.'
            print(f"❌ {msg}")
            raise exceptions.AuthenticationFailed(msg)
            
        try:
            token = auth_header[1].decode('utf-8')
            print(f"✅ Token extracted: {len(token)} characters")
        except UnicodeError:
            msg = 'Invalid token header. Token string should not contain invalid characters.'
            print(f"❌ {msg}")
            raise exceptions.AuthenticationFailed(msg)
            
        return self.authenticate_credentials(token)
    
    def authenticate_credentials(self, token):
        """
        Authenticate the token and return user
        """
        try:
            # Debug: Log token info
            print(f"🔍 Authenticating token: {token[:50]}...")
            
            # Get the JWT header to extract the key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header['kid']
            print(f"🔑 Token kid: {kid}")
            
            # Get the public key from Cognito
            public_key = self.get_cognito_public_key(kid)
            print(f"✅ Got public key for kid: {kid}")
            
            # Debug: Check settings
            print(f"🏗️ Expected audience: {settings.AWS_COGNITO_APP_CLIENT_ID}")
            print(f"🏗️ Expected issuer: https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.AWS_COGNITO_USER_POOL_ID}")
            
            # Verify and decode the token (without audience validation first)
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                issuer=f'https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.AWS_COGNITO_USER_POOL_ID}',
                options={"verify_aud": False}  # We'll verify client_id manually
            )
            
            # Manually verify client_id (Cognito uses client_id instead of aud for access tokens)
            token_client_id = payload.get('client_id')
            if token_client_id != settings.AWS_COGNITO_APP_CLIENT_ID:
                raise jwt.InvalidTokenError(f'Invalid client_id. Expected: {settings.AWS_COGNITO_APP_CLIENT_ID}, Got: {token_client_id}')
            
            # Verify this is an access token
            token_use = payload.get('token_use')
            if token_use != 'access':
                raise jwt.InvalidTokenError(f'Invalid token_use. Expected: access, Got: {token_use}')
            
            print(f"✅ Token validation successful. Client ID: {token_client_id}, Token use: {token_use}")
            
            print(f"✅ Token decoded successfully. Sub: {payload.get('sub')}")
            
            # Get or create user based on Cognito sub (user ID)
            user = self.get_or_create_user(payload)
            
            return (user, token)
            
        except jwt.ExpiredSignatureError as e:
            print(f"❌ Token expired: {e}")
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as e:
            print(f"❌ Invalid token: {e}")
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')
    
    def get_cognito_public_key(self, kid):
        """
        Get the public key from Cognito JWKS endpoint
        """
        if not hasattr(self, '_jwks_cache'):
            jwks_url = f'https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.AWS_COGNITO_USER_POOL_ID}/.well-known/jwks.json'
            response = requests.get(jwks_url)
            response.raise_for_status()
            self._jwks_cache = response.json()
        
        # Find the key with matching kid
        for key in self._jwks_cache['keys']:
            if key['kid'] == kid:
                # Convert JWK to PEM format
                return jwt.algorithms.RSAAlgorithm.from_jwk(key)
        
        raise exceptions.AuthenticationFailed('Unable to find appropriate key')
    
    def get_or_create_user(self, payload):
        """
        Get or create a Django user based on Cognito payload
        """
        cognito_sub = payload.get('sub')
        email = payload.get('email', '')
        username = payload.get('cognito:username', email or cognito_sub)
        
        if not cognito_sub:
            raise exceptions.AuthenticationFailed('Token missing required claims')
        
        try:
            # Try to get existing user by cognito_sub
            user = User.objects.get(cognito_sub=cognito_sub)
            # Update user info if it has changed
            user.email = email
            user.first_name = payload.get('given_name', '')
            user.last_name = payload.get('family_name', '')
            user.save()
        except User.DoesNotExist:
            # Create new user
            user = User.objects.create_user(
                username=username,
                email=email,
                cognito_sub=cognito_sub,
                first_name=payload.get('given_name', ''),
                last_name=payload.get('family_name', ''),
            )
        
        return user