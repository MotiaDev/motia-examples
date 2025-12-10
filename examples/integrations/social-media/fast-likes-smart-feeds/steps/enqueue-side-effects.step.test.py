import pytest
from unittest.mock import Mock, MagicMock
import importlib.util
import sys
import os

# Import the handler from the step file
spec = importlib.util.spec_from_file_location("enqueue_side_effects_step", 
                                              os.path.join(os.path.dirname(__file__), "enqueue-side-effects.step.py"))
enqueue_side_effects_step = importlib.util.module_from_spec(spec)
spec.loader.exec_module(enqueue_side_effects_step)
handler = enqueue_side_effects_step.handler

class TestEnqueueSideEffectsStep:
    
    def setup_method(self):
        """Setup method called before each test"""
        self.mock_logger = Mock()
        self.mock_emit = Mock()
        self.mock_context = Mock()
        self.mock_context.logger = self.mock_logger
        self.mock_context.emit = self.mock_emit
    
    def test_valid_event_processing(self):
        """Test successful processing of valid like:post event"""
        valid_event_data = {
            'postId': 'post-123',
            'userId': 'user-456',
            'timestamp': '2023-12-08T10:00:00.000Z',
            'traceId': 'trace-789'
        }
        
        event = {'data': valid_event_data}
        
        handler(event, self.mock_context)
        
        # Verify initial processing log
        self.mock_logger.info.assert_any_call(
            'Processing like:post event for side effects orchestration',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
        
        # Verify like:notify-owner event emission
        self.mock_emit.assert_any_call({
            'topic': 'like:notify-owner',
            'data': {
                'postId': 'post-123',
                'userId': 'user-456',
                'timestamp': '2023-12-08T10:00:00.000Z',
                'traceId': 'trace-789'
            }
        })
        
        # Verify like:update-feed event emission
        self.mock_emit.assert_any_call({
            'topic': 'like:update-feed',
            'data': {
                'postId': 'post-123',
                'userId': 'user-456',
                'timestamp': '2023-12-08T10:00:00.000Z',
                'traceId': 'trace-789'
            }
        })
        
        # Verify success logs for both emissions
        self.mock_logger.info.assert_any_call(
            'like:notify-owner event emitted',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
        
        self.mock_logger.info.assert_any_call(
            'like:update-feed event emitted',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
        
        # Verify completion log
        self.mock_logger.info.assert_any_call(
            'Side effects orchestration completed successfully',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
        
        # Verify both emit calls were made
        assert self.mock_emit.call_count == 2
    
    def test_invalid_event_data_missing_fields(self):
        """Test handling of invalid event data with missing fields"""
        invalid_event_data = {
            'postId': '',  # Invalid: empty postId
            'userId': 'user-456',
            'timestamp': 'invalid-timestamp',
            'traceId': 'trace-789'
        }
        
        event = {'data': invalid_event_data}
        
        handler(event, self.mock_context)
        
        # Verify error was logged
        self.mock_logger.error.assert_called_with(
            'Invalid like:post event data - missing required fields',
            {
                'eventData': invalid_event_data,
                'traceId': 'trace-789'
            }
        )
        
        # Verify no events were emitted
        self.mock_emit.assert_not_called()
        
        # Verify no success logs
        assert not any(
            call for call in self.mock_logger.info.call_args_list
            if 'Processing like:post event' in str(call)
        )
    
    def test_notify_owner_emission_failure(self):
        """Test handling when notify-owner event emission fails"""
        valid_event_data = {
            'postId': 'post-123',
            'userId': 'user-456',
            'timestamp': '2023-12-08T10:00:00.000Z',
            'traceId': 'trace-789'
        }
        
        event = {'data': valid_event_data}
        
        # Mock first emit (notify-owner) to fail, second (update-feed) to succeed
        def emit_side_effect(data):
            if data['topic'] == 'like:notify-owner':
                raise Exception('Notify owner emission failed')
            return None
        
        self.mock_emit.side_effect = emit_side_effect
        
        handler(event, self.mock_context)
        
        # Verify error was logged for the failed emission
        self.mock_logger.error.assert_any_call(
            'Failed to emit like:notify-owner event',
            {
                'error': 'Notify owner emission failed',
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
        
        # Verify second emission still happened
        assert self.mock_emit.call_count == 2
        
        # Verify completion log still happened
        self.mock_logger.info.assert_any_call(
            'Side effects orchestration completed successfully',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
    
    def test_update_feed_emission_failure(self):
        """Test handling when update-feed event emission fails"""
        valid_event_data = {
            'postId': 'post-123',
            'userId': 'user-456',
            'timestamp': '2023-12-08T10:00:00.000Z',
            'traceId': 'trace-789'
        }
        
        event = {'data': valid_event_data}
        
        # Mock first emit (notify-owner) to succeed, second (update-feed) to fail
        def emit_side_effect(data):
            if data['topic'] == 'like:update-feed':
                raise Exception('Update feed emission failed')
            return None
        
        self.mock_emit.side_effect = emit_side_effect
        
        handler(event, self.mock_context)
        
        # Verify first emission succeeded
        self.mock_logger.info.assert_any_call(
            'like:notify-owner event emitted',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
        
        # Verify error was logged for the failed emission
        self.mock_logger.error.assert_any_call(
            'Failed to emit like:update-feed event',
            {
                'error': 'Update feed emission failed',
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
        
        # Verify completion log still happened
        self.mock_logger.info.assert_any_call(
            'Side effects orchestration completed successfully',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
    
    def test_unexpected_error_handling(self):
        """Test handling of unexpected errors during processing"""
        valid_event_data = {
            'postId': 'post-123',
            'userId': 'user-456',
            'timestamp': '2023-12-08T10:00:00.000Z',
            'traceId': 'trace-789'
        }
        
        event = {'data': valid_event_data}
        
        # Mock emit to throw an unexpected error
        self.mock_emit.side_effect = Exception('Unexpected error')
        
        handler(event, self.mock_context)
        
        # Verify error was logged
        self.mock_logger.error.assert_any_call(
            'Error in side effects orchestration',
            {
                'error': 'Unexpected error',
                'eventData': valid_event_data,
                'traceId': 'trace-789'
            }
        )
    
    def test_different_postid_formats(self):
        """Test handling of different postId formats"""
        test_cases = [
            'post-123',
            'post_456',
            '789',
            'very-long-post-id-with-many-hyphens'
        ]
        
        for post_id in test_cases:
            # Reset mocks for each test case
            self.mock_emit.reset_mock()
            self.mock_logger.reset_mock()
            
            event_data = {
                'postId': post_id,
                'userId': 'user-test',
                'timestamp': '2023-12-08T10:00:00.000Z',
                'traceId': 'trace-test'
            }
            
            event = {'data': event_data}
            
            handler(event, self.mock_context)
            
            # Verify the postId was passed correctly to both events
            notify_call = None
            feed_call = None
            
            for call in self.mock_emit.call_args_list:
                if call[0][0]['topic'] == 'like:notify-owner':
                    notify_call = call[0][0]
                elif call[0][0]['topic'] == 'like:update-feed':
                    feed_call = call[0][0]
            
            assert notify_call is not None
            assert feed_call is not None
            assert notify_call['data']['postId'] == post_id
            assert feed_call['data']['postId'] == post_id