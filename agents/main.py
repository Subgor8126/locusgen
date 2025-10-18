"""
LocusGen Agent System - Main Orchestrator

This module provides the main agent orchestration functionality for the LocusGen
3D scene generation system. It integrates with Strands Agents SDK to process
user messages and generate 3D scenes with appropriate assets.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime

try:
    from strands import Agent
    from strands.agent.conversation_manager import SlidingWindowConversationManager
    from strands.models import BedrockModel
    STRANDS_AVAILABLE = True
except ImportError:
    # Mock classes for testing without Strands Agents
    STRANDS_AVAILABLE = False
    
    class MockAgentResponse:
        def __init__(self, message: str):
            self.message = message
    
    class MockAgent:
        def __init__(self, **kwargs):
            self.kwargs = kwargs
        
        def __call__(self, message):
            return MockAgentResponse(f"Mock response to: {message}")
    
    class MockSlidingWindowConversationManager:
        def __init__(self, window_size=20, should_truncate_results=True):
            self.window_size = window_size
            self.should_truncate_results = should_truncate_results
    
    class MockBedrockModel:
        def __init__(self, **kwargs):
            self.kwargs = kwargs
    
    Agent = MockAgent
    SlidingWindowConversationManager = MockSlidingWindowConversationManager
    BedrockModel = MockBedrockModel

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import specialized agents as tools
try:
    from .specialized_agents import (
        creative_agent,
        asset_curator_agent, 
        scene_generator_agent,
        cdn_processor_tool
    )
except ImportError:
    # Handle relative import issues in testing
    try:
        from specialized_agents import (
            creative_agent,
            asset_curator_agent, 
            scene_generator_agent,
            cdn_processor_tool
        )
    except ImportError:
        # Mock tools for testing
        def creative_agent(request): return f"Mock creative agent: {request}"
        def asset_curator_agent(brief): return f"Mock asset curator: {brief}"
        def scene_generator_agent(brief, assets): return f"Mock scene generator: {brief}, {assets}"
        def cdn_processor_tool(scene): return scene

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ConversationMessage:
    """Represents a single message in the conversation history."""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class AgentResponse:
    """Represents the response from the agent system."""
    message: str
    scene_json: Dict[str, Any]
    metadata: Dict[str, Any]
    processing_time: float


class LocusGenAgentOrchestrator:
    """
    Main orchestrator for the LocusGen agent system.
    
    This class manages the Strands Agent lifecycle, conversation history,
    and integration with MCP tools for 3D scene generation.
    """
    
    def __init__(self, model_config: Optional[Dict[str, Any]] = None):
        """
        Initialize the agent orchestrator.
        
        Args:
            model_config: Optional configuration for the language model
        """
        self.model_config = model_config or self._get_default_model_config()
        self.conversation_manager = SlidingWindowConversationManager(
            window_size=20,  # Keep last 20 messages
            should_truncate_results=True
        )
        
        # Initialize tools - 3 specialized agents + CDN processor
        self.tools = [
            creative_agent,
            asset_curator_agent,
            scene_generator_agent,
            # Note: cdn_processor_tool is used directly, not as a Strands tool
        ]
        
        if not STRANDS_AVAILABLE:
            logger.warning("Strands Agents SDK not available - running in mock mode")
        
        logger.info("LocusGen Agent Orchestrator initialized")
    
    def _get_default_model_config(self) -> Dict[str, Any]:
        """Get default model configuration for Amazon Nova Pro."""
        return {
            "model_id": "amazon.nova-pro-v1:0",
            "max_tokens": 4000,
            "params": {
                "temperature": 0.7,
                "top_p": 0.9
            }
        }
    
    def _create_agent_instance(self, conversation_history: List[ConversationMessage]) -> Agent:
        """
        Create a new Strands Agent instance with conversation history.
        
        Args:
            conversation_history: List of previous conversation messages
            
        Returns:
            Configured Agent instance
        """
        # Convert conversation history to Strands format
        strands_messages = self._convert_to_strands_format(conversation_history)
        
        # Create the model - will use BedrockModel for Amazon Nova Pro
        model = BedrockModel(
            model_id=self.model_config["model_id"],
            max_tokens=self.model_config["max_tokens"],
            params=self.model_config["params"]
        )
        
        # Create agent with conversation history and tools
        agent = Agent(
            model=model,
            messages=strands_messages,
            tools=self.tools,
            conversation_manager=self.conversation_manager,
            system_prompt=self._get_system_prompt()
        )
        
        return agent
    
    def _convert_to_strands_format(self, messages: List[ConversationMessage]) -> List[Dict[str, Any]]:
        """
        Convert Django conversation messages to Strands Agent format.
        
        Args:
            messages: List of ConversationMessage objects
            
        Returns:
            List of messages in Strands format
        """
        strands_messages = []
        
        for msg in messages:
            strands_message = {
                "role": msg.role,
                "content": msg.content
            }
            
            # Add metadata if available
            if msg.metadata:
                strands_message["metadata"] = msg.metadata
                
            strands_messages.append(strands_message)
        
        return strands_messages
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for the main orchestrator agent."""
        return """You are LocusGen, the main orchestrator for 3D scene generation. You coordinate specialized agents to create immersive 3D environments.

Available Specialized Agents (use as tools):
1. creative_agent(user_request) - Creates detailed creative briefs and design concepts
2. asset_curator_agent(creative_brief) - Finds and curates 3D assets from Sketchfab  
3. scene_generator_agent(creative_brief, curated_assets) - Generates complete scene JSON

Workflow for new scenes:
1. Call creative_agent with the user's request to get a creative brief
2. Call asset_curator_agent with the creative brief to find suitable 3D assets
3. Call scene_generator_agent with both the creative brief and curated assets to generate scene JSON
4. Process the scene JSON through CDN (handled automatically)
5. Present the final scene to the user with explanations

Workflow for scene modifications:
1. Understand the current scene and requested changes
2. Call creative_agent if new creative direction is needed
3. Call asset_curator_agent if new assets are required
4. Call scene_generator_agent to update the scene JSON
5. Process through CDN and present the updated scene

Key principles:
- Always use the specialized agents for their expertise
- Provide conversational explanations of what you're doing
- Ensure scene JSON is complete and valid
- Create realistic spatial relationships and lighting
- Explain your reasoning and the agents' contributions

Remember: You orchestrate the process but rely on specialized agents for the actual creative work, asset curation, and scene generation."""
    
    def process_message(
        self, 
        user_message: str, 
        conversation_history: List[ConversationMessage],
        is_first_message: bool = False
    ) -> AgentResponse:
        """
        Process a user message and generate a response with scene data.
        
        Args:
            user_message: The user's input message
            conversation_history: Previous conversation messages
            is_first_message: Whether this is the first message in the conversation
            
        Returns:
            AgentResponse containing the assistant's response and scene data
        """
        start_time = datetime.now()
        
        try:
            # Create agent instance with conversation history
            agent = self._create_agent_instance(conversation_history)
            
            # Process the message
            logger.info(f"Processing message: {user_message[:100]}...")
            result = agent(user_message)
            
            # Extract response components
            response_message = result.message if hasattr(result, 'message') else str(result)
            scene_json = self._extract_scene_json(result)
            metadata = self._extract_metadata(result, is_first_message)
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            metadata["processing_time"] = processing_time
            
            logger.info(f"Message processed successfully in {processing_time:.2f}s")
            
            return AgentResponse(
                message=response_message,
                scene_json=scene_json,
                metadata=metadata,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            
            # Return error response
            processing_time = (datetime.now() - start_time).total_seconds()
            return AgentResponse(
                message=f"I apologize, but I encountered an error while processing your request: {str(e)}",
                scene_json={},
                metadata={
                    "error": str(e),
                    "processing_time": processing_time,
                    "tools_used": []
                },
                processing_time=processing_time
            )
    
    def _extract_scene_json(self, agent_result: Any) -> Dict[str, Any]:
        """
        Extract scene JSON data from agent result.
        
        Args:
            agent_result: The result from the Strands Agent
            
        Returns:
            Scene JSON data or empty dict if none found
        """
        try:
            # Import response processor to extract scene JSON
            try:
                from .response_processor import SceneJSONExtractor
            except ImportError:
                from response_processor import SceneJSONExtractor
            
            extractor = SceneJSONExtractor()
            scene_json = extractor.extract_scene_json(agent_result)
            
            # Process through CDN if scene JSON was found
            if scene_json and scene_json.get("scene", {}).get("objects"):
                scene_json = cdn_processor_tool(scene_json)
                logger.info("Scene JSON processed through CDN")
            
            return scene_json
            
        except Exception as e:
            logger.error(f"Error extracting scene JSON: {str(e)}")
            return {}
    
    def _extract_metadata(self, agent_result: Any, is_first_message: bool) -> Dict[str, Any]:
        """
        Extract metadata from agent result.
        
        Args:
            agent_result: The result from the Strands Agent
            is_first_message: Whether this was the first message
            
        Returns:
            Metadata dictionary
        """
        metadata = {
            "tools_used": [],
            "is_first_message": is_first_message,
            "timestamp": datetime.now().isoformat()
        }
        
        # Extract tool usage information if available
        if hasattr(agent_result, 'tool_calls'):
            metadata["tools_used"] = [tool.name for tool in agent_result.tool_calls]
        
        return metadata
    
    def add_mcp_tools(self, tools: List[Any]) -> None:
        """
        Add MCP tools to the agent system.
        
        Args:
            tools: List of MCP tools to add
        """
        self.tools.extend(tools)
        logger.info(f"Added {len(tools)} MCP tools to agent system")
    
    def get_health_status(self) -> Dict[str, Any]:
        """
        Get the health status of the agent system.
        
        Returns:
            Health status information
        """
        return {
            "status": "healthy",
            "model_config": self.model_config,
            "tools_count": len(self.tools),
            "conversation_manager": {
                "type": "SlidingWindowConversationManager",
                "window_size": self.conversation_manager.window_size
            },
            "timestamp": datetime.now().isoformat()
        }


# Global orchestrator instance
orchestrator = None


def get_orchestrator() -> LocusGenAgentOrchestrator:
    """Get or create the global orchestrator instance."""
    global orchestrator
    if orchestrator is None:
        orchestrator = LocusGenAgentOrchestrator()
    return orchestrator


def initialize_agent_system(model_config: Optional[Dict[str, Any]] = None) -> LocusGenAgentOrchestrator:
    """
    Initialize the agent system with optional configuration.
    
    Args:
        model_config: Optional model configuration
        
    Returns:
        Initialized orchestrator instance
    """
    global orchestrator
    orchestrator = LocusGenAgentOrchestrator(model_config)
    return orchestrator


# FastAPI app for AgentCore HTTP endpoints
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

# Create FastAPI app
app = FastAPI(title="LocusGen Agent System", version="1.0.0")

class InvocationRequest(BaseModel):
    """Request model for /invocations endpoint"""
    # AgentCore sends nested input structure
    input: Dict[str, Any]
    conversation_history: List[Dict[str, Any]] = []

class InvocationResponse(BaseModel):
    """Response model for /invocations endpoint"""
    content: str  # Changed from 'message' to 'content' to match backend expectation
    scene_json: Dict[str, Any]
    metadata: Dict[str, Any]
    processing_time: float

@app.post("/invocations", response_model=InvocationResponse)
async def invoke_agent(request: InvocationRequest):
    """
    AgentCore /invocations endpoint for LocusGen agent system.
    
    Args:
        request: Request containing user prompt and conversation history
        
    Returns:
        Agent response with message, scene_json, and metadata
    """
    try:
        # Extract user message from request (AgentCore sends nested input)
        user_message = request.input.get("prompt", "")
        if not user_message:
            raise HTTPException(
                status_code=400, 
                detail="No prompt provided in input. Please provide input.prompt field."
            )
        
        # Extract conversation history from request
        conversation_history = []
        for msg in request.conversation_history:
            conversation_history.append(ConversationMessage(
                role=msg.get("role", "user"),
                content=msg.get("content", ""),
                timestamp=datetime.fromisoformat(msg.get("timestamp", datetime.now().isoformat())),
                metadata=msg.get("metadata", {})
            ))
        
        # Determine if this is the first message
        is_first_message = len(conversation_history) == 0
        
        # Initialize orchestrator
        orchestrator = get_orchestrator()
        
        # Process message
        response = orchestrator.process_message(
            user_message=user_message,
            conversation_history=conversation_history,
            is_first_message=is_first_message
        )
        
        # Return response in AgentCore format
        return InvocationResponse(
            content=response.message,  # Map 'message' to 'content' for backend compatibility
            scene_json=response.scene_json,
            metadata=response.metadata,
            processing_time=response.processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in /invocations endpoint: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Agent processing error: {str(e)}"
        )

@app.get("/ping")
async def ping():
    """
    AgentCore /ping endpoint for health checks.
    
    Returns:
        Health status information
    """
    try:
        orchestrator = get_orchestrator()
        health_status = orchestrator.get_health_status()
        return {"status": "healthy", "details": health_status}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {"status": "unhealthy", "error": str(e)}

# Test endpoint for local development
@app.get("/")
async def root():
    """Root endpoint for basic connectivity testing"""
    return {
        "service": "LocusGen Agent System",
        "status": "running",
        "endpoints": {
            "invocations": "POST /invocations",
            "ping": "GET /ping"
        }
    }

if __name__ == "__main__":
    # For local testing
    import uvicorn
    logger.info("Starting LocusGen Agent System as FastAPI server")
    uvicorn.run(app, host="0.0.0.0", port=8080)