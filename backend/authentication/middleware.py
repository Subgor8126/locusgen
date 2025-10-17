"""
Custom authentication middleware for handling both authenticated and anonymous users
"""

from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from .authentication import CognitoJWTAuthentication

User = get_user_model()


class CognitoAuthenticationMiddleware:
    """
    Middleware that handles both Cognito JWT authentication and anonymous users
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.cognito_auth = CognitoJWTAuthentication()

    def __call__(self, request):
        # Try to authenticate with Cognito JWT
        try:
            user_auth_tuple = self.cognito_auth.authenticate(request)
            if user_auth_tuple is not None:
                user, token = user_auth_tuple
                request.user = user
                request.auth = token
            else:
                # No authentication provided, use anonymous user
                request.user = AnonymousUser()
                request.auth = None
        except Exception:
            # Authentication failed, use anonymous user
            request.user = AnonymousUser()
            request.auth = None

        response = self.get_response(request)
        return response


class SessionAuthenticationMiddleware:
    """
    Middleware that ensures anonymous users get proper session handling
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Ensure session is created for anonymous users
        if not request.user.is_authenticated:
            if not request.session.session_key:
                request.session.create()
        
        response = self.get_response(request)
        return response