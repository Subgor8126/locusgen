"""
Configuration Management for LocusGen Agent System

This module handles configuration for the Strands Agents system,
including model settings, MCP server configurations, and environment variables.
"""

import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from pathlib import Path
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """Configuration for the language model."""
    model_id: str = "us.amazon.nova-pro-v1:0"
    max_tokens: int = 4000
    temperature: float = 0.7
    top_p: float = 0.9
    params: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Set up default params if not provided."""
        if not self.params:
            self.params = {
                "temperature": self.temperature,
                "top_p": self.top_p
            }


@dataclass
class ConversationConfig:
    """Configuration for conversation management."""
    window_size: int = 20
    should_truncate_results: bool = True
    max_context_messages: int = 20
    enable_summarization: bool = False
    summary_ratio: float = 0.3
    preserve_recent_messages: int = 10


@dataclass
class MCPServerConfig:
    """Configuration for MCP server connections."""
    name: str
    transport_type: str  # 'stdio', 'sse', 'streamable_http'
    connection_params: Dict[str, Any] = field(default_factory=dict)
    enabled: bool = True
    auto_retry: bool = True
    timeout: int = 30


@dataclass
class AgentSystemConfig:
    """Main configuration for the agent system."""
    model: ModelConfig = field(default_factory=ModelConfig)
    conversation: ConversationConfig = field(default_factory=ConversationConfig)
    mcp_servers: List[MCPServerConfig] = field(default_factory=list)
    environment: str = "development"
    debug_mode: bool = False
    log_level: str = "INFO"
    
    # AWS/Bedrock specific settings
    aws_region: str = "us-east-1"
    bedrock_runtime_endpoint: Optional[str] = None
    
    # System settings
    max_processing_time: int = 300  # 5 minutes
    enable_health_checks: bool = True
    health_check_interval: int = 60  # seconds


class ConfigManager:
    """Manages configuration loading and validation."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the configuration manager.
        
        Args:
            config_path: Optional path to configuration file
        """
        self.config_path = config_path or self._get_default_config_path()
        self._config: Optional[AgentSystemConfig] = None
    
    def _get_default_config_path(self) -> str:
        """Get the default configuration file path."""
        return os.path.join(os.path.dirname(__file__), "config", "agent_config.json")
    
    def load_config(self) -> AgentSystemConfig:
        """
        Load configuration from file and environment variables.
        
        Returns:
            Loaded configuration object
        """
        if self._config is not None:
            return self._config
        
        # Start with default configuration
        config = AgentSystemConfig()
        
        # Load from file if it exists
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    file_config = json.load(f)
                config = self._merge_config(config, file_config)
                logger.info(f"Loaded configuration from {self.config_path}")
            except Exception as e:
                logger.warning(f"Failed to load config file: {str(e)}")
        
        # Override with environment variables
        config = self._apply_env_overrides(config)
        
        # Validate configuration
        self._validate_config(config)
        
        self._config = config
        return config
    
    def _merge_config(self, base_config: AgentSystemConfig, file_config: Dict[str, Any]) -> AgentSystemConfig:
        """Merge file configuration with base configuration."""
        # Update model config
        if 'model' in file_config:
            model_data = file_config['model']
            base_config.model = ModelConfig(
                model_id=model_data.get('model_id', base_config.model.model_id),
                max_tokens=model_data.get('max_tokens', base_config.model.max_tokens),
                temperature=model_data.get('temperature', base_config.model.temperature),
                top_p=model_data.get('top_p', base_config.model.top_p),
                params=model_data.get('params', base_config.model.params)
            )
        
        # Update conversation config
        if 'conversation' in file_config:
            conv_data = file_config['conversation']
            base_config.conversation = ConversationConfig(
                window_size=conv_data.get('window_size', base_config.conversation.window_size),
                should_truncate_results=conv_data.get('should_truncate_results', base_config.conversation.should_truncate_results),
                max_context_messages=conv_data.get('max_context_messages', base_config.conversation.max_context_messages),
                enable_summarization=conv_data.get('enable_summarization', base_config.conversation.enable_summarization),
                summary_ratio=conv_data.get('summary_ratio', base_config.conversation.summary_ratio),
                preserve_recent_messages=conv_data.get('preserve_recent_messages', base_config.conversation.preserve_recent_messages)
            )
        
        # Update MCP servers
        if 'mcp_servers' in file_config:
            mcp_servers = []
            for server_data in file_config['mcp_servers']:
                server_config = MCPServerConfig(
                    name=server_data['name'],
                    transport_type=server_data['transport_type'],
                    connection_params=server_data.get('connection_params', {}),
                    enabled=server_data.get('enabled', True),
                    auto_retry=server_data.get('auto_retry', True),
                    timeout=server_data.get('timeout', 30)
                )
                mcp_servers.append(server_config)
            base_config.mcp_servers = mcp_servers
        
        # Update other settings
        base_config.environment = file_config.get('environment', base_config.environment)
        base_config.debug_mode = file_config.get('debug_mode', base_config.debug_mode)
        base_config.log_level = file_config.get('log_level', base_config.log_level)
        base_config.aws_region = file_config.get('aws_region', base_config.aws_region)
        base_config.bedrock_runtime_endpoint = file_config.get('bedrock_runtime_endpoint', base_config.bedrock_runtime_endpoint)
        
        return base_config
    
    def _apply_env_overrides(self, config: AgentSystemConfig) -> AgentSystemConfig:
        """Apply environment variable overrides."""
        # Model configuration
        if os.getenv('LOCUSGEN_MODEL_ID'):
            config.model.model_id = os.getenv('LOCUSGEN_MODEL_ID')
        if os.getenv('LOCUSGEN_MAX_TOKENS'):
            config.model.max_tokens = int(os.getenv('LOCUSGEN_MAX_TOKENS'))
        if os.getenv('LOCUSGEN_TEMPERATURE'):
            config.model.temperature = float(os.getenv('LOCUSGEN_TEMPERATURE'))
        
        # Environment settings
        if os.getenv('LOCUSGEN_ENVIRONMENT'):
            config.environment = os.getenv('LOCUSGEN_ENVIRONMENT')
        if os.getenv('LOCUSGEN_DEBUG_MODE'):
            config.debug_mode = os.getenv('LOCUSGEN_DEBUG_MODE').lower() == 'true'
        if os.getenv('LOCUSGEN_LOG_LEVEL'):
            config.log_level = os.getenv('LOCUSGEN_LOG_LEVEL')
        
        # AWS settings
        if os.getenv('AWS_REGION'):
            config.aws_region = os.getenv('AWS_REGION')
        if os.getenv('BEDROCK_RUNTIME_ENDPOINT'):
            config.bedrock_runtime_endpoint = os.getenv('BEDROCK_RUNTIME_ENDPOINT')
        
        return config
    
    def _validate_config(self, config: AgentSystemConfig) -> None:
        """Validate configuration values."""
        # Validate model configuration
        if config.model.max_tokens <= 0:
            raise ValueError("max_tokens must be positive")
        if not 0 <= config.model.temperature <= 2:
            raise ValueError("temperature must be between 0 and 2")
        if not 0 <= config.model.top_p <= 1:
            raise ValueError("top_p must be between 0 and 1")
        
        # Validate conversation configuration
        if config.conversation.window_size <= 0:
            raise ValueError("window_size must be positive")
        if not 0 <= config.conversation.summary_ratio <= 1:
            raise ValueError("summary_ratio must be between 0 and 1")
        
        # Validate MCP server configurations
        for server in config.mcp_servers:
            if server.transport_type not in ['stdio', 'sse', 'streamable_http']:
                raise ValueError(f"Invalid transport_type: {server.transport_type}")
            if server.timeout <= 0:
                raise ValueError("MCP server timeout must be positive")
        
        logger.info("Configuration validation passed")
    
    def save_config(self, config: AgentSystemConfig) -> None:
        """
        Save configuration to file.
        
        Args:
            config: Configuration to save
        """
        # Create config directory if it doesn't exist
        config_dir = os.path.dirname(self.config_path)
        os.makedirs(config_dir, exist_ok=True)
        
        # Convert to dictionary
        config_dict = {
            'model': {
                'model_id': config.model.model_id,
                'max_tokens': config.model.max_tokens,
                'temperature': config.model.temperature,
                'top_p': config.model.top_p,
                'params': config.model.params
            },
            'conversation': {
                'window_size': config.conversation.window_size,
                'should_truncate_results': config.conversation.should_truncate_results,
                'max_context_messages': config.conversation.max_context_messages,
                'enable_summarization': config.conversation.enable_summarization,
                'summary_ratio': config.conversation.summary_ratio,
                'preserve_recent_messages': config.conversation.preserve_recent_messages
            },
            'mcp_servers': [
                {
                    'name': server.name,
                    'transport_type': server.transport_type,
                    'connection_params': server.connection_params,
                    'enabled': server.enabled,
                    'auto_retry': server.auto_retry,
                    'timeout': server.timeout
                }
                for server in config.mcp_servers
            ],
            'environment': config.environment,
            'debug_mode': config.debug_mode,
            'log_level': config.log_level,
            'aws_region': config.aws_region,
            'bedrock_runtime_endpoint': config.bedrock_runtime_endpoint
        }
        
        # Save to file
        with open(self.config_path, 'w') as f:
            json.dump(config_dict, f, indent=2)
        
        logger.info(f"Configuration saved to {self.config_path}")


def get_default_mcp_servers() -> List[MCPServerConfig]:
    """Get default MCP server configurations."""
    return [
        MCPServerConfig(
            name="sketchfab_search",
            transport_type="stdio",
            connection_params={
                "command": "python",
                "args": ["tools/sketchfab_mcp_server.py"]
            },
            enabled=False  # Will be enabled when implemented
        )
    ]


def create_default_config() -> AgentSystemConfig:
    """Create a default configuration with sensible defaults."""
    config = AgentSystemConfig()
    config.mcp_servers = get_default_mcp_servers()
    return config


# Global configuration manager instance
_config_manager: Optional[ConfigManager] = None


def get_config_manager() -> ConfigManager:
    """Get the global configuration manager instance."""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager


def get_config() -> AgentSystemConfig:
    """Get the current configuration."""
    return get_config_manager().load_config()


def setup_logging(config: AgentSystemConfig) -> None:
    """
    Set up logging based on configuration.
    
    Args:
        config: Agent system configuration
    """
    log_level = getattr(logging, config.log_level.upper(), logging.INFO)
    
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('agents.log') if config.debug_mode else logging.NullHandler()
        ]
    )
    
    # Set specific logger levels
    if config.debug_mode:
        logging.getLogger('strands').setLevel(logging.DEBUG)
        logging.getLogger('mcp').setLevel(logging.DEBUG)
    else:
        logging.getLogger('strands').setLevel(logging.INFO)
        logging.getLogger('mcp').setLevel(logging.WARNING)