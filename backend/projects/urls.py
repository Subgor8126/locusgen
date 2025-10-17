"""
URL configuration for projects app
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'projects'

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'projects'

urlpatterns = [
    # Assets endpoints (must come first to avoid conflicts)
    path('assets/', views.AssetListView.as_view(), name='asset-list'),
    path('assets/<uuid:pk>/', views.AssetDetailView.as_view(), name='asset-detail'),
    
    # Project endpoints
    path('', views.ProjectViewSet.as_view({'get': 'list', 'post': 'create'}), name='project-list'),
    path('<uuid:pk>/', views.ProjectViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='project-detail'),
    path('<uuid:pk>/messages/', views.ProjectViewSet.as_view({'get': 'messages'}), name='project-messages'),
    path('<uuid:pk>/chat/', views.ProjectViewSet.as_view({'post': 'chat'}), name='project-chat'),
]