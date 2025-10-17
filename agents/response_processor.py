"""
Agent Response Processing Utilities

This module handles processing of agent responses, extracting scene JSON data,
and formatting responses for the Django backend integration.
"""

import json
import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ProcessedResponse:
    """Represents a processed agent response."""
    message: str
    scene_json: Dict[str, Any]
    metadata: Dict[str, Any]
    tools_used: List[str]
    processing_time: float
    has_scene_changes: bool


class SceneJSONExtractor:
    """Extracts and validates scene JSON from agent responses."""
    
    def __init__(self):
        """Initialize the scene JSON extractor."""
        self.scene_json_patterns = [
            r'```json\s*(\{.*?\})\s*```',  # JSON code blocks
            r'```\s*(\{.*?\})\s*```',      # Generic code blocks with JSON
            r'\{[^{}]*"scene"[^{}]*\{.*?\}\s*\}',  # Scene JSON pattern
        ]
    
    def extract_scene_json(self, agent_response: Any) -> Dict[str, Any]:
        """
        Extract scene JSON from agent response.
        
        Args:
            agent_response: The response from the Strands Agent
            
        Returns:
            Extracted scene JSON or empty dict
        """
        try:
            # First, check if the response has structured scene data
            if hasattr(agent_response, 'scene_json'):
                return self._validate_scene_json(agent_response.scene_json)
            
            # Extract from response content/message
            content = self._get_response_content(agent_response)
            if not content:
                return {}
            
            # Try to extract JSON from the content
            extracted_json = self._extract_json_from_text(content)
            if extracted_json:
                return self._validate_scene_json(extracted_json)
            
            # Check for tool results that might contain scene data
            tool_results = self._extract_tool_results(agent_response)
            for result in tool_results:
                if 'scene' in str(result).lower():
                    scene_data = self._extract_json_from_text(str(result))
                    if scene_data:
                        return self._validate_scene_json(scene_data)
            
            return {}
            
        except Exception as e:
            logger.error(f"Error extracting scene JSON: {str(e)}")
            return {}
    
    def _get_response_content(self, agent_response: Any) -> str:
        """Get the text content from agent response."""
        if hasattr(agent_response, 'message'):
            return str(agent_response.message)
        elif hasattr(agent_response, 'content'):
            return str(agent_response.content)
        else:
            return str(agent_response)
    
    def _extract_json_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from text using various patterns."""
        # Try each pattern
        for pattern in self.scene_json_patterns:
            matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
            for match in matches:
                try:
                    parsed = json.loads(match)
                    if isinstance(parsed, dict) and 'scene' in parsed:
                        return parsed
                except json.JSONDecodeError:
                    continue
        
        # Try to find any valid JSON that looks like scene data
        json_blocks = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text)
        for block in json_blocks:
            try:
                parsed = json.loads(block)
                if isinstance(parsed, dict) and ('scene' in parsed or 'objects' in parsed):
                    return parsed
            except json.JSONDecodeError:
                continue
        
        return None
    
    def _extract_tool_results(self, agent_response: Any) -> List[Any]:
        """Extract tool results from agent response."""
        results = []
        
        if hasattr(agent_response, 'tool_results'):
            results.extend(agent_response.tool_results)
        
        if hasattr(agent_response, 'tool_calls'):
            for call in agent_response.tool_calls:
                if hasattr(call, 'result'):
                    results.append(call.result)
        
        return results
    
    def _validate_scene_json(self, scene_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and normalize scene JSON data.
        
        Args:
            scene_data: Raw scene data to validate
            
        Returns:
            Validated and normalized scene JSON
        """
        if not isinstance(scene_data, dict):
            return {}
        
        # Ensure proper scene structure
        if 'scene' not in scene_data:
            # If we have objects directly, wrap them in scene structure
            if 'objects' in scene_data:
                scene_data = {'scene': scene_data}
            else:
                return {}
        
        scene = scene_data['scene']
        
        # Validate required fields and set defaults
        validated_scene = {
            'scene': {
                'name': scene.get('name', 'Generated Scene'),
                'objects': self._validate_objects(scene.get('objects', [])),
                'lighting': self._validate_lighting(scene.get('lighting', {})),
                'camera': self._validate_camera(scene.get('camera', {}))
            }
        }
        
        return validated_scene
    
    def _validate_objects(self, objects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate scene objects."""
        validated_objects = []
        
        for obj in objects:
            if not isinstance(obj, dict):
                continue
            
            validated_obj = {
                'id': obj.get('id', f'object_{len(validated_objects)}'),
                'name': obj.get('name', 'Unnamed Object'),
                'position': self._validate_vector3(obj.get('position', {'x': 0, 'y': 0, 'z': 0})),
                'rotation': self._validate_vector3(obj.get('rotation', {'x': 0, 'y': 0, 'z': 0})),
                'scale': self._validate_vector3(obj.get('scale', {'x': 1, 'y': 1, 'z': 1}))
            }
            
            # Add asset information if available
            if 'asset' in obj:
                validated_obj['asset'] = self._validate_asset(obj['asset'])
            
            validated_objects.append(validated_obj)
        
        return validated_objects
    
    def _validate_lighting(self, lighting: Dict[str, Any]) -> Dict[str, Any]:
        """Validate lighting configuration."""
        return {
            'ambient': {
                'intensity': lighting.get('ambient', {}).get('intensity', 0.3),
                'color': self._validate_color(lighting.get('ambient', {}).get('color', {'r': 1.0, 'g': 0.9, 'b': 0.7}))
            },
            'directional': {
                'intensity': lighting.get('directional', {}).get('intensity', 0.7),
                'direction': self._validate_vector3(lighting.get('directional', {}).get('direction', {'x': 1, 'y': -1, 'z': -1})),
                'color': self._validate_color(lighting.get('directional', {}).get('color', {'r': 1.0, 'g': 1.0, 'b': 1.0}))
            }
        }
    
    def _validate_camera(self, camera: Dict[str, Any]) -> Dict[str, Any]:
        """Validate camera configuration."""
        return {
            'position': self._validate_vector3(camera.get('position', {'x': 0, 'y': 2, 'z': 5})),
            'target': self._validate_vector3(camera.get('target', {'x': 0, 'y': 0, 'z': 0}))
        }
    
    def _validate_vector3(self, vector: Dict[str, Any]) -> Dict[str, float]:
        """Validate 3D vector."""
        return {
            'x': float(vector.get('x', 0)),
            'y': float(vector.get('y', 0)),
            'z': float(vector.get('z', 0))
        }
    
    def _validate_color(self, color: Dict[str, Any]) -> Dict[str, float]:
        """Validate color values."""
        return {
            'r': max(0.0, min(1.0, float(color.get('r', 1.0)))),
            'g': max(0.0, min(1.0, float(color.get('g', 1.0)))),
            'b': max(0.0, min(1.0, float(color.get('b', 1.0))))
        }
    
    def _validate_asset(self, asset: Dict[str, Any]) -> Dict[str, Any]:
        """Validate asset information."""
        return {
            'glb_url': asset.get('glb_url', ''),
            'format': asset.get('format', 'glb'),
            'size': asset.get('size', 0)
        }


class MetadataExtractor:
    """Extracts metadata from agent responses."""
    
    def extract_metadata(
        self, 
        agent_response: Any, 
        processing_start_time: datetime,
        is_first_message: bool = False
    ) -> Dict[str, Any]:
        """
        Extract metadata from agent response.
        
        Args:
            agent_response: The agent response object
            processing_start_time: When processing started
            is_first_message: Whether this is the first message
            
        Returns:
            Metadata dictionary
        """
        processing_time = (datetime.now() - processing_start_time).total_seconds()
        
        metadata = {
            'processing_time': processing_time,
            'timestamp': datetime.now().isoformat(),
            'is_first_message': is_first_message,
            'tools_used': self._extract_tools_used(agent_response),
            'model_info': self._extract_model_info(agent_response),
            'response_type': self._determine_response_type(agent_response)
        }
        
        # Add token usage if available
        token_usage = self._extract_token_usage(agent_response)
        if token_usage:
            metadata['token_usage'] = token_usage
        
        # Add error information if present
        error_info = self._extract_error_info(agent_response)
        if error_info:
            metadata['errors'] = error_info
        
        return metadata
    
    def _extract_tools_used(self, agent_response: Any) -> List[str]:
        """Extract list of tools used in the response."""
        tools_used = []
        
        if hasattr(agent_response, 'tool_calls'):
            for call in agent_response.tool_calls:
                if hasattr(call, 'name'):
                    tools_used.append(call.name)
                elif hasattr(call, 'function') and hasattr(call.function, 'name'):
                    tools_used.append(call.function.name)
        
        return tools_used
    
    def _extract_model_info(self, agent_response: Any) -> Dict[str, Any]:
        """Extract model information from response."""
        model_info = {}
        
        if hasattr(agent_response, 'model'):
            model_info['model_id'] = getattr(agent_response.model, 'model_id', 'unknown')
        
        return model_info
    
    def _extract_token_usage(self, agent_response: Any) -> Optional[Dict[str, int]]:
        """Extract token usage information."""
        if hasattr(agent_response, 'usage'):
            usage = agent_response.usage
            return {
                'prompt_tokens': getattr(usage, 'prompt_tokens', 0),
                'completion_tokens': getattr(usage, 'completion_tokens', 0),
                'total_tokens': getattr(usage, 'total_tokens', 0)
            }
        return None
    
    def _extract_error_info(self, agent_response: Any) -> Optional[List[Dict[str, Any]]]:
        """Extract error information if present."""
        errors = []
        
        if hasattr(agent_response, 'errors'):
            for error in agent_response.errors:
                errors.append({
                    'type': type(error).__name__,
                    'message': str(error),
                    'timestamp': datetime.now().isoformat()
                })
        
        return errors if errors else None
    
    def _determine_response_type(self, agent_response: Any) -> str:
        """Determine the type of response."""
        if hasattr(agent_response, 'tool_calls') and agent_response.tool_calls:
            return 'tool_response'
        elif 'scene' in str(agent_response).lower():
            return 'scene_generation'
        else:
            return 'conversation'


class ResponseProcessor:
    """Main response processor that coordinates extraction and validation."""
    
    def __init__(self):
        """Initialize the response processor."""
        self.scene_extractor = SceneJSONExtractor()
        self.metadata_extractor = MetadataExtractor()
    
    def process_agent_response(
        self, 
        agent_response: Any, 
        processing_start_time: datetime,
        is_first_message: bool = False
    ) -> ProcessedResponse:
        """
        Process a complete agent response.
        
        Args:
            agent_response: The agent response object
            processing_start_time: When processing started
            is_first_message: Whether this is the first message
            
        Returns:
            ProcessedResponse object with all extracted data
        """
        try:
            # Extract message content
            message = self._extract_message_content(agent_response)
            
            # Extract scene JSON
            scene_json = self.scene_extractor.extract_scene_json(agent_response)
            
            # Extract metadata
            metadata = self.metadata_extractor.extract_metadata(
                agent_response, 
                processing_start_time, 
                is_first_message
            )
            
            # Determine if there are scene changes
            has_scene_changes = bool(scene_json and scene_json.get('scene', {}).get('objects'))
            
            processing_time = (datetime.now() - processing_start_time).total_seconds()
            
            return ProcessedResponse(
                message=message,
                scene_json=scene_json,
                metadata=metadata,
                tools_used=metadata.get('tools_used', []),
                processing_time=processing_time,
                has_scene_changes=has_scene_changes
            )
            
        except Exception as e:
            logger.error(f"Error processing agent response: {str(e)}")
            
            # Return error response
            processing_time = (datetime.now() - processing_start_time).total_seconds()
            return ProcessedResponse(
                message=f"Error processing response: {str(e)}",
                scene_json={},
                metadata={
                    'error': str(e),
                    'processing_time': processing_time,
                    'tools_used': [],
                    'timestamp': datetime.now().isoformat()
                },
                tools_used=[],
                processing_time=processing_time,
                has_scene_changes=False
            )
    
    def _extract_message_content(self, agent_response: Any) -> str:
        """Extract the main message content from agent response."""
        if hasattr(agent_response, 'message'):
            return str(agent_response.message)
        elif hasattr(agent_response, 'content'):
            return str(agent_response.content)
        else:
            return str(agent_response)


# Utility functions
def create_mock_scene_response(user_message: str) -> Dict[str, Any]:
    """
    Create a mock scene response for testing purposes.
    
    Args:
        user_message: The user's input message
        
    Returns:
        Mock scene JSON response
    """
    # Simple keyword-based scene generation for testing
    scene_name = "Generated Scene"
    objects = []
    
    if "living room" in user_message.lower():
        scene_name = "Cozy Living Room"
        objects = [
            {
                "id": "fireplace_001",
                "name": "Stone Fireplace",
                "position": {"x": 0, "y": 0, "z": -2},
                "rotation": {"x": 0, "y": 0, "z": 0},
                "scale": {"x": 1, "y": 1, "z": 1},
                "asset": {
                    "glb_url": "https://example.com/fireplace.glb",
                    "format": "glb",
                    "size": 2048576
                }
            }
        ]
    elif "bedroom" in user_message.lower():
        scene_name = "Comfortable Bedroom"
        objects = [
            {
                "id": "bed_001",
                "name": "Queen Bed",
                "position": {"x": 0, "y": 0, "z": 0},
                "rotation": {"x": 0, "y": 0, "z": 0},
                "scale": {"x": 1, "y": 1, "z": 1},
                "asset": {
                    "glb_url": "https://example.com/bed.glb",
                    "format": "glb",
                    "size": 1024000
                }
            }
        ]
    
    return {
        "scene": {
            "name": scene_name,
            "objects": objects,
            "lighting": {
                "ambient": {
                    "intensity": 0.3,
                    "color": {"r": 1.0, "g": 0.9, "b": 0.7}
                },
                "directional": {
                    "intensity": 0.7,
                    "direction": {"x": 1, "y": -1, "z": -1},
                    "color": {"r": 1.0, "g": 1.0, "b": 1.0}
                }
            },
            "camera": {
                "position": {"x": 0, "y": 2, "z": 5},
                "target": {"x": 0, "y": 0, "z": 0}
            }
        }
    }