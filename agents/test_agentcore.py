#!/usr/bin/env python3
"""
Test script for LocusGen AgentCore endpoints
"""

import requests
import json

def test_ping():
    """Test the /ping endpoint"""
    try:
        response = requests.get("http://localhost:8080/ping")
        print(f"Ping Status: {response.status_code}")
        print(f"Ping Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Ping test failed: {e}")
        return False

def test_invocations():
    """Test the /invocations endpoint"""
    try:
        payload = {
            "prompt": "Create a cozy living room with a fireplace",
            "conversation_history": []
        }
        
        response = requests.post(
            "http://localhost:8080/invocations",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Invocations Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Message: {result.get('message', 'No message')[:100]}...")
            print(f"Scene JSON: {bool(result.get('scene_json', {}))}")
            print(f"Processing Time: {result.get('processing_time', 0):.2f}s")
        else:
            print(f"Error Response: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"Invocations test failed: {e}")
        return False

def test_root():
    """Test the root endpoint"""
    try:
        response = requests.get("http://localhost:8080/")
        print(f"Root Status: {response.status_code}")
        print(f"Root Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Root test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing LocusGen AgentCore endpoints...")
    print("=" * 50)
    
    print("\n1. Testing root endpoint...")
    test_root()
    
    print("\n2. Testing ping endpoint...")
    test_ping()
    
    print("\n3. Testing invocations endpoint...")
    test_invocations()
    
    print("\n" + "=" * 50)
    print("Tests completed!")