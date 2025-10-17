"""
URL configuration for chat app
"""

from django.urls import path
from . import views

app_name = 'chat'

urlpatterns = [
    # Chat endpoints will be added in later tasks
    # path('conversations/', views.ConversationListView.as_view(), name='conversation-list'),
    # path('conversations/<int:pk>/', views.ConversationDetailView.as_view(), name='conversation-detail'),
    # path('conversations/<int:conversation_id>/messages/', views.MessageListView.as_view(), name='message-list'),
]