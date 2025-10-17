"""
LocusGen Agent System

This package provides the Strands Agents-based AI system for 3D scene generation.
It includes agent orchestration, conversation management, and MCP tool integration.
"""

from .main import (
    LocusGenAgentOrchestrator,
    get_orchestrator,
    initialize_agent_system,
    ConversationMessage,
    AgentResponse
)

from .conversation_utils import (
    ConversationConverter,
    ConversationContextManager,
    ConversationStateManager,
    DjangoMessage,
    create_conversation_context
)

from .response_processor import (
    ResponseProcessor,
    SceneJSONExtractor,
    MetadataExtractor,
    ProcessedResponse,
    create_mock_scene_response
)

from .config import (
    get_config,
    get_config_manager,
    AgentSystemConfig,
    ModelConfig,
    ConversationConfig,
    MCPServerConfig,
    setup_logging
)

__version__ = "0.1.0"
__author__ = "LocusGen Team"

# Import specialized agents
try:
    from .specialized_agents import (
        creative_agent,
        asset_curator_agent, 
        scene_generator_agent,
        cdn_processor_tool
    )
    SPECIALIZED_AGENTS_AVAILABLE = True
except ImportError:
    # Handle case where specialized_agents can't be imported
    creative_agent = None
    asset_curator_agent = None
    scene_generator_agent = None
    cdn_processor_tool = None
    SPECIALIZED_AGENTS_AVAILABLE = False

# Package-level exports
__all__ = [
    # Main orchestrator
    "LocusGenAgentOrchestrator",
    "get_orchestrator", 
    "initialize_agent_system",
    "ConversationMessage",
    "AgentResponse",
    
    # Conversation utilities
    "ConversationConverter",
    "ConversationContextManager", 
    "ConversationStateManager",
    "DjangoMessage",
    "create_conversation_context",
    
    # Response processing
    "ResponseProcessor",
    "SceneJSONExtractor",
    "MetadataExtractor", 
    "ProcessedResponse",
    "create_mock_scene_response",
    
    # Configuration
    "get_config",
    "get_config_manager",
    "AgentSystemConfig",
    "ModelConfig",
    "ConversationConfig", 
    "MCPServerConfig",
    "setup_logging",
    
    # Specialized agents (if available)
    "creative_agent",
    "asset_curator_agent",
    "scene_generator_agent", 
    "cdn_processor_tool",
    "SPECIALIZED_AGENTS_AVAILABLE"
]