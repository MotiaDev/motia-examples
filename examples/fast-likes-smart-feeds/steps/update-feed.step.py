from typing import Dict, Any

# Configuration for the step (would be used by Motia framework)
config = {
    'type': 'event',
    'name': 'UpdateFeed',
    'description': 'Updates recommendation feed when posts receive likes',
    'subscribes': ['like:update-feed'],
    'emits': [],  # Terminal step - doesn't emit any events
    'flows': ['micro-actions-like-feed']
}

async def handler(event: Dict[str, Any], context: Any) -> None:
    """
    Handles like:update-feed events and simulates updating the recommendation feed.
    """
    try:
        # Extract event data - data is directly in the event object, not nested under 'data'
        event_data = event  # The event object itself contains the data
        post_id = event_data.get('postId')
        user_id = event_data.get('userId')
        timestamp = event_data.get('timestamp')
        trace_id = event_data.get('traceId')
        
        # Validate required fields
        if not post_id or not user_id or not timestamp or not trace_id:
            context.logger.error(
                'Invalid like:update-feed event data',
                {
                    'error': 'Missing required fields',
                    'eventData': event_data,
                    'traceId': trace_id
                }
            )
            return
        
        # Log feed update action using context.logger.info() with postId included
        context.logger.info(
            f'Feed update: Post {post_id} liked by user {user_id} - updating recommendation algorithms',
            {
                'postId': post_id,
                'userId': user_id,
                'timestamp': timestamp,
                'traceId': trace_id,
                'action': 'feed-update'
            }
        )
        
        # Simulate recommendation feed update without database connections
        context.logger.info(
            'Simulating recommendation feed update - boosting post visibility',
            {
                'postId': post_id,
                'userId': user_id,
                'traceId': trace_id,
                'simulation': 'recommendation-boost'
            }
        )
        
        context.logger.info(
            'Feed update processing completed successfully',
            {
                'postId': post_id,
                'userId': user_id,
                'traceId': trace_id
            }
        )
        
    except Exception as e:
        context.logger.error(
            'Error processing feed update',
            {
                'error': str(e),
                'eventData': event.get('data', {}),
                'traceId': event.get('data', {}).get('traceId')
            }
        )