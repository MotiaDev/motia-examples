from typing import Dict, Any

# Configuration for the step (would be used by Motia framework)
config = {
    'type': 'event',
    'name': 'EnqueueSideEffects',
    'description': 'Orchestrates side effects for like actions including real-time integrations',
    'subscribes': ['like:post'],
    'emits': [
        'like:notify-owner',
        'like:update-feed', 
        'like:firebase-notification',
        'like:database-sync'
    ],
    'flows': ['micro-actions-like-feed']
}

async def handler(event: Dict[str, Any], context: Any) -> None:
    """
    Handles like:post events and emits side effect events for notifications and feed updates.
    """
    try:
        # Debug: Log the complete event structure
        context.logger.info(
            'Complete event structure received',
            {
                'event': event,
                'eventKeys': list(event.keys()) if event else 'None',
                'eventType': type(event).__name__
            }
        )
        
        # Extract event data - data is directly in the event object, not nested under 'data'
        event_data = event  # The event object itself contains the data
        post_id = event_data.get('postId')
        user_id = event_data.get('userId')
        timestamp = event_data.get('timestamp')
        trace_id = event_data.get('traceId')
        
        # Debug: Log the actual event data structure
        context.logger.info(
            'Received like:post event data',
            {
                'eventData': event_data,
                'postId': post_id,
                'userId': user_id,
                'timestamp': timestamp,
                'traceId': trace_id
            }
        )
        
        # Validate required fields
        if not post_id or not user_id or not timestamp or not trace_id:
            context.logger.error(
                'Invalid like:post event data - missing required fields',
                {
                    'eventData': event_data,
                    'traceId': trace_id,
                    'missingFields': {
                        'postId': not post_id,
                        'userId': not user_id,
                        'timestamp': not timestamp,
                        'traceId': not trace_id
                    }
                }
            )
            return
        
        context.logger.info(
            'Processing like:post event for side effects orchestration',
            {
                'postId': post_id,
                'userId': user_id,
                'traceId': trace_id
            }
        )
        
        # Emit all side effect events in parallel for real-time processing
        events_to_emit = [
            ('like:notify-owner', 'Owner notification'),
            ('like:update-feed', 'Feed update'),
            ('like:firebase-notification', 'Firebase push notification'),
            ('like:database-sync', 'Local database sync (fallback)')
        ]
        
        # Prepare event data for emission
        emission_data = {
            'postId': post_id,
            'userId': user_id,
            'timestamp': timestamp,
            'traceId': trace_id
        }
        
        # Emit all events concurrently for maximum performance
        for topic, description in events_to_emit:
            try:
                await context.emit({
                    'topic': topic,
                    'data': emission_data
                })
                
                context.logger.info(
                    f'{topic} event emitted',
                    {
                        'postId': post_id,
                        'userId': user_id,
                        'traceId': trace_id,
                        'description': description
                    }
                )
            except Exception as e:
                context.logger.error(
                    f'Failed to emit {topic} event',
                    {
                        'error': str(e),
                        'postId': post_id,
                        'userId': user_id,
                        'traceId': trace_id,
                        'topic': topic
                    }
                )
                # Continue with other events even if one fails
        
        context.logger.info(
            'Side effects orchestration completed successfully',
            {
                'postId': post_id,
                'userId': user_id,
                'traceId': trace_id
            }
        )
        
    except Exception as e:
        context.logger.error(
            'Error in side effects orchestration',
            {
                'error': str(e),
                'eventData': event,
                'traceId': trace_id
            }
        )