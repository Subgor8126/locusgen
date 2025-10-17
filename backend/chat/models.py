import uuid
from django.db import models


class ChatMessage(models.Model):
    """
    ChatMessage model for storing conversation history.
    
    Each message represents either a user input or assistant response
    in a project's conversation thread. Messages are stored with metadata
    for debugging and analytics purposes.
    """
    
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='messages',
        help_text="Project this message belongs to"
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        help_text="Whether this is a user message or assistant response"
    )
    content = models.TextField(
        help_text="The actual message content/text"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When this message was created"
    )
    metadata = models.JSONField(
        null=True,
        blank=True,
        help_text="Additional metadata (processing time, tools used, etc.)"
    )

    class Meta:
        db_table = 'chat_message'
        verbose_name = 'Chat Message'
        verbose_name_plural = 'Chat Messages'
        ordering = ['timestamp']

    def __str__(self):
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"{self.role}: {content_preview}"
