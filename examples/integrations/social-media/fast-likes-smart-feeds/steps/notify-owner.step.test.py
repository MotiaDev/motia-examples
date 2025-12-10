import pytest
from unittest.mock import Mock
import importlib.util
import sys
import os

# Import the handler from the step file
spec = importlib.util.spec_from_file_location("notify_owner_step", 
                                              os.path.join(os.path.dirname(__file__), "notify-owner.step.py"))
notify_owner_step = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notify_owner_step)
handler = notify_owner_step.handler

class TestNotifyOwnerStep:
    
    def setup_method(self):
        """Setup method called before each test"""
        self.mock_logger = Mock()
        self.mock_context = Mock()
        self.mock_context.logger = self.mock_logger
    
    def test_valid_event_processing(self):
        """Test successful processing of valid like:notify-owner event"""
        valid_event_data = {
            'postId': 'post-123',
            'userId': 'user-456',
            'timestamp': '2023-12-08T10:00:00.000Z',
            'traceId': 'trace-789'
        }
        
        event = {'data': valid_event_data}
        
        handler(event, self.mock_context)
        
        # Verify notification message was logged
        self.mock_logger.info.assert_any_call(
            'Post owner notification: Post post-123 was liked by user user-456',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'timestamp': '2023-12-08T10:00:00.000Z',
                'traceId': 'trace-789',
                'action': 'owner-notification'
            }
        )
        
        # Verify completion log
        self.mock_logger.info.assert_any_call(
            'Owner notification processing completed successfully',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
        
        # Verify exactly 2 info logs were made
        assert self.mock_logger.info.call_count == 2
    
    def test_different_postid_formats(self):
        """Test handling of various event payloads with different postId formats"""
        test_cases = [
            {
                'postId': 'post-123',
                'userId': 'user-abc',
                'timestamp': '2023-12-08T10:00:00.000Z',
                'traceId': 'trace-001'
            },
            {
                'postId': 'post_456_test',
                'userId': 'user-def',
                'timestamp': '2023-12-08T11:00:00.000Z',
                'traceId': 'trace-002'
            },
            {
                'postId': '789',
                'userId': 'user-ghi',
                'timestamp': '2023-12-08T12:00:00.000Z',
                'traceId': 'trace-003'
            },
            {
                'postId': 'very-long-post-id-with-many-hyphens-and-numbers-123',
                'userId': 'user-jkl',
                'timestamp': '2023-12-08T13:00:00.000Z',
                'traceId': 'trace-004'
            }
        ]
        
        for event_data in test_cases:
            # Reset mocks for each test case
            self.mock_logger.reset_mock()
            
            event = {'data': event_data}
            
            handler(event, self.mock_context)
            
            # Verify notification message includes the correct postId and userId
            expected_message = f"Post owner notification: Post {event_data['postId']} was liked by user {event_data['userId']}"
            self.mock_logger.info.assert_any_call(
                expected_message,
                {
                    'postId': event_data['postId'],
                    'userId': event_data['userId'],
                    'timestamp': event_data['timestamp'],
                    'traceId': event_data['traceId'],
                    'action': 'owner-notification'
                }
            )
            
            # Verify completion log
            self.mock_logger.info.assert_any_call(
                'Owner notification processing completed successfully',
                {
                    'postId': event_data['postId'],
                    'userId': event_data['userId'],
                    'traceId': event_data['traceId']
                }
            )
    
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
        
        # Verify error was logged with traceId from invalid data
        self.mock_logger.error.assert_called_with(
            'Invalid like:notify-owner event data',
            {
                'error': 'Missing required fields',
                'eventData': invalid_event_data,
                'traceId': 'trace-789'
            }
        )
        
        # Verify no success logs were made
        assert self.mock_logger.info.call_count == 0
    
    def test_missing_traceid_in_invalid_data(self):
        """Test handling of missing traceId in invalid data"""
        invalid_event_data = {
            'postId': 'post-123',
            'userId': 'user-456'
            # Missing timestamp and traceId
        }
        
        event = {'data': invalid_event_data}
        
        handler(event, self.mock_context)
        
        self.mock_logger.error.assert_called_with(
            'Invalid like:notify-owner event data',
            {
                'error': 'Missing required fields',
                'eventData': invalid_event_data,
                'traceId': None
            }
        )
    
    def test_completely_malformed_event_data(self):
        """Test handling of completely malformed event data"""
        event = {'data': None}
        
        handler(event, self.mock_context)
        
        self.mock_logger.error.assert_called_with(
            'Invalid like:notify-owner event data',
            {
                'error': 'Missing required fields',
                'eventData': None,
                'traceId': None
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
        
        # Mock logger.info to throw an error on first call
        self.mock_logger.info.side_effect = [Exception('Logger error'), None]
        
        handler(event, self.mock_context)
        
        # Verify the error was caught and logged
        self.mock_logger.error.assert_called_with(
            'Error processing owner notification',
            {
                'error': 'Logger error',
                'eventData': valid_event_data,
                'traceId': 'trace-789'
            }
        )
    
    def test_special_characters_in_postid(self):
        """Test handling of special characters in postId"""
        valid_event_data = {
            'postId': 'post-123_test-456',
            'userId': 'user-special',
            'timestamp': '2023-12-08T10:00:00.000Z',
            'traceId': 'trace-special'
        }
        
        event = {'data': valid_event_data}
        
        handler(event, self.mock_context)
        
        expected_message = 'Post owner notification: Post post-123_test-456 was liked by user user-special'
        self.mock_logger.info.assert_any_call(
            expected_message,
            {
                'postId': 'post-123_test-456',
                'userId': 'user-special',
                'timestamp': '2023-12-08T10:00:00.000Z',
                'traceId': 'trace-special',
                'action': 'owner-notification'
            }
        )
    
    def test_logging_format_validation(self):
        """Test that logging uses context.logger.info() and includes required context"""
        valid_event_data = {
            'postId': 'context-test',
            'userId': 'user-context',
            'timestamp': '2023-12-08T14:00:00.000Z',
            'traceId': 'trace-context'
        }
        
        event = {'data': valid_event_data}
        
        handler(event, self.mock_context)
        
        # Verify that logger.info was called (not print or other methods)
        assert self.mock_logger.info.call_count == 2
        assert self.mock_logger.error.call_count == 0
        
        # Verify notification log includes all required context
        notification_call = self.mock_logger.info.call_args_list[0]
        assert 'context-test' in notification_call[0][0]
        assert 'user-context' in notification_call[0][0]
        
        context_data = notification_call[0][1]
        assert context_data['postId'] == 'context-test'
        assert context_data['userId'] == 'user-context'
        assert context_data['timestamp'] == '2023-12-08T14:00:00.000Z'
        assert context_data['traceId'] == 'trace-context'
        assert context_data['action'] == 'owner-notification'
        
        # Verify completion log includes required context
        completion_call = self.mock_logger.info.call_args_list[1]
        completion_context = completion_call[0][1]
        assert completion_context['postId'] == 'context-test'
        assert completion_context['userId'] == 'user-context'
        assert completion_context['traceId'] == 'trace-context'