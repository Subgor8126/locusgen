#!/usr/bin/env python3
"""
Test script for Sketchfab MCP server integration.

This script tests the integration between the Asset Curator Agent
and the Sketchfab MCP server to ensure proper functionality.
"""

import os
import sys
import logging
from pathlib import Path

# Add the agents directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_mcp_server_direct():
    """Test the Sketchfab MCP server directly."""
    try:
        from mcp import stdio_client, StdioServerParameters
        from strands.tools.mcp import MCPClient
        
        # Get API key from environment
        api_key = os.getenv('MCP_SKETCHFAB_API_KEY', '')
        if not api_key:
            logger.error("MCP_SKETCHFAB_API_KEY not found in environment")
            return False
        
        # Create MCP client
        mcp_client = MCPClient(lambda: stdio_client(
            StdioServerParameters(
                command="node",
                args=["tools/sketchfab-mcp-server/build/index.js", "--api-key", api_key]
            )
        ))
        
        # Test the connection
        with mcp_client:
            tools = mcp_client.list_tools_sync()
            logger.info(f"Successfully connected to Sketchfab MCP server")
            logger.info(f"Available tools: {[tool.name for tool in tools]}")
            
            # Test a simple search
            if tools:
                search_tool = next((tool for tool in tools if 'search' in tool.name.lower()), None)
                if search_tool:
                    result = mcp_client.call_tool_sync(
                        tool_use_id="test-1",
                        name=search_tool.name,
                        arguments={"query": "chair", "limit": 3}
                    )
                    logger.info(f"Search test result: {result}")
                    return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error testing MCP server: {str(e)}")
        return False

def test_asset_curator_integration():
    """Test the Asset Curator Agent with MCP integration."""
    try:
        from specialized_agents import asset_curator_agent
        
        # Test creative brief
        creative_brief = """
        Scene Concept: Modern minimalist living room
        Mood: Clean, bright, and welcoming
        Style: Scandinavian modern with natural materials
        Key Elements: Comfortable seating, coffee table, minimal decor
        Lighting: Natural light with warm accents
        """
        
        logger.info("Testing Asset Curator Agent with MCP integration...")
        result = asset_curator_agent(creative_brief)
        logger.info(f"Asset Curator result: {result[:200]}...")
        
        return "error" not in result.lower()
        
    except Exception as e:
        logger.error(f"Error testing Asset Curator integration: {str(e)}")
        return False

def main():
    """Run all tests."""
    logger.info("Starting Sketchfab MCP integration tests...")
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Test 1: Direct MCP server connection
    logger.info("Test 1: Direct MCP server connection")
    mcp_test_passed = test_mcp_server_direct()
    
    # Test 2: Asset Curator integration
    logger.info("Test 2: Asset Curator Agent integration")
    curator_test_passed = test_asset_curator_integration()
    
    # Results
    logger.info("=" * 50)
    logger.info("TEST RESULTS:")
    logger.info(f"MCP Server Direct Test: {'PASSED' if mcp_test_passed else 'FAILED'}")
    logger.info(f"Asset Curator Integration: {'PASSED' if curator_test_passed else 'FAILED'}")
    
    if mcp_test_passed and curator_test_passed:
        logger.info("All tests PASSED! ✅")
        return 0
    else:
        logger.error("Some tests FAILED! ❌")
        return 1

if __name__ == "__main__":
    sys.exit(main())