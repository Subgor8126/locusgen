# LocusGen Agent System

This directory contains the Strands Agents-based AI system for 3D scene generation in the LocusGen platform.

## Overview

The LocusGen Agent System provides:

- **Agent Orchestration**: Main orchestrator that manages Strands Agent lifecycle and conversation flow
- **Conversation Management**: Utilities for converting between Django and Strands conversation formats
- **Response Processing**: Extraction and validation of scene JSON and metadata from agent responses
- **MCP Tool Integration**: Foundation for Model Context Protocol (MCP) server integration
- **Configuration Management**: Flexible configuration system for models, conversation settings, and MCP servers

## Architecture

```
agents/
├── main.py                    # Main orchestrator agent
├── specialized_agents.py      # 3 specialized agents as tools
├── conversation_utils.py      # Conversation format conversion utilities
├── response_processor.py      # Agent response processing and scene JSON extraction
├── config.py                 # Configuration management
├── requirements.txt          # Python dependencies
├── Dockerfile               # Container configuration
├── test_setup.py            # Setup verification tests
├── config/
│   └── agent_config.json    # Default configuration
└── tools/                   # MCP servers (Sketchfab search only)
    └── __init__.py
```

## Key Components

### LocusGenAgentOrchestrator

The main orchestrator agent that:
- Coordinates 3 specialized agents as tools
- Creates stateless agent instances with conversation history
- Manages conversation context and memory
- Processes user messages through specialized agent workflow
- Handles CDN processing of final scene JSON

### Specialized Agents (Tools)

**1. Creative Agent**
- Generates creative briefs and design concepts
- Transforms user requests into detailed creative direction
- Defines mood, lighting, style, and spatial arrangements

**2. Asset Curator Agent**
- Searches Sketchfab for high-quality 3D assets
- Uses Sketchfab MCP server tool for asset discovery
- Curates asset collections that match creative briefs

**3. Scene Generator Agent**
- Creates complete scene JSON from creative briefs and assets
- Handles precise object positioning, lighting, and camera setup
- Generates valid JSON structures for 3D rendering

### Conversation Management

- **ConversationConverter**: Converts between Django ChatMessage format and Strands message format
- **ConversationContextManager**: Manages conversation context and history for optimal performance
- **ConversationStateManager**: Tracks current scene state and project metadata

### Response Processing

- **SceneJSONExtractor**: Extracts and validates scene JSON from agent responses
- **MetadataExtractor**: Extracts processing metadata, tool usage, and performance metrics
- **ResponseProcessor**: Coordinates extraction and validation of complete responses

## Configuration

The system uses a flexible configuration system that supports:

- **File-based configuration**: `config/agent_config.json`
- **Environment variable overrides**: See `.env.example`
- **Runtime configuration**: Programmatic configuration updates

### Key Configuration Options

```json
{
  "model": {
    "model_id": "amazon.nova-pro-v1:0",
    "max_tokens": 4000,
    "temperature": 0.7
  },
  "conversation": {
    "window_size": 20,
    "should_truncate_results": true,
    "enable_summarization": false
  },
  "mcp_servers": [
    {
      "name": "sketchfab_search",
      "transport_type": "stdio",
      "enabled": false
    }
  ]
}
```

## Dependencies

### Required Dependencies

- `strands-agents`: Strands Agents SDK for agent orchestration
- `boto3`: AWS SDK for Bedrock integration
- `pydantic`: Data validation and serialization
- `mcp`: Model Context Protocol support

### Development Dependencies

The system includes mock implementations for testing without external dependencies.

## Setup and Installation

1. **Create Virtual Environment**:
   ```bash
   cd agents
   python -m venv agents-env
   agents-env\Scripts\activate  # Windows
   # or
   source agents-env/bin/activate  # Linux/Mac
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Test Setup**:
   ```bash
   python test_setup.py
   ```

## Usage

### Basic Usage

```python
from agents import initialize_agent_system, ConversationMessage

# Initialize the agent system (with 3 specialized agents as tools)
orchestrator = initialize_agent_system()

# Process a message - orchestrator will use specialized agents automatically
response = orchestrator.process_message(
    user_message="Create a cozy living room",
    conversation_history=[],
    is_first_message=True
)

# The orchestrator automatically:
# 1. Calls creative_agent("Create a cozy living room")
# 2. Calls asset_curator_agent(creative_brief) 
# 3. Calls scene_generator_agent(creative_brief, curated_assets)
# 4. Processes scene through CDN

print(f"Response: {response.message}")
print(f"Scene JSON: {response.scene_json}")
```

### Integration with Django Backend

```python
from agents import get_orchestrator, ConversationConverter, DjangoMessage

# Get the global orchestrator
orchestrator = get_orchestrator()

# Convert Django messages to agent format
django_messages = [...]  # List of Django ChatMessage objects
converter = ConversationConverter()
conversation_history = [
    ConversationMessage(
        role=msg.role,
        content=msg.content,
        timestamp=msg.timestamp,
        metadata=msg.metadata
    )
    for msg in django_messages
]

# Process message
response = orchestrator.process_message(
    user_message=user_input,
    conversation_history=conversation_history
)
```

## Agent Workflow

### New Scene Creation:
1. **Creative Agent** receives user request → generates creative brief
2. **Asset Curator Agent** receives creative brief → searches Sketchfab → returns curated assets
3. **Scene Generator Agent** receives brief + assets → generates complete scene JSON
4. **CDN Processor** processes asset URLs → returns final scene with CDN URLs

### Scene Modification:
1. **Creative Agent** analyzes modification request → updates creative direction
2. **Asset Curator Agent** finds additional assets if needed
3. **Scene Generator Agent** modifies existing scene JSON
4. **CDN Processor** processes any new asset URLs

## MCP Tool Integration

The system uses MCP servers for:

- **Sketchfab Search**: Only MCP server - used by Asset Curator Agent
- **CDN Processing**: Simple tool (not MCP) - processes asset URLs through S3/CloudFront

The Asset Curator Agent is the only agent that uses MCP tools (Sketchfab search).

## Deployment

### Docker Deployment

```bash
# Build the container
docker build -t locusgen-agents .

# Run the container
docker run -d \
  --name locusgen-agents \
  -e AWS_REGION=us-east-1 \
  -e LOCUSGEN_ENVIRONMENT=production \
  locusgen-agents
```

### AWS Bedrock AgentCore Deployment

The system is designed to run on AWS Bedrock AgentCore for serverless, scalable deployment:

- Stateless agent instances
- Automatic scaling based on demand
- Built-in authentication and security
- Integration with AWS services

## Testing

Run the setup verification tests:

```bash
python test_setup.py
```

This will verify:
- Configuration loading
- Conversation utilities
- Response processing
- Package imports
- Basic functionality

## Logging and Monitoring

The system includes comprehensive logging:

- **Structured logging** with configurable levels
- **Performance metrics** for processing times
- **Tool usage tracking** for MCP server calls
- **Error handling** with detailed error information

## Security Considerations

- **Stateless design**: No persistent state between requests
- **Input validation**: All inputs are validated and sanitized
- **Error handling**: Graceful error handling without exposing internals
- **AWS integration**: Leverages AWS security features for authentication and authorization

## Future Enhancements

- **Multi-agent workflows**: Support for specialized agent collaboration
- **Advanced conversation management**: Intelligent summarization and context management
- **Performance optimization**: Caching and optimization for high-throughput scenarios
- **Monitoring integration**: Integration with monitoring and alerting systems

## Contributing

When adding new features:

1. Follow the existing code structure and patterns
2. Add appropriate tests and documentation
3. Update configuration as needed
4. Ensure compatibility with both development and production environments

## License

This code is part of the LocusGen platform and follows the project's licensing terms.