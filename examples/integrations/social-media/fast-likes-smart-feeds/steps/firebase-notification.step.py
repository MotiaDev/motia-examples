from typing import Dict, Any
import os
import json
import sys

# Add python_modules to path for dependencies
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python_modules'))

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional

# Optional import - will be handled gracefully if not available
try:
    from firebase_admin import credentials, messaging, initialize_app
    FIREBASE_AVAILABLE = True
except ImportError as e:
    FIREBASE_AVAILABLE = False
    credentials = None
    messaging = None
    initialize_app = None
    print(f"Firebase Admin SDK not available: {e}")

# Configuration for the step
config = {
    'type': 'event',
    'name': 'FirebaseNotification',
    'description': 'Sends real-time push notifications via Firebase',
    'subscribes': ['like:firebase-notification'],
    'emits': [],  # Terminal step
    'flows': ['micro-actions-like-feed']
}

# Initialize Firebase Admin SDK
_firebase_app = None

def get_firebase_app():
    global _firebase_app
    if not FIREBASE_AVAILABLE:
        print("❌ Firebase Admin SDK not available")
        return None
        
    if _firebase_app is None:
        # Initialize Firebase Admin SDK
        service_account_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_PATH')
        service_account_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
        
        print(f"🔍 Firebase service account path: {service_account_path}")
        
        try:
            if service_account_path and os.path.exists(service_account_path):
                print(f"✅ Using service account file: {service_account_path}")
                cred = credentials.Certificate(service_account_path)
            elif service_account_json:
                print("✅ Using service account JSON from environment")
                service_account_info = json.loads(service_account_json)
                cred = credentials.Certificate(service_account_info)
            else:
                print("❌ No Firebase service account configuration found")
                return None
            
            _firebase_app = initialize_app(cred)
            print(f"✅ Firebase initialized successfully for project: {_firebase_app.project_id}")
        except Exception as e:
            print(f"❌ Failed to initialize Firebase: {e}")
            return None
    
    return _firebase_app

async def handler(event: Dict[str, Any], context: Any) -> None:
    """
    Handles like:firebase-notification events and sends push notifications.
    """
    try:
        # Extract event data
        event_data = event
        post_id = event_data.get('postId')
        user_id = event_data.get('userId')
        timestamp = event_data.get('timestamp')
        trace_id = event_data.get('traceId')
        post_owner_id = event_data.get('postOwnerId')  # Would come from database lookup
        
        # Validate required fields
        if not post_id or not user_id or not timestamp or not trace_id:
            context.logger.error(
                'Invalid like:firebase-notification event data',
                {
                    'error': 'Missing required fields',
                    'eventData': event_data,
                    'traceId': trace_id
                }
            )
            return
        
        context.logger.info(
            f'🔔 Sending Firebase notification: Post {post_id} liked by {user_id}',
            {
                'postId': post_id,
                'userId': user_id,
                'timestamp': timestamp,
                'traceId': trace_id,
                'action': 'firebase-notification'
            }
        )
        
        try:
            # Initialize Firebase
            firebase_app = get_firebase_app()
            
            if not firebase_app:
                context.logger.info(
                    '⚠️ Firebase not available - skipping push notification',
                    {
                        'postId': post_id,
                        'userId': user_id,
                        'traceId': trace_id,
                        'reason': 'firebase_not_configured'
                    }
                )
                return
            
            # For demo purposes, we'll use a topic-based notification
            # In production, you'd look up the post owner's FCM token
            topic = f"post_{post_id}_likes"
            
            # Create notification message
            message = messaging.Message(
                notification=messaging.Notification(
                    title="New Like! 👍",
                    body=f"Your post received a new like from {user_id}",
                ),
                data={
                    'postId': post_id,
                    'userId': user_id,
                    'timestamp': timestamp,
                    'traceId': trace_id,
                    'action': 'like_notification'
                },
                topic=topic
            )
            
            # Send the notification
            response = messaging.send(message)
            
            context.logger.info(
                '✅ Firebase notification sent successfully',
                {
                    'postId': post_id,
                    'userId': user_id,
                    'messageId': response,
                    'topic': topic,
                    'traceId': trace_id,
                    'action': 'firebase-notification-success'
                }
            )
            
            # Optional: Send personalized notification to post owner
            if post_owner_id:
                try:
                    # In production, look up user's FCM token from database
                    owner_token = await get_user_fcm_token(post_owner_id, context)
                    
                    if owner_token:
                        owner_message = messaging.Message(
                            notification=messaging.Notification(
                                title="Your post got a like! 🎉",
                                body=f"{user_id} liked your post",
                            ),
                            data={
                                'postId': post_id,
                                'userId': user_id,
                                'timestamp': timestamp,
                                'traceId': trace_id,
                                'action': 'owner_like_notification'
                            },
                            token=owner_token
                        )
                        
                        owner_response = messaging.send(owner_message)
                        
                        context.logger.info(
                            '🎯 Personalized notification sent to post owner',
                            {
                                'postId': post_id,
                                'postOwnerId': post_owner_id,
                                'messageId': owner_response,
                                'traceId': trace_id
                            }
                        )
                
                except Exception as owner_error:
                    context.logger.error(
                        'Failed to send personalized notification to post owner',
                        {
                            'error': str(owner_error),
                            'postId': post_id,
                            'postOwnerId': post_owner_id,
                            'traceId': trace_id
                        }
                    )
                    # Don't fail the whole operation
            
        except Exception as firebase_error:
            context.logger.error(
                'Failed to send Firebase notification',
                {
                    'error': str(firebase_error),
                    'postId': post_id,
                    'userId': user_id,
                    'traceId': trace_id
                }
            )
            # Could implement retry logic here
            raise  # Re-raise to trigger retry mechanisms if configured
        
        context.logger.info(
            'Firebase notification processing completed successfully',
            {
                'postId': post_id,
                'userId': user_id,
                'traceId': trace_id
            }
        )
        
    except Exception as e:
        context.logger.error(
            'Error processing Firebase notification',
            {
                'error': str(e),
                'eventData': event,
                'traceId': event.get('traceId')
            }
        )

async def get_user_fcm_token(user_id: str, context: Any) -> str:
    """
    Mock function to get user's FCM token from database.
    In production, this would query your user database.
    """
    # Mock implementation - replace with actual database lookup
    context.logger.info(f'Looking up FCM token for user {user_id}')
    
    # Return mock token for demo
    return f"mock_fcm_token_for_{user_id}"