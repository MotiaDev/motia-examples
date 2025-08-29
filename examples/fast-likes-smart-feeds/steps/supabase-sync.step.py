from typing import Dict, Any
import os
from supabase import create_client, Client

# Configuration for the step
config = {
    'type': 'event',
    'name': 'SupabaseSync',
    'description': 'Syncs like data to Supabase database in real-time',
    'subscribes': ['like:supabase-sync'],
    'emits': [],  # Terminal step
    'flows': ['micro-actions-like-feed']
}

# Initialize Supabase client
def get_supabase_client():
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_ANON_KEY')
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
    
    return create_client(url, key)

async def handler(event: Dict[str, Any], context: Any) -> None:
    """
    Handles like:supabase-sync events and writes like data to Supabase database.
    """
    try:
        # Extract event data
        event_data = event
        post_id = event_data.get('postId')
        user_id = event_data.get('userId')
        timestamp = event_data.get('timestamp')
        trace_id = event_data.get('traceId')
        
        # Validate required fields
        if not post_id or not user_id or not timestamp or not trace_id:
            context.logger.error(
                'Invalid like:supabase-sync event data',
                {
                    'error': 'Missing required fields',
                    'eventData': event_data,
                    'traceId': trace_id
                }
            )
            return
        
        context.logger.info(
            f'💾 Syncing like data to Supabase: Post {post_id} liked by {user_id}',
            {
                'postId': post_id,
                'userId': user_id,
                'timestamp': timestamp,
                'traceId': trace_id,
                'action': 'supabase-sync'
            }
        )
        
        try:
            # Initialize Supabase client
            supabase = get_supabase_client()
            
            # Prepare like data for database
            like_data = {
                'post_id': post_id,
                'user_id': user_id,
                'liked_at': timestamp,
                'trace_id': trace_id,
                'created_at': timestamp
            }
            
            # Insert like record into Supabase
            result = supabase.table('likes').insert(like_data).execute()
            
            context.logger.info(
                '✅ Like data successfully synced to Supabase',
                {
                    'postId': post_id,
                    'userId': user_id,
                    'supabaseId': result.data[0]['id'] if result.data else None,
                    'traceId': trace_id,
                    'action': 'supabase-sync-success'
                }
            )
            
            # Update post like count
            try:
                # Increment like count in posts table
                supabase.rpc('increment_like_count', {'post_id': post_id}).execute()
                
                context.logger.info(
                    '📊 Post like count updated in Supabase',
                    {
                        'postId': post_id,
                        'traceId': trace_id,
                        'action': 'like-count-updated'
                    }
                )
            except Exception as count_error:
                context.logger.error(
                    'Failed to update like count in Supabase',
                    {
                        'error': str(count_error),
                        'postId': post_id,
                        'traceId': trace_id
                    }
                )
                # Don't fail the whole operation for count update failure
            
        except Exception as supabase_error:
            context.logger.error(
                'Failed to sync like data to Supabase',
                {
                    'error': str(supabase_error),
                    'postId': post_id,
                    'userId': user_id,
                    'traceId': trace_id
                }
            )
            # Could implement retry logic here
            raise  # Re-raise to trigger retry mechanisms if configured
        
        context.logger.info(
            'Supabase sync processing completed successfully',
            {
                'postId': post_id,
                'userId': user_id,
                'traceId': trace_id
            }
        )
        
    except Exception as e:
        context.logger.error(
            'Error processing Supabase sync',
            {
                'error': str(e),
                'eventData': event,
                'traceId': event.get('traceId')
            }
        )
