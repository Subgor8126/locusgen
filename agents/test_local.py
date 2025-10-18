#!/usr/bin/env python3
"""
Quick test script to check if the agent system starts locally
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    print("Testing imports...")
    
    # Test basic imports
    from fastapi import FastAPI
    print("✅ FastAPI imported")
    
    from pydantic import BaseModel
    print("✅ Pydantic imported")
    
    # Test our main module
    print("Testing main module...")
    from main import app
    print("✅ Main app imported successfully")
    
    # Test if we can create the app
    print("Testing app creation...")
    print(f"✅ App created: {app.title} v{app.version}")
    
    print("\n🎉 All imports successful! Container should start.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("This is likely why the container is failing to start.")
    
except Exception as e:
    print(f"❌ Other error: {e}")
    print("This might be causing the container startup failure.")