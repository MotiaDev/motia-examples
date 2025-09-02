from typing import Dict, Any

# Configuration for the step (would be used by Motia framework)
config = {
    'type': 'event',
    'name': 'NotifyOwner',
    'description': 'Handles post owner notifications when posts receive likes',
    'subscribes': ['like:notify-owner'],
    'emits': [],  # Terminal step - doesn't emit any events
    'flows': ['micro-actions-like-feed']
}

async def handler(event: Dict[str, Any], context: Any) -> None:
    """
    Handles like:notify-owner events and logs notification messages for post owners.
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
                'Invalid like:notify-owner event data',
                {
                    'error': 'Missing required fields',
                    'eventData': event_data,
                    'traceId': trace_id
                }
            )
            return
        
        # Log notification message for the post owner using context.logger.info()
        context.logger.info(
            f'Post owner notification: Post {post_id} was liked by user {user_id}',
            {
                'postId': post_id,
                'userId': user_id,
                'timestamp': timestamp,
                'traceId': trace_id,
                'action': 'owner-notification'
            }
        )
        
        context.logger.info(
            'Owner notification processing completed successfully',
            {
                'postId': post_id,
                'userId': user_id,
                'traceId': trace_id
            }
        )
        
    except Exception as e:
        context.logger.error(
            'Error processing owner notification',
            {
                'error': str(e),
                'eventData': event.get('data', {}),
                'traceId': event.get('data', {}).get('traceId')
            }
        )