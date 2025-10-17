import uuid
from django.conf import settings
from django.db import models


class Project(models.Model):
    """
    Project model for storing 3D scene projects.
    
    Each project represents a 3D scene generation session with associated
    conversation history and scene data. Projects can be owned by authenticated
    users or created anonymously.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Human-readable name for the project, auto-generated from first message"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='projects',
        null=True,
        blank=True,
        help_text="Owner of the project (null for anonymous projects)"
    )
    scene_json = models.JSONField(
        null=True,
        blank=True,
        help_text="Current 3D scene data in SceneJSON format"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects_project'
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.name} ({str(self.id)[:8]})"


class Asset(models.Model):
    """
    Asset model for storing 3D asset metadata and CDN information.
    
    This model tracks 3D assets downloaded from Sketchfab and cached
    in S3, providing metadata for scene generation and rendering.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=255,
        help_text="Human-readable name of the 3D asset"
    )
    source_url = models.URLField(
        help_text="Original URL from Sketchfab or other source"
    )
    s3_url = models.URLField(
        null=True,
        blank=True,
        help_text="CDN URL for the cached asset in S3"
    )
    creator = models.CharField(
        max_length=255,
        help_text="Original creator/author of the asset"
    )
    license_type = models.CharField(
        max_length=100,
        help_text="License type (e.g., CC BY, CC BY-SA, etc.)"
    )
    file_format = models.CharField(
        max_length=20,
        default='glb',
        help_text="File format (glb, gltf, etc.)"
    )
    file_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="File size in bytes"
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="List of tags/keywords for asset categorization"
    )
    cached_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when asset was cached in S3"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects_asset'
        verbose_name = 'Asset'
        verbose_name_plural = 'Assets'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} by {self.creator}"

    @property
    def is_cached(self):
        """Check if asset is cached in S3."""
        return bool(self.s3_url)
