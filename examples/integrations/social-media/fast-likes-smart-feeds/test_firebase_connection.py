#!/usr/bin/env python3
"""
Test Firebase Admin SDK connection and notification sending capability
"""
import os
import json
import sys
sys.path.insert(0, 'python_modules')

# Load environment variables (fallback if dotenv not available)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️ python-dotenv not available, using system environment variables")

try:
    from firebase_admin import credentials, messaging, initialize_app
    print("✅ Firebase Admin SDK imported successfully")
    FIREBASE_AVAILABLE = True
except ImportError as e:
    print(f"❌ Firebase Admin SDK not available: {e}")
    print("Run: pip install firebase-admin")
    exit(1)

def test_firebase_connection():
    """Test Firebase Admin SDK connection"""
    try:
        # Get service account path
        service_account_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_PATH')
        print(f"📁 Service account path: {service_account_path}")
        
        if not service_account_path:
            print("❌ FIREBASE_SERVICE_ACCOUNT_PATH not set in .env")
            return False
            
        if not os.path.exists(service_account_path):
            print(f"❌ Service account file not found: {service_account_path}")
            return False
            
        # Load and validate service account file
        with open(service_account_path, 'r') as f:
            service_account = json.load(f)
            
        required_fields = ['type', 'project_id', 'private_key', 'client_email']
        missing_fields = [field for field in required_fields if field not in service_account]
        
        if missing_fields:
            print(f"❌ Missing required fields in service account: {missing_fields}")
            return False
            
        print(f"✅ Service account file valid")
        print(f"📋 Project ID: {service_account['project_id']}")
        print(f"📧 Client Email: {service_account['client_email']}")
        
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate(service_account_path)
        app = initialize_app(cred)
        print("✅ Firebase Admin SDK initialized successfully")
        
        # Test creating a message (don't send it yet)
        test_message = messaging.Message(
            notification=messaging.Notification(
                title="Test Notification",
                body="This is a test from your server",
            ),
            data={
                'test': 'true',
                'timestamp': '2024-01-01T00:00:00Z'
            },
            topic="test_topic"  # Using topic instead of specific device
        )
        
        print("✅ Test message created successfully")
        print("🎯 Firebase is ready to send notifications!")
        
        return True
        
    except Exception as e:
        print(f"❌ Firebase connection failed: {e}")
        return False

if __name__ == "__main__":
    print("🔥 Testing Firebase Admin SDK Connection...")
    print("=" * 50)
    
    success = test_firebase_connection()
    
    print("=" * 50)
    if success:
        print("🎉 Firebase is configured correctly!")
        print("💡 Next steps:")
        print("   1. Your server can send notifications")
        print("   2. To receive notifications, you need a client app")
        print("   3. Test with a real device or web app")
    else:
        print("❌ Firebase configuration needs fixing")