"""
Serializers for authentication app
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model
    """
    
    class Meta:
        model = User
        fields = [
            'id',
            'username', 
            'email',
            'first_name',
            'last_name',
            'cognito_sub',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'cognito_sub', 
            'created_at',
            'updated_at'
        ]