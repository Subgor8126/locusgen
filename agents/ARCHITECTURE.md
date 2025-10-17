# LocusGen Agent System - Corrected Architecture

## 🎯 **Final Architecture Overview**

The LocusGen Agent System implements a **multi-agent architecture** using Strands Agents' "Agents as Tools" pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                 MAIN ORCHESTRATOR AGENT                    │
│                (Amazon Nova Pro)                           │
│                                                             │
│  Has 4 Tools:                                             │
│  ├── creative_agent        (Agent as Tool)                │
│  ├── asset_curator_agent   (Agent as Tool + Sketchfab MCP)│
│  ├── scene_generator_agent (Agent as Tool)                │
│  └── cdn_processor_tool    (Simple Function Tool)         │
└─────────────────────────────────────────────────────────────┘
```

## 🤖 **Agent Roles & Responsibilities**

### **Main Orchestrator Agent**
- **Model**: Amazon Nova Pro (`amazon.nova-pro-v1:0`)
- **Role**: Coordinates the entire 3D scene generation workflow
- **Tools**: 3 specialized agents + CDN processor
- **Responsibilities**:
  - Receives user requests from Django backend
  - Determines which specialized agents to call and in what order
  - Manages conversation flow and context
  - Processes final scene JSON through CDN
  - Returns complete response to Django

### **1. Creative Agent** (`creative_agent`)
- **Type**: Agent as Tool (using `@tool` decorator)
- **Model**: Amazon Nova Pro
- **Role**: Creative Director
- **Input**: User's natural language request
- **Output**: Detailed creative brief with design specifications
- **Responsibilities**:
  - Transform vague requests into specific creative direction
  - Define mood, style, and atmosphere
  - Specify lighting preferences and color schemes
  - Provide spatial arrangement guidelines
  - Set creative constraints for asset selection

### **2. Asset Curator Agent** (`asset_curator_agent`)
- **Type**: Agent as Tool (using `@tool` decorator)
- **Model**: Amazon Nova Pro
- **MCP Tools**: Sketchfab Search MCP Server
- **Role**: Asset Finder and Curator
- **Input**: Creative brief from Creative Agent
- **Output**: Curated list of 3D assets with metadata
- **Responsibilities**:
  - Search Sketchfab API for high-quality 3D models
  - Filter assets by quality, licensing, and compatibility
  - Curate collections that match creative requirements
  - Provide asset metadata for scene generation

### **3. Scene Generator Agent** (`scene_generator_agent`)
- **Type**: Agent as Tool (using `@tool` decorator)
- **Model**: Amazon Nova Pro
- **Role**: Scene JSON Creator
- **Input**: Creative brief + curated assets
- **Output**: Complete, valid scene JSON
- **Responsibilities**:
  - Generate structured 3D scene JSON
  - Position objects with realistic spatial relationships
  - Create lighting setups based on creative direction
  - Set camera positioning for optimal viewing
  - Ensure all transforms are properly defined

### **4. CDN Processor Tool** (`cdn_processor_tool`)
- **Type**: Simple Python function (not an agent)
- **Role**: Asset URL Processor
- **Input**: Scene JSON with original asset URLs
- **Output**: Scene JSON with CDN URLs
- **Responsibilities**:
  - Download GLB files from Sketchfab
  - Upload assets to S3 bucket
  - Generate CloudFront CDN URLs
  - Update scene JSON with processed URLs

## 🔄 **Workflow Examples**

### **New Scene Creation Workflow:**

```python
# User: "Create a cozy living room with a fireplace"

# 1. Orchestrator receives request
orchestrator_agent(user_message="Create a cozy living room with a fireplace")

# 2. Orchestrator calls Creative Agent
creative_brief = creative_agent("Create a cozy living room with a fireplace")
# Returns: "Cozy living room with warm lighting, rustic style, fireplace as focal point..."

# 3. Orchestrator calls Asset Curator Agent  
curated_assets = asset_curator_agent(creative_brief)
# Uses Sketchfab MCP to find: fireplace, sofa, coffee table, etc.

# 4. Orchestrator calls Scene Generator Agent
scene_json = scene_generator_agent(creative_brief, curated_assets)
# Returns: Complete scene JSON with positioned objects

# 5. Orchestrator processes through CDN
final_scene = cdn_processor_tool(scene_json)
# Returns: Scene JSON with CDN URLs

# 6. Orchestrator returns complete response to Django
```

### **Scene Modification Workflow:**

```python
# User: "Make the fireplace bigger and add some books"

# 1. Orchestrator analyzes existing scene + modification request
# 2. Calls Creative Agent for updated creative direction
# 3. Calls Asset Curator Agent if new assets needed (books)
# 4. Calls Scene Generator Agent to modify existing scene
# 5. Processes through CDN
# 6. Returns updated scene
```

## 🛠️ **MCP Integration**

### **Only One MCP Server:**
- **Sketchfab Search MCP Server**: Used exclusively by Asset Curator Agent
- **Location**: `agents/tools/sketchfab_mcp_server.py` (to be implemented)
- **Purpose**: Search and retrieve 3D asset metadata from Sketchfab API

### **No MCP Servers For:**
- ❌ Scene Generator (it's an agent, not MCP server)
- ❌ CDN Processor (it's a simple tool, not MCP server)
- ❌ Creative Agent (it's an agent, not MCP server)

## 📁 **File Structure**

```
agents/
├── main.py                    # Main orchestrator agent
├── specialized_agents.py      # 3 specialized agents + CDN tool
├── conversation_utils.py      # Django ↔ Strands conversion
├── response_processor.py      # Scene JSON extraction
├── config.py                 # Configuration management
├── __init__.py               # Package exports
├── requirements.txt          # Dependencies
├── Dockerfile               # Container setup
├── test_setup.py            # Verification tests
├── integration_example.py    # Django integration demo
├── README.md                # Documentation
├── ARCHITECTURE.md          # This file
├── config/
│   └── agent_config.json    # Configuration
└── tools/
    ├── __init__.py
    └── sketchfab_mcp_server.py  # (To be implemented)
```

## 🚀 **Key Benefits**

### **1. Separation of Concerns**
- Each agent has a focused responsibility
- Creative direction separate from asset curation
- Scene generation separate from asset processing

### **2. Modular Architecture**
- Agents can be modified independently
- Easy to add new specialized agents
- Clear interfaces between components

### **3. Scalable Design**
- Stateless architecture perfect for AWS Bedrock AgentCore
- Each request creates fresh agent instances
- No shared state between requests

### **4. Testable Components**
- Each agent can be tested independently
- Mock implementations for development
- Clear input/output contracts

## 🔧 **Implementation Details**

### **Strands Agents Integration:**
```python
# Each specialized agent uses @tool decorator
@tool
def creative_agent(user_request: str) -> str:
    creative_agent_instance = Agent(
        model=BedrockModel(model_id="amazon.nova-pro-v1:0"),
        system_prompt=CREATIVE_AGENT_PROMPT
    )
    return creative_agent_instance(formatted_query)

# Main orchestrator has all agents as tools
orchestrator = Agent(
    model=BedrockModel(model_id="amazon.nova-pro-v1:0"),
    tools=[creative_agent, asset_curator_agent, scene_generator_agent],
    system_prompt=ORCHESTRATOR_PROMPT
)
```

### **Stateless Operation:**
- Fresh agent instances created per request
- Full conversation history loaded from Django
- No persistent state between requests
- Perfect for serverless deployment

### **Error Handling:**
- Each agent has try/catch error handling
- Graceful degradation with mock responses
- Detailed logging and error reporting
- Fallback mechanisms for failed tool calls

## 🎯 **Next Steps**

1. **Implement Sketchfab MCP Server** (`agents/tools/sketchfab_mcp_server.py`)
2. **Install Strands Agents SDK** (`pip install strands-agents`)
3. **Configure AWS Bedrock credentials**
4. **Update Django backend** to call agent system
5. **Deploy to AWS Bedrock AgentCore** for production

This architecture provides a robust, scalable foundation for 3D scene generation using specialized AI agents working together through the Strands Agents framework.