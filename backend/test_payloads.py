import boto3
import json
import time

def test_different_payloads():
    client = boto3.client('bedrock-agentcore', region_name='us-east-1')
    runtime_arn = 'arn:aws:bedrock-agentcore:us-east-1:975050380826:runtime/locusgen_agents-4lE85MFtDI'
    
    # Test different payload formats
    payloads = [
        # Format 1: Simple string
        "hello",
        
        # Format 2: Direct prompt
        json.dumps({"prompt": "hello"}),
        
        # Format 3: Input wrapper (current format)
        json.dumps({"input": {"prompt": "hello"}}),
        
        # Format 4: Minimal test
        json.dumps({}),
        
        # Format 5: Just input
        json.dumps({"input": "hello"})
    ]
    
    for i, payload in enumerate(payloads, 1):
        print(f"\n--- Test {i}: {payload[:50]}... ---")
        try:
            session_id = f'test-session-{int(time.time())}-{i:02d}-extra-padding-to-meet-33-chars'
            response = client.invoke_agent_runtime(
                agentRuntimeArn=runtime_arn,
                runtimeSessionId=session_id,
                payload=payload
            )
            print(f"SUCCESS: {response}")
            break  # If one works, we found the issue
        except Exception as e:
            print(f"ERROR: {e}")
            if "ValidationException" in str(e):
                print("  -> This is a validation error, payload format issue")
            elif "RuntimeClientError" in str(e) and "500" in str(e):
                print("  -> This is the same 500 error, not payload format")
            else:
                print(f"  -> Different error type: {type(e)}")

if __name__ == "__main__":
    test_different_payloads()