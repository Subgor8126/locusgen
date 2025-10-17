from django.contrib import admin
from .models import Project, Asset


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """Admin interface for Project model."""
    
    list_display = ('name', 'user', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('name', 'user__username', 'user__email')
    readonly_fields = ('id', 'created_at', 'updated_at')
    raw_id_fields = ('user',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'user')
        }),
        ('Scene Data', {
            'fields': ('scene_json',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    """Admin interface for Asset model."""
    
    list_display = ('name', 'creator', 'file_format', 'license_type', 'is_cached', 'created_at')
    list_filter = ('file_format', 'license_type', 'created_at', 'cached_at')
    search_fields = ('name', 'creator', 'tags')
    readonly_fields = ('id', 'is_cached', 'created_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('name', 'creator', 'license_type')
        }),
        ('URLs', {
            'fields': ('source_url', 's3_url')
        }),
        ('File Information', {
            'fields': ('file_format', 'file_size', 'tags')
        }),
        ('Caching', {
            'fields': ('cached_at', 'is_cached'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
