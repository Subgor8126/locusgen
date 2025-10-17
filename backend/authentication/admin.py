from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for custom User model."""
    
    list_display = ('username', 'email', 'first_name', 'last_name', 'cognito_sub', 'is_staff', 'created_at')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'created_at')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'cognito_sub')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('AWS Cognito Integration', {
            'fields': ('cognito_sub',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
