from django.contrib import admin
from .models import ChatMessage


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    """Admin interface for ChatMessage model."""
    
    list_display = ('project', 'role', 'content_preview', 'timestamp')
    list_filter = ('role', 'timestamp')
    search_fields = ('content', 'project__name')
    readonly_fields = ('id', 'timestamp')
    raw_id_fields = ('project',)
    
    fieldsets = (
        (None, {
            'fields': ('project', 'role', 'content')
        }),
        ('Metadata', {
            'fields': ('metadata', 'id', 'timestamp'),
            'classes': ('collapse',)
        }),
    )
    
    def content_preview(self, obj):
        """Show a preview of the message content."""
        return obj.content[:100] + "..." if len(obj.content) > 100 else obj.content
    content_preview.short_description = 'Content Preview'
