"""
Authentication views for AWS Cognito integration
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .authentication import CognitoJWTAuthentication
from .serializers import UserSerializer

User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_status(request):
    """
    Get current authentication status
    Returns user info if authenticated, null if anonymous
    """
    # Debug: Log authentication attempt
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    print(f"🔍 Auth status request - Authorization header: {auth_header[:50]}...")
    print(f"🔍 User authenticated: {request.user.is_authenticated}")
    print(f"🔍 User: {request.user}")
    
    if request.user.is_authenticated:
        serializer = UserSerializer(request.user)
        return Response({
            'authenticated': True,
            'user': serializer.data
        })
    else:
        return Response({
            'authenticated': False,
            'user': None
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_token(request):
    """
    Validate Cognito JWT token and return user info
    This endpoint can be used by the frontend to validate tokens
    """
    auth = CognitoJWTAuthentication()
    
    try:
        user_auth_tuple = auth.authenticate(request)
        if user_auth_tuple is None:
            return Response({
                'valid': False,
                'error': 'No authentication credentials provided'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        user, token = user_auth_tuple
        serializer = UserSerializer(user)
        
        return Response({
            'valid': True,
            'user': serializer.data
        })
        
    except Exception as e:
        return Response({
            'valid': False,
            'error': str(e)
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([AllowAny])
def profile(request):
    """
    Get current user profile (requires authentication)
    """
    if not request.user.is_authenticated:
        return Response({
            'error': 'Authentication required'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
