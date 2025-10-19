import boto3
import json

def test_agentcore():
    try:
        client = boto3.client('bedrock-agentcore', region_name='us-east-1')
        
        # Try to list agent runtimes
        print("Attempting to list agent runtimes...")
        try:
            response = client.list_agent_runtimes()
            print("Agent runtimes:", json.dumps(response, indent=2, default=str))
        except Exception as e:
            print(f"Error listing runtimes: {e}")
        
        # Check available methods
        methods = [m for m in dir(client) if not m.startswith('_') and callable(getattr(client, m))]
        print(f"\nAvailable methods: {methods[:10]}...")
        
        # Try to get runtime info for your specific ARN
        runtime_arn = 'arn:aws:bedrock-agentcore:us-east-1:975050380826:runtime/locusgen_agents-4lE85MFtDI'
        print(f"\nTrying to get info for runtime: {runtime_arn}")
        
        # Let's see what happens when we try to invoke with minimal payload
        try:
            response = client.invoke_agent_runtime(
                agentRuntimeArn=runtime_arn,
                runtimeSessionId='test-session-id-12345678901234567890123',
                payload=json.dumps({"input": {"prompt": "hello"}})
            )
            print("Success!")
        except Exception as e:
            print(f"Invoke error: {e}")
            print(f"Error type: {type(e)}")
            
    except Exception as e:
        print(f"Client creation error: {e}")

if __name__ == "__main__":
    test_agentcore()