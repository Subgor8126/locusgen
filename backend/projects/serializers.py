"""
Serializers for the projects app
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Project, Asset
from chat.models import ChatMessage

User = get_user_model()


class ProjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Project model with user association and validation
    """
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    message_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 
            'name', 
            'user', 
            'scene_json', 
            'message_count',
            'created_at', 
            'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def get_message_count(self, obj):
        """Get the number of messages in this project's conversation"""
        return obj.messages.count()
    
    def validate_name(self, value):
        """Validate project name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Project name cannot be empty")
        return value.strip()
    
    def create(self, validated_data):
        """Create project with proper user association"""
        request = self.context.get('request')
        
        # Associate with authenticated user if available
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['user'] = request.user
        
        return super().create(validated_data)


class ProjectCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating empty projects
    """
    class Meta:
        model = Project
        fields = ['name']
    
    def validate_name(self, value):
        """Validate project name"""
        if not value or not value.strip():
            # If no name provided, use default
            return "Untitled Project"
        return value.strip()
    
    def create(self, validated_data):
        """Create empty project with user association"""
        request = self.context.get('request')
        
        # Associate with authenticated user if available
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['user'] = request.user
        
        return Project.objects.create(**validated_data)


class ChatMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for ChatMessage model for conversation history
    """
    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'role',
            'content', 
            'timestamp',
            'metadata'
        ]
        read_only_fields = ['id', 'timestamp']


class ProjectDetailSerializer(ProjectSerializer):
    """
    Detailed serializer for Project with conversation history
    """
    messages = ChatMessageSerializer(many=True, read_only=True)
    
    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ['messages']


class AssetSerializer(serializers.ModelSerializer):
    """
    Serializer for Asset model
    """
    is_cached = serializers.ReadOnlyField()
    
    class Meta:
        model = Asset
        fields = [
            'id',
            'name',
            'source_url',
            's3_url', 
            'creator',
            'license_type',
            'file_format',
            'file_size',
            'tags',
            'is_cached',
            'cached_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'is_cached', 'created_at', 'updated_at']