"""
Views for the projects app
"""

from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import AnonymousUser

from .models import Project, Asset
from .serializers import (
    ProjectSerializer, 
    ProjectCreateSerializer, 
    ProjectDetailSerializer,
    AssetSerializer,
    ChatMessageSerializer
)
from authentication.authentication import CognitoJWTAuthentication


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Project CRUD operations with authentication support
    
    Supports both authenticated users (via Cognito JWT) and anonymous users.
    Anonymous users can create and access projects, but cannot list all projects.
    Authenticated users can only access their own projects.
    """
    serializer_class = ProjectSerializer
    authentication_classes = [CognitoJWTAuthentication, SessionAuthentication]
    permission_classes = [permissions.AllowAny]  # Custom permission logic in methods
    
    def get_queryset(self):
        """
        Return projects based on user authentication status
        """
        if self.request.user.is_authenticated:
            # Authenticated users see only their projects
            return Project.objects.filter(user=self.request.user)
        else:
            # Anonymous users cannot list projects
            return Project.objects.none()
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action
        """
        if self.action == 'create':
            return ProjectCreateSerializer
        elif self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a new empty project
        
        Both authenticated and anonymous users can create projects.
        Authenticated users will have the project associated with their account.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create the project
        project = serializer.save()
        
        # Return the created project with full details
        response_serializer = ProjectDetailSerializer(project, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a specific project with conversation history
        
        Anonymous users can access any project by ID.
        Authenticated users can only access their own projects.
        """
        project_id = kwargs.get('pk')
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check ownership for authenticated users
        if request.user.is_authenticated and project.user != request.user:
            return Response(
                {'error': 'You do not have permission to access this project'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)
    
    def list(self, request, *args, **kwargs):
        """
        List projects for authenticated users only
        
        Anonymous users cannot list projects and will receive an empty list.
        """
        if not request.user.is_authenticated:
            return Response(
                {'results': [], 'count': 0}, 
                status=status.HTTP_200_OK
            )
        
        return super().list(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """
        Update a project (full update)
        """
        return self._update_project(request, partial=False, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """
        Partially update a project
        """
        return self._update_project(request, partial=True, *args, **kwargs)
    
    def _update_project(self, request, partial=False, *args, **kwargs):
        """
        Common update logic with ownership validation
        """
        project_id = kwargs.get('pk')
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check ownership for authenticated users
        if request.user.is_authenticated and project.user != request.user:
            return Response(
                {'error': 'You do not have permission to modify this project'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Anonymous users can only update projects they created (no user association)
        if not request.user.is_authenticated and project.user is not None:
            return Response(
                {'error': 'You do not have permission to modify this project'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(project, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a project with ownership validation
        """
        project_id = kwargs.get('pk')
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check ownership for authenticated users
        if request.user.is_authenticated and project.user != request.user:
            return Response(
                {'error': 'You do not have permission to delete this project'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Anonymous users can only delete projects they created (no user association)
        if not request.user.is_authenticated and project.user is not None:
            return Response(
                {'error': 'You do not have permission to delete this project'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """
        Get conversation history for a specific project
        
        Returns all messages in chronological order.
        """
        try:
            project = Project.objects.get(id=pk)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check ownership for authenticated users
        if request.user.is_authenticated and project.user != request.user:
            return Response(
                {'error': 'You do not have permission to access this project'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get messages ordered by timestamp
        messages = project.messages.all().order_by('timestamp')
        serializer = ChatMessageSerializer(messages, many=True)
        
        return Response({
            'project_id': str(project.id),
            'project_name': project.name,
            'messages': serializer.data,
            'total_messages': messages.count()
        })
    
    @action(detail=True, methods=['post'])
    def chat(self, request, pk=None):
        """
        Send a message to the project and get an AI-generated response
        
        Accepts a user message, processes it through the mock agent system,
        and returns the assistant's response with updated scene data.
        """
        try:
            project = Project.objects.get(id=pk)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check ownership for authenticated users
        if request.user.is_authenticated and project.user != request.user:
            return Response(
                {'error': 'You do not have permission to access this project'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Anonymous users can only access projects they created (no user association)
        if not request.user.is_authenticated and project.user is not None:
            return Response(
                {'error': 'You do not have permission to access this project'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate request data
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response(
                {'error': 'Message content is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Load conversation history from database
        conversation_history = self._load_conversation_history(project)
        
        # Check if this is the first message
        is_first_message = len(conversation_history) == 0
        
        # Save user message to database
        from chat.models import ChatMessage
        user_msg = ChatMessage.objects.create(
            project=project,
            role='user',
            content=user_message
        )
        
        # Process message through agent system (AgentCore or mock fallback)
        agent_response = self._process_with_agent_system(
            user_message, 
            project, 
            conversation_history,
            is_first_message
        )
        
        # Save assistant message to database
        assistant_msg = ChatMessage.objects.create(
            project=project,
            role='assistant',
            content=agent_response['content'],
            metadata=agent_response['metadata']
        )
        
        # Update project with scene data and name if needed
        if agent_response['scene_json'] and agent_response['scene_json'] != {}:
            project.scene_json = agent_response['scene_json']
        
        if is_first_message and agent_response.get('project_name'):
            project.name = agent_response['project_name']
        
        project.save()
        
        # Format response according to API specification
        response_data = {
            'message': {
                'id': str(assistant_msg.id),
                'content': assistant_msg.content,
                'role': assistant_msg.role,
                'timestamp': assistant_msg.timestamp.isoformat()
            },
            'scene_json': agent_response['scene_json'],
            'metadata': agent_response['metadata']
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def _load_conversation_history(self, project):
        """
        Load conversation history from database for agent context
        
        Returns list of messages in chronological order for agent processing.
        """
        messages = project.messages.all().order_by('timestamp')
        return [
            {
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
                'metadata': msg.metadata
            }
            for msg in messages
        ]
    
    def _process_with_agent_system(self, user_message, project, conversation_history, is_first_message):
        """
        Process message with real agent system (AgentCore) or fallback to mock
        
        Tries to use Bedrock AgentCore Runtime first, falls back to mock agent
        if AgentCore is not available or fails.
        """
        from django.conf import settings
        
        # Try AgentCore if configured
        if getattr(settings, 'LOCUSGEN_AGENT_ARN', None):
            try:
                from agent_integration import process_message_with_agentcore
                
                # Generate session ID from project ID for consistency
                session_id = f"project-{project.id}"
                
                # Process with AgentCore
                agentcore_response = process_message_with_agentcore(
                    user_message=user_message,
                    conversation_history=conversation_history,
                    is_first_message=is_first_message,
                    session_id=session_id
                )
                
                # Convert AgentCore response to expected format
                return self._convert_agentcore_response(
                    agentcore_response, 
                    user_message, 
                    is_first_message
                )
                
            except Exception as e:
                logger.error(f"AgentCore processing failed: {str(e)}, falling back to mock")
        
        # Fallback to mock agent
        return self._process_with_mock_agent(user_message, project, conversation_history, is_first_message)
    
    def _convert_agentcore_response(self, agentcore_response, user_message, is_first_message):
        """
        Convert AgentCore response to Django expected format
        """
        # Generate project name for first message if not provided
        project_name = None
        if is_first_message:
            project_name = self._generate_project_name(user_message)
        
        return {
            'content': agentcore_response.get('content', agentcore_response.get('message', 'No response from agent')),
            'scene_json': agentcore_response.get('scene_json', {}),
            'metadata': agentcore_response.get('metadata', {}),
            'project_name': project_name
        }

    def _process_with_mock_agent(self, user_message, project, conversation_history, is_first_message):
        """
        Mock agent processing function that generates realistic responses
        
        This function simulates the behavior of the real Strands Agents system
        for frontend integration testing. It generates appropriate scene JSON
        based on user input patterns and maintains conversation context.
        """
        import json
        import time
        import random
        from datetime import datetime
        
        # Simulate processing time
        processing_start = time.time()
        
        # Generate project name for first message
        project_name = None
        if is_first_message:
            project_name = self._generate_project_name(user_message)
        
        # Generate mock response based on user input
        response_content, scene_json = self._generate_mock_response(
            user_message, 
            project.scene_json,
            conversation_history,
            is_first_message
        )
        
        # Calculate processing time
        processing_time = time.time() - processing_start
        
        # Generate metadata
        metadata = {
            'processing_time': round(processing_time, 3),
            'tools_used': self._get_mock_tools_used(user_message, is_first_message),
            'is_mock': True,
            'timestamp': datetime.now().isoformat(),
            'message_count': len(conversation_history) + 1
        }
        
        return {
            'content': response_content,
            'scene_json': scene_json,
            'metadata': metadata,
            'project_name': project_name
        }
    
    def _generate_project_name(self, user_message):
        """
        Generate a project name based on the first user message
        """
        # Extract key concepts from the message
        message_lower = user_message.lower()
        
        # Common scene types and their names
        scene_patterns = {
            'living room': 'Cozy Living Room',
            'bedroom': 'Comfortable Bedroom',
            'kitchen': 'Modern Kitchen',
            'office': 'Professional Office',
            'bathroom': 'Elegant Bathroom',
            'garden': 'Beautiful Garden',
            'forest': 'Enchanted Forest',
            'beach': 'Tropical Beach',
            'mountain': 'Mountain Landscape',
            'city': 'Urban Scene',
            'house': 'Dream House',
            'apartment': 'Modern Apartment',
            'restaurant': 'Cozy Restaurant',
            'cafe': 'Coffee Shop',
            'library': 'Quiet Library',
            'gym': 'Fitness Center',
            'studio': 'Creative Studio',
            'workshop': 'Maker Workshop'
        }
        
        # Find matching patterns
        for pattern, name in scene_patterns.items():
            if pattern in message_lower:
                return name
        
        # Fallback to generic names based on common words
        if any(word in message_lower for word in ['cozy', 'warm', 'comfortable']):
            return 'Cozy Space'
        elif any(word in message_lower for word in ['modern', 'sleek', 'contemporary']):
            return 'Modern Space'
        elif any(word in message_lower for word in ['rustic', 'wooden', 'natural']):
            return 'Rustic Space'
        elif any(word in message_lower for word in ['bright', 'sunny', 'light']):
            return 'Bright Space'
        else:
            return 'Custom Scene'
    
    def _generate_mock_response(self, user_message, current_scene, conversation_history, is_first_message):
        """
        Generate mock assistant response and scene JSON based on user input
        """
        message_lower = user_message.lower()
        
        # Generate response content
        if is_first_message:
            response_content = self._generate_first_message_response(message_lower)
        else:
            response_content = self._generate_followup_response(message_lower, current_scene)
        
        # Generate scene JSON
        scene_json = self._generate_mock_scene_json(message_lower, current_scene, is_first_message)
        
        return response_content, scene_json
    
    def _generate_first_message_response(self, message_lower):
        """Generate response for the first message in a conversation"""
        if 'living room' in message_lower:
            return "I'll create a cozy living room for you! I'm adding a comfortable sofa, coffee table, and some warm lighting to make it feel inviting."
        elif 'bedroom' in message_lower:
            return "Perfect! I'm designing a comfortable bedroom with a bed, nightstands, and soft lighting for a relaxing atmosphere."
        elif 'kitchen' in message_lower:
            return "Great choice! I'm setting up a modern kitchen with cabinets, countertops, and essential appliances for cooking."
        elif 'office' in message_lower:
            return "I'll create a professional office space with a desk, chair, and proper lighting for productivity."
        elif 'garden' in message_lower or 'outdoor' in message_lower:
            return "Wonderful! I'm creating a beautiful outdoor garden with plants, pathways, and natural elements."
        elif 'forest' in message_lower:
            return "I'm generating an enchanted forest scene with tall trees, natural lighting, and a peaceful atmosphere."
        elif 'beach' in message_lower:
            return "Perfect! I'm creating a tropical beach scene with sand, water, and palm trees for a relaxing vibe."
        else:
            return "I understand what you're looking for! Let me create a custom 3D scene based on your description."
    
    def _generate_followup_response(self, message_lower, current_scene):
        """Generate response for follow-up messages"""
        if 'add' in message_lower or 'include' in message_lower:
            if 'fireplace' in message_lower:
                return "Great idea! I'm adding a beautiful fireplace to create a warm, cozy focal point in your scene."
            elif 'plant' in message_lower or 'tree' in message_lower:
                return "Perfect! I'm adding some greenery to bring life and freshness to your space."
            elif 'light' in message_lower or 'lamp' in message_lower:
                return "Excellent! I'm adding additional lighting to enhance the ambiance and functionality."
            elif 'chair' in message_lower or 'seat' in message_lower:
                return "Good thinking! I'm adding comfortable seating to make the space more functional."
            else:
                return "I'm adding that element to your scene. It will complement the existing design nicely!"
        elif 'remove' in message_lower or 'delete' in message_lower:
            return "No problem! I've removed that element from your scene to better match your vision."
        elif 'change' in message_lower or 'modify' in message_lower:
            if 'color' in message_lower:
                return "I'm updating the colors in your scene to match your preferences."
            elif 'size' in message_lower:
                return "I'm adjusting the size of the elements to better fit your space."
            else:
                return "I'm making those modifications to better suit your needs."
        elif 'brighter' in message_lower or 'darker' in message_lower:
            return "I'm adjusting the lighting to create the perfect atmosphere for your scene."
        else:
            return "I understand your request and I'm updating the scene accordingly. The changes should enhance the overall design!"
    
    def _generate_mock_scene_json(self, message_lower, current_scene, is_first_message):
        """
        Generate mock scene JSON based on user input
        """
        import random
        
        # If this is a follow-up message and no scene changes are needed, return empty object
        if not is_first_message and not any(word in message_lower for word in [
            'add', 'remove', 'change', 'modify', 'brighter', 'darker', 'color', 'size'
        ]):
            return {}
        
        # Base scene structure
        scene = {
            "scene": {
                "name": "Generated Scene",
                "objects": [],
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
        
        # Start with existing scene if available
        if current_scene and isinstance(current_scene, dict) and 'scene' in current_scene:
            scene = current_scene.copy()
        
        # Generate objects based on user input
        if is_first_message:
            scene["scene"]["objects"] = self._generate_initial_objects(message_lower)
        else:
            # Modify existing scene based on user request
            scene["scene"]["objects"] = self._modify_scene_objects(
                message_lower, 
                scene["scene"].get("objects", [])
            )
        
        return scene
    
    def _generate_initial_objects(self, message_lower):
        """Generate initial objects for a new scene"""
        objects = []
        
        if 'living room' in message_lower:
            objects = [
                {
                    "id": "sofa_001",
                    "name": "Comfortable Sofa",
                    "position": {"x": 0, "y": 0, "z": -1},
                    "rotation": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                    "asset": {
                        "glb_url": "https://example.com/models/sofa.glb",
                        "format": "glb",
                        "size": 1024000
                    }
                },
                {
                    "id": "coffee_table_001",
                    "name": "Coffee Table",
                    "position": {"x": 0, "y": 0, "z": 0.5},
                    "rotation": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                    "asset": {
                        "glb_url": "https://example.com/models/coffee_table.glb",
                        "format": "glb",
                        "size": 512000
                    }
                }
            ]
        elif 'bedroom' in message_lower:
            objects = [
                {
                    "id": "bed_001",
                    "name": "Comfortable Bed",
                    "position": {"x": 0, "y": 0, "z": -2},
                    "rotation": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                    "asset": {
                        "glb_url": "https://example.com/models/bed.glb",
                        "format": "glb",
                        "size": 2048000
                    }
                },
                {
                    "id": "nightstand_001",
                    "name": "Nightstand",
                    "position": {"x": 1.5, "y": 0, "z": -2},
                    "rotation": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                    "asset": {
                        "glb_url": "https://example.com/models/nightstand.glb",
                        "format": "glb",
                        "size": 256000
                    }
                }
            ]
        elif 'kitchen' in message_lower:
            objects = [
                {
                    "id": "counter_001",
                    "name": "Kitchen Counter",
                    "position": {"x": -2, "y": 0, "z": 0},
                    "rotation": {"x": 0, "y": 90, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                    "asset": {
                        "glb_url": "https://example.com/models/kitchen_counter.glb",
                        "format": "glb",
                        "size": 1536000
                    }
                },
                {
                    "id": "refrigerator_001",
                    "name": "Refrigerator",
                    "position": {"x": -3, "y": 0, "z": -1},
                    "rotation": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                    "asset": {
                        "glb_url": "https://example.com/models/refrigerator.glb",
                        "format": "glb",
                        "size": 1024000
                    }
                }
            ]
        else:
            # Generic scene with basic objects
            objects = [
                {
                    "id": "generic_object_001",
                    "name": "Scene Object",
                    "position": {"x": 0, "y": 0, "z": 0},
                    "rotation": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                    "asset": {
                        "glb_url": "https://example.com/models/generic.glb",
                        "format": "glb",
                        "size": 512000
                    }
                }
            ]
        
        return objects
    
    def _modify_scene_objects(self, message_lower, current_objects):
        """Modify existing scene objects based on user request"""
        import random
        
        objects = current_objects.copy() if current_objects else []
        
        if 'add' in message_lower:
            if 'fireplace' in message_lower:
                objects.append({
                    "id": f"fireplace_{random.randint(1, 999):03d}",
                    "name": "Stone Fireplace",
                    "position": {"x": 0, "y": 0, "z": -3},
                    "rotation": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                    "asset": {
                        "glb_url": "https://example.com/models/fireplace.glb",
                        "format": "glb",
                        "size": 2048000
                    }
                })
            elif 'plant' in message_lower:
                objects.append({
                    "id": f"plant_{random.randint(1, 999):03d}",
                    "name": "Indoor Plant",
                    "position": {"x": random.uniform(-2, 2), "y": 0, "z": random.uniform(-2, 2)},
                    "rotation": {"x": 0, "y": random.uniform(0, 360), "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                    "asset": {
                        "glb_url": "https://example.com/models/plant.glb",
                        "format": "glb",
                        "size": 512000
                    }
                })
            elif 'chair' in message_lower:
                objects.append({
                    "id": f"chair_{random.randint(1, 999):03d}",
                    "name": "Comfortable Chair",
                    "position": {"x": random.uniform(-1, 1), "y": 0, "z": random.uniform(-1, 1)},
                    "rotation": {"x": 0, "y": random.uniform(0, 360), "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                    "asset": {
                        "glb_url": "https://example.com/models/chair.glb",
                        "format": "glb",
                        "size": 768000
                    }
                })
        elif 'remove' in message_lower:
            # Remove the last added object (simple implementation)
            if objects:
                objects.pop()
        
        return objects
    
    def _get_mock_tools_used(self, user_message, is_first_message):
        """
        Determine which mock tools would be used based on the message
        """
        tools = []
        
        if is_first_message:
            tools.extend(['scene_generator', 'sketchfab_search'])
        
        message_lower = user_message.lower()
        
        if any(word in message_lower for word in ['add', 'include', 'put']):
            tools.append('sketchfab_search')
            tools.append('scene_generator')
        
        if any(word in message_lower for word in ['change', 'modify', 'update']):
            tools.append('scene_generator')
        
        if any(word in message_lower for word in ['brighter', 'darker', 'light']):
            tools.append('lighting_controller')
        
        # Remove duplicates while preserving order
        return list(dict.fromkeys(tools)) if tools else ['mock_processor']


class AssetListView(generics.ListAPIView):
    """
    List view for Asset read-only operations
    
    Assets are managed by the agent system and CDN processor.
    This provides read-only access for debugging and monitoring.
    """
    serializer_class = AssetSerializer
    authentication_classes = [CognitoJWTAuthentication, SessionAuthentication]
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        """
        Return all assets, optionally filtered by query parameters
        """
        queryset = Asset.objects.all()
        
        # Filter by cached status
        is_cached = self.request.query_params.get('cached', None)
        if is_cached is not None:
            if is_cached.lower() in ['true', '1']:
                queryset = queryset.filter(s3_url__isnull=False)
            elif is_cached.lower() in ['false', '0']:
                queryset = queryset.filter(s3_url__isnull=True)
        
        # Filter by file format
        file_format = self.request.query_params.get('format', None)
        if file_format:
            queryset = queryset.filter(file_format__iexact=file_format)
        
        # Filter by license type
        license_type = self.request.query_params.get('license', None)
        if license_type:
            queryset = queryset.filter(license_type__icontains=license_type)
        
        return queryset.order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """
        List assets without pagination for simplicity
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class AssetDetailView(generics.RetrieveAPIView):
    """
    Detail view for Asset read-only operations
    """
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    authentication_classes = [CognitoJWTAuthentication, SessionAuthentication]
    permission_classes = [permissions.AllowAny]
