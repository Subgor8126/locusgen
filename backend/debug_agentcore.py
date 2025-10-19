import boto3
import json

def debug_agentcore():
    try:
        # Try bedrock-agentcore-control for management operations
        control_client = boto3.client('bedrock-agentcore-control', region_name='us-east-1')
        print("Control client methods:")
        control_methods = [m for m in dir(control_client) if not m.startswith('_') and callable(getattr(control_client, m))]
        print(control_methods)
        
        # Try to list runtimes with control client
        try:
            response = control_client.list_agent_runtimes()
            print("Agent runtimes:", json.dumps(response, indent=2, default=str))
        except Exception as e:
            print(f"Control client error: {e}")
        
    except Exception as e:
        print(f"Control client creation error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Also try bedrock-agent for comparison
    try:
        agent_client = boto3.client('bedrock-agent', region_name='us-east-1')
        print("Bedrock agent methods:")
        agent_methods = [m for m in dir(agent_client) if 'agent' in m.lower() and not m.startswith('_')]
        print(agent_methods)
        
        # Try to list agents
        try:
            response = agent_client.list_agents()
            print("Agents:", json.dumps(response, indent=2, default=str))
        except Exception as e:
            print(f"Agent client error: {e}")
            
    except Exception as e:
        print(f"Agent client creation error: {e}")

if __name__ == "__main__":
    debug_agentcore()