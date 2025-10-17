"""
URL configuration for authentication app
"""

from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    path('status/', views.auth_status, name='auth-status'),
    path('validate/', views.validate_token, name='validate-token'),
    path('profile/', views.profile, name='profile'),
]