#!/usr/bin/env python
"""
Simple test script to verify authentication works
"""

import os
import django
import requests
import json

# Test the authentication endpoint
def test_login():
    url = "http://localhost:8000/api/auth/login/"
    data = {
        "email": "demouser@gmail.com",
        "password": "demouser"
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Text: {response.text[:500]}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
            return response.json()
        else:
            print("❌ Login failed")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    print("Testing authentication...")
    result = test_login()
    if result:
        print(f"User data: {result}")
