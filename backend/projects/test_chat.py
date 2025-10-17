"""
Test cases for the chat endpoint
"""
from django.test import TestCase, Client
from django.urls import reverse
from projects.models import Project
from chat.models import ChatMessage
import json


class ChatEndpointTestCase(TestCase):
    """Test cases for the chat endpoint functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client = Client()
        self.project = Project.objects.create(name="Test Project")
    
    def test_chat_endpoint_first_message(self):
        """Test sending the first message to a project"""
        url = f'/api/projects/{self.project.id}/chat/'
        data = {'message': 'Create a cozy living room with a fireplace'}
        
        response = self.client.post(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        response_data = response.json()
        
        # Check response structure
        self.assertIn('message', response_data)
        self.assertIn('scene_json', response_data)
        self.assertIn('metadata', response_data)
        
        # Check message structure
        message = response_data['message']
        self.assertIn('id', message)
        self.assertIn('content', message)
        self.assertIn('role', message)
        self.assertIn('timestamp', message)
        self.assertEqual(message['role'], 'assistant')
        
        # Check scene_json is present
        self.assertIsInstance(response_data['scene_json'], dict)
        
        # Check metadata
        metadata = response_data['metadata']
        self.assertIn('processing_time', metadata)
        self.assertIn('tools_used', metadata)
        self.assertIn('is_mock', metadata)
        self.assertTrue(metadata['is_mock'])
        
        # Check database persistence
        messages = ChatMessage.objects.filter(project=self.project)
        self.assertEqual(messages.count(), 2)  # User + Assistant
        
        user_message = messages.filter(role='user').first()
        assistant_message = messages.filter(role='assistant').first()
        
        self.assertEqual(user_message.content, 'Create a cozy living room with a fireplace')
        self.assertIsNotNone(assistant_message.content)
        
        # Check project updates
        self.project.refresh_from_db()
        self.assertNotEqual(self.project.name, "Test Project")  # Should be updated
        self.assertIsNotNone(self.project.scene_json)
    
    def test_chat_endpoint_follow_up_message(self):
        """Test sending a follow-up message"""
        # Create initial conversation
        ChatMessage.objects.create(
            project=self.project,
            role='user',
            content='Create a living room'
        )
        ChatMessage.objects.create(
            project=self.project,
            role='assistant',
            content='I created a living room for you!'
        )
        
        url = f'/api/projects/{self.project.id}/chat/'
        data = {'message': 'Add a comfortable chair'}
        
        response = self.client.post(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        response_data = response.json()
        
        # Check response structure
        self.assertIn('message', response_data)
        self.assertIn('scene_json', response_data)
        self.assertIn('metadata', response_data)
        
        # Check that conversation history was loaded (metadata should reflect this)
        metadata = response_data['metadata']
        self.assertGreater(metadata['message_count'], 1)
        
        # Check database
        messages = ChatMessage.objects.filter(project=self.project)
        self.assertEqual(messages.count(), 4)  # 2 existing + 2 new
    
    def test_chat_endpoint_empty_message(self):
        """Test sending an empty message"""
        url = f'/api/projects/{self.project.id}/chat/'
        data = {'message': ''}
        
        response = self.client.post(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertIn('error', response_data)
    
    def test_chat_endpoint_nonexistent_project(self):
        """Test sending message to non-existent project"""
        url = '/api/projects/00000000-0000-0000-0000-000000000000/chat/'
        data = {'message': 'Hello'}
        
        response = self.client.post(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, 404)
        response_data = response.json()
        self.assertIn('error', response_data)
    
    def test_mock_scene_generation(self):
        """Test that mock scene generation works for different inputs"""
        test_cases = [
            ('Create a bedroom', 'bedroom'),
            ('Make a kitchen', 'kitchen'),
            ('Add a fireplace', 'fireplace'),
            ('Remove the table', 'remove'),
        ]
        
        for message, expected_keyword in test_cases:
            with self.subTest(message=message):
                url = f'/api/projects/{self.project.id}/chat/'
                data = {'message': message}
                
                response = self.client.post(url, data, content_type='application/json')
                
                self.assertEqual(response.status_code, 200)
                response_data = response.json()
                
                # Check that response content relates to the input
                content = response_data['message']['content'].lower()
                self.assertTrue(
                    any(keyword in content for keyword in [expected_keyword, 'scene', 'create', 'add', 'update']),
                    f"Response '{content}' doesn't seem to relate to '{message}'"
                )
                
                # Clean up for next test
                ChatMessage.objects.filter(project=self.project).delete()
                self.project.scene_json = None
                self.project.save()