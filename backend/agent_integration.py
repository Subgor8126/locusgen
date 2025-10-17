"""
Bedrock AgentCore Integration for Django Backend

This module handles integration with the LocusGen agent system deployed
as a Bedrock AgentCore Runtime endpoint.
"""

import json
import logging
import boto3
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


class BedrockAgentCoreIntegrator:
    """
    Integrates Django backend with LocusGen agent system via Bedrock AgentCore Runtime.
    """
    
    def __init__(self):
        """Initialize the AgentCore integrator."""
        self.client = boto3.client('bedrock-agentcore', region_name=getattr(settings, 'AWS_REGION', 'us-east-1'))
        self.agent_arn = getattr(settings, 'LOCUSGEN_AGENT_ARN', None)
        
        if not self.agent_arn:
            logger.warning("LOCUSGEN_AGENT_ARN not configured - agent integration will fail")
    
    def process_message(
        self, 
        user_message: str, 
        conversation_history: List[Dict[str, Any]], 
        is_first_message: bool = False,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a user message through the Bedrock AgentCore Runtime.
        
        Args:
            user_message: The user's input message
            conversation_history: Previous conversation messages in Django format
            is_first_message: Whether this is the first message in the conversation
            session_id: Optional session ID for conversation continuity
            
        Returns:
            Dictionary containing agent response, scene_json, and metadata
        """
        try:
            if not self.agent_arn:
                raise Exception("Agent ARN not configured")
            
            # Generate session ID if not provided
            if not session_id:
                session_id = str(uuid.uuid4())
            
            # Prepare payload for AgentCore
            payload = {
                "prompt": user_message,
                "conversation_history": conversation_history,
                "is_first_message": is_first_message,
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "session_id": session_id
                }
            }
            
            # Convert payload to bytes
            payload_bytes = json.dumps(payload).encode('utf-8')
            
            logger.info(f"Invoking AgentCore Runtime with session {session_id}")
            
            # Invoke the AgentCore Runtime
            response = self.client.invoke_agent_runtime(
                agentRuntimeArn=self.agent_arn,
                runtimeSessionId=session_id,
                payload=payload_bytes
            )
            
            # Process the streaming response
            result = self._process_streaming_response(response)
            
            logger.info(f"AgentCore processing completed in {result.get('processing_time', 0):.2f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Error invoking AgentCore Runtime: {str(e)}")
            
            # Return error response
            return {
                "content": f"I apologize, but I encountered an error while processing your request: {str(e)}",
                "scene_json": {},
                "metadata": {
                    "error": True,
                    "error_message": str(e),
                    "timestamp": datetime.now().isoformat()
                }
            }
    
    def _process_streaming_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process the streaming response from AgentCore Runtime.
        
        Args:
            response: The response from invoke_agent_runtime
            
        Returns:
            Processed response data
        """
        try:
            content_type = response.get("contentType", "")
            
            if "text/event-stream" in content_type:
                # Handle streaming response
                content_chunks = []
                
                for line in response["response"].iter_lines(chunk_size=1024):
                    if line:
                        line_str = line.decode("utf-8")
                        if line_str.startswith("data: "):
                            data_str = line_str[6:]  # Remove "data: " prefix
                            try:
                                # Try to parse as JSON
                                chunk_data = json.loads(data_str)
                                content_chunks.append(chunk_data)
                            except json.JSONDecodeError:
                                # If not JSON, treat as text
                                content_chunks.append(data_str)
                
                # Combine chunks into final response
                return self._combine_response_chunks(content_chunks)
                
            elif content_type == "application/json":
                # Handle standard JSON response
                content_parts = []
                for chunk in response.get("response", []):
                    content_parts.append(chunk.decode('utf-8'))
                
                full_content = ''.join(content_parts)
                return json.loads(full_content)
            
            else:
                # Handle other content types
                logger.warning(f"Unexpected content type: {content_type}")
                return {
                    "content": "Received unexpected response format from agent",
                    "scene_json": {},
                    "metadata": {"error": True, "content_type": content_type}
                }
                
        except Exception as e:
            logger.error(f"Error processing streaming response: {str(e)}")
            return {
                "content": f"Error processing agent response: {str(e)}",
                "scene_json": {},
                "metadata": {"error": True, "error_message": str(e)}
            }
    
    def _combine_response_chunks(self, chunks: List[Any]) -> Dict[str, Any]:
        """
        Combine response chunks into a final response.
        
        Args:
            chunks: List of response chunks
            
        Returns:
            Combined response data
        """
        # If we have a single JSON chunk, return it
        if len(chunks) == 1 and isinstance(chunks[0], dict):
            return chunks[0]
        
        # If we have multiple chunks, try to combine them
        combined_content = ""
        scene_json = {}
        metadata = {}
        
        for chunk in chunks:
            if isinstance(chunk, dict):
                # JSON chunk
                if "message" in chunk:
                    combined_content += chunk["message"]
                elif "content" in chunk:
                    combined_content += chunk["content"]
                
                if "scene_json" in chunk and chunk["scene_json"]:
                    scene_json = chunk["scene_json"]
                
                if "metadata" in chunk:
                    metadata.update(chunk["metadata"])
            else:
                # Text chunk
                combined_content += str(chunk)
        
        return {
            "content": combined_content,
            "scene_json": scene_json,
            "metadata": metadata
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """
        Get the health status of the AgentCore integration.
        
        Returns:
            Health status information
        """
        return {
            "status": "configured" if self.agent_arn else "not_configured",
            "agent_arn": self.agent_arn,
            "client_region": self.client.meta.region_name,
            "timestamp": datetime.now().isoformat()
        }


# Global integrator instance
_integrator = None


def get_agentcore_integrator() -> BedrockAgentCoreIntegrator:
    """Get or create the global AgentCore integrator instance."""
    global _integrator
    if _integrator is None:
        _integrator = BedrockAgentCoreIntegrator()
    return _integrator


def process_message_with_agentcore(
    user_message: str,
    conversation_history: List[Dict[str, Any]],
    is_first_message: bool = False,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to process a message with AgentCore.
    
    Args:
        user_message: The user's input message
        conversation_history: Previous conversation messages
        is_first_message: Whether this is the first message
        session_id: Optional session ID
        
    Returns:
        Agent response data
    """
    integrator = get_agentcore_integrator()
    return integrator.process_message(
        user_message=user_message,
        conversation_history=conversation_history,
        is_first_message=is_first_message,
        session_id=session_id
    )