#!/usr/bin/env python3
"""
Test script to verify the LocusGen Agent System setup.

This script tests basic functionality without requiring external dependencies
like Strands Agents SDK or AWS services.
"""

import sys
import os
import json
from datetime import datetime
from typing import List, Dict, Any

# Add the agents directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

def test_config_loading():
    """Test configuration loading."""
    print("Testing configuration loading...")
    
    try:
        from config import get_config, setup_logging
        
        config = get_config()
        print(f"✓ Configuration loaded successfully")
        print(f"  Model ID: {config.model.model_id}")
        print(f"  Environment: {config.environment}")
        print(f"  MCP Servers: {len(config.mcp_servers)}")
        
        # Test logging setup
        setup_logging(config)
        print("✓ Logging configured successfully")
        
        return True
    except Exception as e:
        print(f"✗ Configuration loading failed: {str(e)}")
        return False


def test_conversation_utils():
    """Test conversation utilities."""
    print("\nTesting conversation utilities...")
    
    try:
        from conversation_utils import (
            ConversationConverter, 
            ConversationContextManager,
            DjangoMessage
        )
        
        # Create test messages
        test_messages = [
            DjangoMessage(
                id="msg1",
                role="user", 
                content="Create a living room",
                timestamp=datetime.now()
            ),
            DjangoMessage(
                id="msg2",
                role="assistant",
                content="I'll create a cozy living room for you!",
                timestamp=datetime.now(),
                metadata={"tools_used": ["scene_generator"]}
            )
        ]
        
        # Test conversion
        converter = ConversationConverter()
        strands_messages = converter.django_to_strands(test_messages)
        
        print(f"✓ Converted {len(test_messages)} messages to Strands format")
        print(f"  First message role: {strands_messages[0]['role']}")
        
        # Test context manager
        context_manager = ConversationContextManager()
        context = context_manager.prepare_context(test_messages)
        
        print(f"✓ Prepared conversation context with {len(context)} messages")
        
        return True
    except Exception as e:
        print(f"✗ Conversation utilities test failed: {str(e)}")
        return False


def test_response_processor():
    """Test response processing utilities."""
    print("\nTesting response processing...")
    
    try:
        from response_processor import (
            SceneJSONExtractor,
            MetadataExtractor,
            create_mock_scene_response
        )
        
        # Test scene JSON extraction
        extractor = SceneJSONExtractor()
        
        # Test with mock response
        mock_response = "Here's your scene: ```json\n" + json.dumps({
            "scene": {
                "name": "Test Room",
                "objects": [{"id": "obj1", "name": "Test Object"}]
            }
        }) + "\n```"
        
        scene_json = extractor._extract_json_from_text(mock_response)
        print(f"✓ Extracted scene JSON: {scene_json is not None}")
        
        # Test mock scene generation
        mock_scene = create_mock_scene_response("create a living room")
        print(f"✓ Generated mock scene with {len(mock_scene['scene']['objects'])} objects")
        
        # Test metadata extraction
        metadata_extractor = MetadataExtractor()
        metadata = metadata_extractor.extract_metadata(
            mock_response, 
            datetime.now(),
            is_first_message=True
        )
        print(f"✓ Extracted metadata with {len(metadata)} fields")
        
        return True
    except Exception as e:
        print(f"✗ Response processor test failed: {str(e)}")
        return False


def test_main_orchestrator():
    """Test main orchestrator with specialized agents."""
    print("\nTesting main orchestrator structure...")
    
    try:
        from main import ConversationMessage, AgentResponse, LocusGenAgentOrchestrator
        
        # Test data structures
        message = ConversationMessage(
            role="user",
            content="Test message",
            timestamp=datetime.now()
        )
        print(f"✓ ConversationMessage created: {message.role}")
        
        response = AgentResponse(
            message="Test response",
            scene_json={},
            metadata={"test": True},
            processing_time=1.0
        )
        print(f"✓ AgentResponse created: {response.processing_time}s")
        
        # Test orchestrator initialization
        orchestrator = LocusGenAgentOrchestrator()
        print(f"✓ Orchestrator created with {len(orchestrator.tools)} specialized agents")
        
        return True
    except Exception as e:
        print(f"✗ Main orchestrator test failed: {str(e)}")
        return False


def test_specialized_agents():
    """Test specialized agents functionality."""
    print("\nTesting specialized agents...")
    
    try:
        from specialized_agents import (
            creative_agent, 
            asset_curator_agent, 
            scene_generator_agent,
            cdn_processor_tool
        )
        
        # Test creative agent
        creative_result = creative_agent("Create a cozy living room")
        print(f"✓ Creative agent responded: {len(creative_result)} characters")
        
        # Test asset curator agent
        asset_result = asset_curator_agent("Modern living room with warm lighting")
        print(f"✓ Asset curator agent responded: {len(asset_result)} characters")
        
        # Test scene generator agent
        scene_result = scene_generator_agent("Modern style", "Fireplace, sofa assets")
        print(f"✓ Scene generator agent responded: {len(scene_result)} characters")
        
        # Test CDN processor tool
        test_scene = {
            "scene": {
                "objects": [
                    {"id": "test_obj", "asset": {"glb_url": "https://example.com/test.glb"}}
                ]
            }
        }
        processed_scene = cdn_processor_tool(test_scene)
        print(f"✓ CDN processor tool processed scene")
        
        return True
    except Exception as e:
        print(f"✗ Specialized agents test failed: {str(e)}")
        return False


def test_package_imports():
    """Test package-level imports."""
    print("\nTesting package imports...")
    
    try:
        # Test importing individual modules (since we're in the agents directory)
        import main
        import conversation_utils
        import response_processor
        import config
        import specialized_agents
        
        print("✓ All module imports successful")
        
        # Test key classes
        from main import ConversationMessage, AgentResponse
        from conversation_utils import ConversationConverter
        from response_processor import ResponseProcessor
        from config import get_config
        from specialized_agents import creative_agent, asset_curator_agent, scene_generator_agent
        
        print("✓ All class imports successful")
        print("✓ Specialized agents imported successfully")
        return True
    except Exception as e:
        print(f"✗ Package import test failed: {str(e)}")
        return False


def main():
    """Run all tests."""
    print("LocusGen Agent System Setup Test")
    print("=" * 40)
    
    tests = [
        test_config_loading,
        test_conversation_utils,
        test_response_processor,
        test_main_orchestrator,
        test_specialized_agents,
        test_package_imports
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\nTest Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Agent system foundation is ready.")
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())