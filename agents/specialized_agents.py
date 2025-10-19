"""
Specialized Agents for LocusGen 3D Scene Generation

This module implements the three specialized agents that work as tools
for the main orchestrator agent:
1. Creative Agent - Generates creative briefs and design concepts
2. Asset Curator Agent - Finds and curates 3D assets from Sketchfab
3. Scene Generator Agent - Creates structured scene JSON from assets and concepts
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

try:
    from strands import Agent, tool
    from strands.models import BedrockModel
    from strands.tools.mcp import MCPClient
    from mcp import stdio_client, StdioServerParameters
    STRANDS_AVAILABLE = True
except ImportError:
    # Mock implementations for testing
    STRANDS_AVAILABLE = False
    
    def tool(func):
        """Mock tool decorator"""
        return func
    
    class MockAgent:
        def __init__(self, **kwargs):
            self.kwargs = kwargs
        
        def __call__(self, message):
            return f"Mock {self.__class__.__name__} response to: {message}"
    
    Agent = MockAgent
    BedrockModel = MockAgent
    MCPClient = None

logger = logging.getLogger(__name__)

# System prompts for specialized agents
CREATIVE_AGENT_PROMPT = """You are a Creative Director for 3D scene generation. Your role is to:

1. Interpret user requests and create detailed creative briefs
2. Define the mood, style, and atmosphere of 3D scenes
3. Specify lighting preferences, color schemes, and spatial arrangements
4. Provide clear guidance for asset selection and scene composition

Key responsibilities:
- Transform vague user requests into specific creative direction
- Consider spatial relationships and realistic proportions
- Define lighting that enhances the scene's mood
- Specify style preferences (modern, rustic, minimalist, etc.)
- Provide clear creative constraints and guidelines

Always respond with:
- Scene concept and mood description
- Lighting preferences (warm/cool, bright/dim, natural/artificial)
- Style guidelines and aesthetic direction
- Spatial arrangement suggestions
- Key objects or elements that should be included

Be creative but practical - your guidance will be used to search for real 3D assets."""

ASSET_CURATOR_PROMPT = """You are an Asset Curator specializing in 3D model selection. Your role is to:

1. Search for high-quality 3D assets based on creative briefs
2. Evaluate asset quality, licensing, and suitability
3. Curate collections of assets that work well together
4. Provide detailed asset information for scene generation

Key responsibilities:
- Use the Sketchfab search tool to find appropriate 3D models
- Filter assets by quality, licensing, and compatibility
- Select assets that match the creative brief's style and requirements
- Ensure proper scale and proportion relationships between assets
- Provide comprehensive asset metadata for scene generation

When searching for assets:
- Use specific, descriptive search terms
- Consider the creative brief's style and mood requirements
- Look for assets with appropriate licensing (CC or purchasable)
- Prioritize high-quality, well-textured models
- Ensure assets are available in GLB format when possible

Always provide:
- Asset name and description
- Sketchfab URL and download information
- Quality assessment and suitability notes
- Suggested positioning and scale information"""

SCENE_GENERATOR_PROMPT = """You are a Scene Generator specializing in creating structured 3D scene JSON. Your role is to:

1. Transform creative concepts and curated assets into complete scene JSON
2. Define precise object positioning, rotation, and scaling
3. Create appropriate lighting setups based on creative direction
4. Establish camera positioning for optimal scene viewing

Key responsibilities:
- Generate complete, valid scene JSON structures
- Position objects with realistic spatial relationships
- Create lighting that matches the creative brief
- Set up camera angles that showcase the scene effectively
- Ensure all objects have proper transforms (position, rotation, scale)

Scene JSON structure requirements:
- Include scene name and description
- Define all objects with complete transform data
- Specify lighting configuration (ambient + directional)
- Set camera position and target
- Use realistic coordinate systems and proportions

Technical guidelines:
- Use meters as the base unit for positioning
- Position objects on appropriate surfaces (floor, tables, etc.)
- Ensure lighting creates depth and atmosphere
- Place camera to show the scene from an engaging angle
- Scale objects appropriately relative to each other

Always generate complete, valid JSON that can be directly used by the 3D renderer."""

# CDN Processor Tool
@tool
def cdn_processor_tool(scene_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process scene JSON to replace asset URLs with CDN URLs.
    
    This tool processes asset URLs through the CDN system to ensure fast loading 
    and caching by downloading assets from Sketchfab and storing them in S3.
    
    Args:
        scene_json: Scene JSON with original asset URLs
        
    Returns:
        Scene JSON with CDN URLs
    """
    try:
        if not scene_json or "scene" not in scene_json:
            return scene_json
        
        # Import CDN service
        try:
            from .cdn_service import CDNService
        except ImportError:
            from cdn_service import CDNService
        
        # Create CDN service instance and process the scene
        cdn_service = CDNService()
        processed_scene_json = cdn_service.process_scene_json(scene_json)
        
        logger.info(f"Successfully processed scene JSON through CDN service")
        return processed_scene_json
        
    except Exception as e:
        logger.error(f"Error processing scene through CDN: {str(e)}")
        # Return original scene JSON on failure
        return scene_json


@tool
def creative_agent(user_request: str) -> str:
    """
    Generate creative brief and design concept for 3D scene generation.
    
    Takes user requests and transforms them into detailed creative direction
    including mood, style, lighting, and spatial arrangement guidelines.
    
    Args:
        user_request: User's description of the desired 3D scene
        
    Returns:
        Detailed creative brief with design specifications
    """
    try:
        print("🎨 Routed to Creative Agent")
        
        if not STRANDS_AVAILABLE:
            return f"Mock Creative Agent: Creative brief for '{user_request}' - modern style, warm lighting, comfortable arrangement"
        
        # Create specialized creative agent
        creative_agent_instance = Agent(
            model=BedrockModel(model_id="us.amazon.nova-pro-v1:0"),
            system_prompt=CREATIVE_AGENT_PROMPT
        )
        
        # Format the query for the creative agent
        formatted_query = f"""
        User Request: {user_request}
        
        Please create a comprehensive creative brief for this 3D scene including:
        1. Scene concept and mood
        2. Lighting preferences and atmosphere
        3. Style guidelines and aesthetic direction
        4. Spatial arrangement suggestions
        5. Key objects and elements to include
        """
        
        response = creative_agent_instance(formatted_query)
        
        # Extract response text
        if hasattr(response, 'message'):
            return str(response.message)
        else:
            return str(response)
            
    except Exception as e:
        logger.error(f"Error in creative agent: {str(e)}")
        return f"Error generating creative brief: {str(e)}"


# Global variable to store MCP tools passed from orchestrator
_mcp_tools = []

def set_mcp_tools(tools: List[Any]):
    """Set MCP tools to be used by specialized agents."""
    global _mcp_tools
    _mcp_tools = tools
    logger.info(f"Set {len(tools)} MCP tools for specialized agents")

@tool
def asset_curator_agent(creative_brief: str) -> str:
    """
    Find and curate 3D assets based on creative brief using Sketchfab search.
    
    Searches for high-quality 3D models that match the creative requirements
    and provides detailed asset information for scene generation.
    
    Args:
        creative_brief: Creative brief from the creative agent
        
    Returns:
        Curated list of 3D assets with metadata and recommendations
    """
    try:
        print("🔍 Routed to Asset Curator Agent")
        
        if not STRANDS_AVAILABLE:
            return f"Mock Asset Curator: Found fireplace, sofa, coffee table assets for creative brief"
        
        # Check if MCP tools are available
        global _mcp_tools
        if _mcp_tools:
            logger.info(f"Using {len(_mcp_tools)} MCP tools for asset curation")
            
            # Create specialized asset curator agent with MCP tools
            asset_curator_instance = Agent(
                model=BedrockModel(
                    model_id="us.amazon.nova-pro-v1:0",
                    temperature=0.1,
                    top_p=0.9,
                    max_tokens=4000
                ),
                system_prompt=ASSET_CURATOR_PROMPT,
                tools=_mcp_tools
            )
            
            # Format the query for the asset curator with very simple instructions
            formatted_query = f"""
            Search for a car model on Sketchfab. Use the search tool to find one downloadable car model.
            
            Just search for "car" and pick the first good result.
            """
            
        else:
            logger.warning("No MCP tools available, falling back to non-MCP mode")
            
            # Fallback: Create agent without MCP tools
            asset_curator_instance = Agent(
                model=BedrockModel(model_id="us.amazon.nova-pro-v1:0"),
                system_prompt=ASSET_CURATOR_PROMPT
            )
            
            # Format the query for the asset curator (without MCP tools)
            formatted_query = f"""
            Creative Brief: {creative_brief}
            
            Please provide recommendations for 3D assets that would match this creative brief. Since I don't have access to search tools right now, please suggest:
            1. Types of assets that would be appropriate
            2. Specific object names and descriptions
            3. Style and quality requirements
            4. Suggested positioning and scale information
            5. General guidance for finding these assets on platforms like Sketchfab
            
            Focus on 3-5 key assets that will create the foundation of this scene.
            """
        
        response = asset_curator_instance(formatted_query)
        
        # Extract response text
        if hasattr(response, 'message'):
            return str(response.message)
        else:
            return str(response)
            
    except Exception as e:
        logger.error(f"Error in asset curator agent: {str(e)}")
        return f"Error curating assets: {str(e)}"


@tool
def scene_generator_agent(creative_brief: str, curated_assets: str) -> str:
    """
    Generate complete scene JSON from creative brief and curated assets.
    
    Creates structured 3D scene data with precise object positioning,
    lighting setup, and camera configuration.
    
    Args:
        creative_brief: Creative direction and requirements
        curated_assets: List of curated 3D assets with metadata
        
    Returns:
        Complete scene JSON structure ready for 3D rendering
    """
    try:
        print("🏗️ Routed to Scene Generator Agent")
        
        if not STRANDS_AVAILABLE:
            # Return mock scene JSON for testing
            mock_scene = {
                "scene": {
                    "name": "Generated Scene",
                    "objects": [
                        {
                            "id": "fireplace_001",
                            "name": "Stone Fireplace",
                            "position": {"x": 0, "y": 0, "z": -2},
                            "rotation": {"x": 0, "y": 0, "z": 0},
                            "scale": {"x": 1, "y": 1, "z": 1},
                            "asset": {
                                "glb_url": "https://example.com/fireplace.glb",
                                "format": "glb"
                            }
                        }
                    ],
                    "lighting": {
                        "ambient": {"intensity": 0.3, "color": {"r": 1.0, "g": 0.9, "b": 0.7}},
                        "directional": {"intensity": 0.7, "direction": {"x": 1, "y": -1, "z": -1}}
                    },
                    "camera": {
                        "position": {"x": 0, "y": 2, "z": 5},
                        "target": {"x": 0, "y": 0, "z": 0}
                    }
                }
            }
            return f"Mock Scene Generator: {mock_scene}"
        
        # Create specialized scene generator agent
        scene_generator_instance = Agent(
            model=BedrockModel(model_id="amazon.nova-pro-v1:0"),
            system_prompt=SCENE_GENERATOR_PROMPT
        )
        
        # Format the query for the scene generator
        formatted_query = f"""
        Creative Brief: {creative_brief}
        
        Curated Assets: {curated_assets}
        
        Please generate a complete scene JSON structure that includes:
        1. Scene name and description
        2. All objects with precise positioning, rotation, and scale
        3. Lighting configuration that matches the creative brief
        4. Camera positioning for optimal viewing
        
        Ensure the JSON is valid and follows the required structure for 3D rendering.
        """
        
        response = scene_generator_instance(formatted_query)
        
        # Extract response text
        if hasattr(response, 'message'):
            return str(response.message)
        else:
            return str(response)
            
    except Exception as e:
        logger.error(f"Error in scene generator agent: {str(e)}")
        return f"Error generating scene JSON: {str(e)}"


# Export the tools and CDN processor
__all__ = [
    'creative_agent',
    'asset_curator_agent', 
    'scene_generator_agent',
    'cdn_processor_tool'
]

# import os
# sketchfab_api_key = os.getenv('MCP_SKETCHFAB_API_KEY', '')
# print(sketchfab_api_key)
# print("HERE IT IS")