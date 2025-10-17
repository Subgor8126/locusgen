"""
Conversation History Utilities

This module provides utilities for converting between Django model format
and Strands Agents conversation format, handling conversation context,
and managing conversation state.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class DjangoMessage:
    """Represents a message from Django ChatMessage model."""
    id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


class ConversationConverter:
    """Handles conversion between Django and Strands conversation formats."""
    
    @staticmethod
    def django_to_strands(django_messages: List[DjangoMessage]) -> List[Dict[str, Any]]:
        """
        Convert Django ChatMessage objects to Strands Agent message format.
        
        Args:
            django_messages: List of Django ChatMessage objects
            
        Returns:
            List of messages in Strands format
        """
        strands_messages = []
        
        for msg in django_messages:
            strands_message = {
                "role": msg.role,
                "content": msg.content
            }
            
            # Add timestamp and metadata if available
            if msg.metadata:
                strands_message["metadata"] = msg.metadata
            
            # Add timestamp to metadata
            if "metadata" not in strands_message:
                strands_message["metadata"] = {}
            strands_message["metadata"]["timestamp"] = msg.timestamp.isoformat()
            strands_message["metadata"]["message_id"] = msg.id
            
            strands_messages.append(strands_message)
        
        logger.debug(f"Converted {len(django_messages)} Django messages to Strands format")
        return strands_messages
    
    @staticmethod
    def strands_to_django_format(
        role: str, 
        content: str, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Convert Strands Agent response to Django ChatMessage format.
        
        Args:
            role: Message role ('user' or 'assistant')
            content: Message content
            metadata: Optional metadata
            
        Returns:
            Dictionary in Django ChatMessage format
        """
        django_message = {
            "role": role,
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.now()
        }
        
        return django_message


class ConversationContextManager:
    """Manages conversation context and history for optimal agent performance."""
    
    def __init__(self, max_context_messages: int = 20):
        """
        Initialize the context manager.
        
        Args:
            max_context_messages: Maximum number of messages to keep in context
        """
        self.max_context_messages = max_context_messages
    
    def prepare_context(
        self, 
        messages: List[DjangoMessage], 
        include_system_context: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Prepare conversation context for the agent.
        
        Args:
            messages: List of Django messages
            include_system_context: Whether to include system context information
            
        Returns:
            Prepared context messages for the agent
        """
        # Sort messages by timestamp
        sorted_messages = sorted(messages, key=lambda x: x.timestamp)
        
        # Limit to recent messages to stay within context window
        if len(sorted_messages) > self.max_context_messages:
            # Keep the most recent messages
            sorted_messages = sorted_messages[-self.max_context_messages:]
            logger.info(f"Trimmed conversation to {self.max_context_messages} recent messages")
        
        # Convert to Strands format
        strands_messages = ConversationConverter.django_to_strands(sorted_messages)
        
        # Add system context if requested
        if include_system_context and strands_messages:
            self._add_system_context(strands_messages)
        
        return strands_messages
    
    def _add_system_context(self, messages: List[Dict[str, Any]]) -> None:
        """
        Add system context information to messages.
        
        Args:
            messages: List of messages to enhance with context
        """
        # Add conversation summary if we have many messages
        if len(messages) > 10:
            summary = self._generate_conversation_summary(messages[:5])
            
            # Insert summary as system context
            system_context = {
                "role": "system",
                "content": f"Previous conversation summary: {summary}",
                "metadata": {
                    "type": "conversation_summary",
                    "timestamp": datetime.now().isoformat()
                }
            }
            messages.insert(0, system_context)
    
    def _generate_conversation_summary(self, early_messages: List[Dict[str, Any]]) -> str:
        """
        Generate a summary of early conversation messages.
        
        Args:
            early_messages: Early messages to summarize
            
        Returns:
            Conversation summary string
        """
        # Simple summary generation - could be enhanced with LLM summarization
        topics = []
        scene_mentions = []
        
        for msg in early_messages:
            content = msg.get("content", "").lower()
            
            # Extract scene-related keywords
            scene_keywords = ["room", "scene", "environment", "space", "area"]
            for keyword in scene_keywords:
                if keyword in content and keyword not in scene_mentions:
                    scene_mentions.append(keyword)
            
            # Extract object mentions
            object_keywords = ["fireplace", "chair", "table", "light", "wall", "floor"]
            for keyword in object_keywords:
                if keyword in content and keyword not in topics:
                    topics.append(keyword)
        
        summary_parts = []
        if scene_mentions:
            summary_parts.append(f"Scene types discussed: {', '.join(scene_mentions)}")
        if topics:
            summary_parts.append(f"Objects mentioned: {', '.join(topics[:5])}")
        
        return "; ".join(summary_parts) if summary_parts else "General 3D scene discussion"


class ConversationStateManager:
    """Manages conversation state and project context."""
    
    def __init__(self):
        """Initialize the state manager."""
        self.current_scene_state = {}
        self.project_metadata = {}
    
    def update_scene_state(self, scene_json: Dict[str, Any]) -> None:
        """
        Update the current scene state.
        
        Args:
            scene_json: New scene JSON data
        """
        if scene_json and isinstance(scene_json, dict):
            self.current_scene_state.update(scene_json)
            logger.debug("Updated scene state with new data")
    
    def get_scene_context(self) -> Dict[str, Any]:
        """
        Get current scene context for the agent.
        
        Returns:
            Current scene context information
        """
        return {
            "current_scene": self.current_scene_state,
            "scene_objects_count": len(self.current_scene_state.get("scene", {}).get("objects", [])),
            "has_lighting": "lighting" in self.current_scene_state.get("scene", {}),
            "has_camera": "camera" in self.current_scene_state.get("scene", {}),
            "last_updated": datetime.now().isoformat()
        }
    
    def set_project_metadata(self, metadata: Dict[str, Any]) -> None:
        """
        Set project metadata.
        
        Args:
            metadata: Project metadata dictionary
        """
        self.project_metadata = metadata
        logger.debug("Updated project metadata")
    
    def get_project_context(self) -> Dict[str, Any]:
        """
        Get project context information.
        
        Returns:
            Project context dictionary
        """
        return {
            "project_metadata": self.project_metadata,
            "scene_context": self.get_scene_context(),
            "timestamp": datetime.now().isoformat()
        }


def create_conversation_context(
    django_messages: List[DjangoMessage],
    project_metadata: Optional[Dict[str, Any]] = None,
    current_scene: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create comprehensive conversation context for the agent.
    
    Args:
        django_messages: List of Django ChatMessage objects
        project_metadata: Optional project metadata
        current_scene: Optional current scene state
        
    Returns:
        Complete conversation context
    """
    context_manager = ConversationContextManager()
    state_manager = ConversationStateManager()
    
    # Set up state
    if project_metadata:
        state_manager.set_project_metadata(project_metadata)
    if current_scene:
        state_manager.update_scene_state(current_scene)
    
    # Prepare conversation messages
    messages = context_manager.prepare_context(django_messages)
    
    # Create complete context
    context = {
        "messages": messages,
        "project_context": state_manager.get_project_context(),
        "conversation_length": len(django_messages),
        "prepared_at": datetime.now().isoformat()
    }
    
    return context


# Utility functions for common operations
def extract_scene_changes(
    old_scene: Dict[str, Any], 
    new_scene: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Extract changes between two scene states.
    
    Args:
        old_scene: Previous scene state
        new_scene: New scene state
        
    Returns:
        Dictionary describing the changes
    """
    changes = {
        "objects_added": [],
        "objects_removed": [],
        "objects_modified": [],
        "lighting_changed": False,
        "camera_changed": False
    }
    
    old_objects = old_scene.get("scene", {}).get("objects", [])
    new_objects = new_scene.get("scene", {}).get("objects", [])
    
    old_object_ids = {obj.get("id") for obj in old_objects}
    new_object_ids = {obj.get("id") for obj in new_objects}
    
    # Find added and removed objects
    changes["objects_added"] = list(new_object_ids - old_object_ids)
    changes["objects_removed"] = list(old_object_ids - new_object_ids)
    
    # Check for lighting changes
    old_lighting = old_scene.get("scene", {}).get("lighting", {})
    new_lighting = new_scene.get("scene", {}).get("lighting", {})
    changes["lighting_changed"] = old_lighting != new_lighting
    
    # Check for camera changes
    old_camera = old_scene.get("scene", {}).get("camera", {})
    new_camera = new_scene.get("scene", {}).get("camera", {})
    changes["camera_changed"] = old_camera != new_camera
    
    return changes


def format_conversation_for_display(messages: List[DjangoMessage]) -> List[Dict[str, Any]]:
    """
    Format conversation messages for display purposes.
    
    Args:
        messages: List of Django messages
        
    Returns:
        Formatted messages for display
    """
    formatted = []
    
    for msg in messages:
        formatted_msg = {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat(),
            "metadata": msg.metadata or {}
        }
        formatted.append(formatted_msg)
    
    return formatted