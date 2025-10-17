import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model extending AbstractUser for AWS Cognito integration.
    
    This model stores user information from AWS Cognito and provides
    integration with the Django authentication system.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cognito_sub = models.CharField(
        max_length=255, 
        unique=True, 
        null=True, 
        blank=True,
        help_text="AWS Cognito user identifier (sub claim from JWT)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'auth_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.username or self.email or str(self.id)
