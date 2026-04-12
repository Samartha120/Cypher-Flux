#!/usr/bin/env python3
"""
Test the signup endpoint with actual Flask app
"""
import os
import sys
from dotenv import load_dotenv

# Add the backend directory to the path
sys.path.insert(0, 'f:\\Cypher-Flux\\cypherflux-backend')

load_dotenv()

def test_signup_endpoint():
    print("Starting Flask test...")
    
    # Import after path is set
    from app import create_app
    from app.models.db import db
    
    # Create app
    app = create_app()
    
    print("✅ Flask app created successfully")
    
    # Create test client
    client = app.test_client()
    
    # Test signup
    print("\nTesting signup endpoint...")
    test_data = {
        "username": "TestUser123",
        "email": "test@example.com",
        "password": "TestPassword123!",
        "confirm_password": "TestPassword123!"
    }
    
    print(f"Sending request with: {test_data}")
    
    try:
        response = client.post('/signup', json=test_data)
        print(f"\n✅ Response Status: {response.status_code}")
        print(f"Response Body: {response.json}")
        
        if response.status_code == 500:
            print("\n❌ 500 Error detected!")
        elif response.status_code == 201:
            print(f"\n✅ Signup successful!")
        else:
            print(f"\nResponse Status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_signup_endpoint()
