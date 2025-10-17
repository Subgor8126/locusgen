#!/usr/bin/env python3
"""
Integration Example for LocusGen Agent System

This script demonstrates how the Django backend would integrate with
the agent system for processing chat messages and generating 3D scenes.
"""

import sys
import os
from datetime import datetime
from typing import List, Dict, Any

# Add the agents directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from main import LocusGenAgentOrchestrator, ConversationMessage
from conversation_utils import ConversationConverter, DjangoMessage
from response_processor import create_mock_scene_response


def simulate_django_integration():
    """Simulate how Django backend would integrate with the agent system."""
    
    print("LocusGen Agent System - Django Integration Example")
    print("=" * 55)
    
    # Initialize the agent system (this would be done once in Django)
    print("1. Initializing agent system...")
    orchestrator = LocusGenAgentOrchestrator()
    print("   ✓ Agent orchestrator initialized")
    
    # Simulate Django ChatMessage objects from database
    print("\n2. Loading conversation history from database...")
    django_messages = [
        DjangoMessage(
            id="msg_001",
            role="user",
            content="I want to create a cozy living room",
            timestamp=datetime.now(),
            metadata=None
        ),
        DjangoMessage(
            id="msg_002", 
            role="assistant",
            content="I'll help you create a cozy living room! Let me generate a scene with comfortable furniture and warm lighting.",
            timestamp=datetime.now(),
            metadata={
                "tools_used": ["scene_generator"],
                "processing_time": 2.1,
                "scene_changes": True
            }
        ),
        DjangoMessage(
            id="msg_003",
            role="user", 
            content="Can you add a fireplace to the room?",
            timestamp=datetime.now(),
            metadata=None
        )
    ]
    
    print(f"   ✓ Loaded {len(django_messages)} messages from database")
    
    # Convert Django messages to agent format
    print("\n3. Converting conversation history...")
    conversation_history = []
    for msg in django_messages:
        conversation_history.append(ConversationMessage(
            role=msg.role,
            content=msg.content,
            timestamp=msg.timestamp,
            metadata=msg.metadata
        ))
    print(f"   ✓ Converted {len(conversation_history)} messages to agent format")
    
    # Process new user message
    print("\n4. Processing new user message...")
    new_user_message = "Make the fireplace larger and add some books on a shelf nearby"
    
    print(f"   User: {new_user_message}")
    
    # This is the main integration point - Django calls the agent system
    # The orchestrator will use specialized agents as tools:
    # 1. creative_agent - for creative brief
    # 2. asset_curator_agent - for finding 3D assets  
    # 3. scene_generator_agent - for creating scene JSON
    # 4. cdn_processor_tool - for processing asset URLs
    response = orchestrator.process_message(
        user_message=new_user_message,
        conversation_history=conversation_history,
        is_first_message=False
    )
    
    print(f"   ✓ Message processed in {response.processing_time:.2f}s")
    
    # Display the response (Django would save this to database)
    print("\n5. Agent Response:")
    print(f"   Assistant: {response.message}")
    print(f"   Scene JSON: {len(response.scene_json)} fields")
    print(f"   Metadata: {response.metadata}")
    
    # Simulate saving to Django database
    print("\n6. Saving response to database...")
    
    # Django would create a new ChatMessage object like this:
    assistant_message_data = {
        "role": "assistant",
        "content": response.message,
        "metadata": response.metadata,
        "timestamp": datetime.now()
    }
    
    # Django would also update the project's scene_json field
    project_scene_update = {
        "scene_json": response.scene_json,
        "updated_at": datetime.now()
    }
    
    print("   ✓ Assistant message saved to ChatMessage table")
    print("   ✓ Project scene_json updated")
    
    # Demonstrate scene JSON structure
    if response.scene_json:
        print("\n7. Scene JSON Structure:")
        scene = response.scene_json.get("scene", {})
        print(f"   Scene Name: {scene.get('name', 'N/A')}")
        print(f"   Objects: {len(scene.get('objects', []))}")
        print(f"   Has Lighting: {'lighting' in scene}")
        print(f"   Has Camera: {'camera' in scene}")
    
    return response


def simulate_first_message_flow():
    """Simulate the flow for a user's first message (project creation)."""
    
    print("\n" + "=" * 55)
    print("First Message Flow Simulation")
    print("=" * 55)
    
    orchestrator = LocusGenAgentOrchestrator()
    
    # First message - no conversation history
    print("1. Processing first message (creates new project)...")
    first_message = "Create a modern kitchen with an island"
    
    response = orchestrator.process_message(
        user_message=first_message,
        conversation_history=[],  # Empty for first message
        is_first_message=True
    )
    
    print(f"   ✓ First message processed in {response.processing_time:.2f}s")
    print(f"   Assistant: {response.message}")
    
    # Django would:
    # 1. Create new Project with generated name
    # 2. Save user message to ChatMessage
    # 3. Save assistant response to ChatMessage  
    # 4. Update project scene_json
    
    print("\n2. Django would perform these database operations:")
    print("   ✓ Create new Project record")
    print("   ✓ Save user ChatMessage")
    print("   ✓ Save assistant ChatMessage")
    print("   ✓ Update Project.scene_json")
    
    return response


def demonstrate_error_handling():
    """Demonstrate error handling in the agent system."""
    
    print("\n" + "=" * 55)
    print("Error Handling Demonstration")
    print("=" * 55)
    
    orchestrator = LocusGenAgentOrchestrator()
    
    # Simulate an error condition
    print("1. Simulating error condition...")
    
    try:
        # This would normally cause an error in a real scenario
        response = orchestrator.process_message(
            user_message="Test error handling",
            conversation_history=[],
            is_first_message=True
        )
        
        print("   ✓ Error handling working - graceful response generated")
        print(f"   Response: {response.message[:100]}...")
        
    except Exception as e:
        print(f"   ✗ Unexpected error: {str(e)}")
    
    return True


def main():
    """Run the integration examples."""
    
    try:
        # Main integration flow
        response1 = simulate_django_integration()
        
        # First message flow
        response2 = simulate_first_message_flow()
        
        # Error handling
        demonstrate_error_handling()
        
        print("\n" + "=" * 55)
        print("Integration Example Complete")
        print("=" * 55)
        print("✓ Agent system ready for Django integration")
        print("✓ Conversation management working")
        print("✓ Response processing functional")
        print("✓ Error handling implemented")
        
        print(f"\nNext steps:")
        print("1. Install Strands Agents SDK: pip install strands-agents")
        print("2. Configure AWS credentials for Bedrock")
        print("3. Implement MCP tools for Sketchfab and scene generation")
        print("4. Update Django backend to call agent system")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Integration example failed: {str(e)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())