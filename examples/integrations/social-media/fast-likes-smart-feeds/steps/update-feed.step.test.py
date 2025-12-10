import pytest
from unittest.mock import Mock
import importlib.util
import sys
import os

# Import the handler from the step file
spec = importlib.util.spec_from_file_location("update_feed_step", 
                                              os.path.join(os.path.dirname(__file__), "update-feed.step.py"))
update_feed_step = importlib.util.module_from_spec(spec)
spec.loader.exec_module(update_feed_step)
handler = update_feed_step.handler

class TestUpdateFeedStep:
    
    def setup_method(self):
        """Setup method called before each test"""
        self.mock_logger = Mock()
        self.mock_context = Mock()
        self.mock_context.logger = self.mock_logger
    
    def test_valid_event_processing(self):
        """Test successful processing of valid like:update-feed event"""
        valid_event_data = {
            'postId': 'post-123',
            'userId': 'user-456',
            'timestamp': '2023-12-08T10:00:00.000Z',
            'traceId': 'trace-789'
        }
        
        event = {'data': valid_event_data}
        
        handler(event, self.mock_context)
        
        # Verify feed update message was logged
        self.mock_logger.info.assert_any_call(
            'Feed update: Post post-123 liked by user user-456 - updating recommendation algorithms',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'timestamp': '2023-12-08T10:00:00.000Z',
                'traceId': 'trace-789',
                'action': 'feed-update'
            }
        )
        
        # Verify simulation log
        self.mock_logger.info.assert_any_call(
            'Simulating recommendation feed update - boosting post visibility',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789',
                'simulation': 'recommendation-boost'
            }
        )
        
        # Verify completion log
        self.mock_logger.info.assert_any_call(
            'Feed update processing completed successfully',
            {
                'postId': 'post-123',
                'userId': 'user-456',
                'traceId': 'trace-789'
            }
        )
        
        # Verify exactly 3 info logs were made
        assert self.mock_logger.info.call_count == 3
    
    def test_different_postid_formats(self):
        """Test handling of different postId formats correctly"""
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
            },
            {
                'postId': 'post-with-special_chars-123',
                'userId': 'user-special',
                'timestamp': '2023-12-08T14:00:00.000Z',
                'traceId': 'trace-005'
            }
        ]
        
        for event_data in test_cases:
            # Reset mocks for each test case
            self.mock_logger.reset_mock()
            
            event = {'data': event_data}
            
            handler(event, self.mock_context)
            
            # Verify feed update message includes the correct postId and userId
            expected_message = f"Feed update: Post {event_data['postId']} liked by user {event_data['userId']} - updating recommendation algorithms"
            self.mock_logger.info.assert_any_call(
                expected_message,
                {
                    'postId': event_data['postId'],
                    'userId': event_data['userId'],
                    'timestamp': event_data['timestamp'],
                    'traceId': event_data['traceId'],
                    'action': 'feed-update'
                }
            )
            
            # Verify simulation log includes postId
            self.mock_logger.info.assert_any_call(
                'Simulating recommendation feed update - boosting post visibility',
                {
                    'postId': event_data['postId'],
                    'userId': event_data['userId'],
                    'traceId': event_data['traceId'],
                    'simulation': 'recommendation-boost'
                }
            )
            
            # Verify completion log
            self.mock_logger.info.assert_any_call(
                'Feed update processing completed successfully',
                {
                    'postId': event_data['postId'],
                    'userId': event_data['userId'],
                    'traceId': event_data['traceId']
                }
            )
    
    def test_numeric_only_postid_formats(self):
        """Test handling of numeric-only postId formats"""
        numeric_test_cases = ['123', '456789', '0', '999999999']
        
        for post_id in numeric_test_cases:
            self.mock_logger.reset_mock()
            
            event_data = {
                'postId': post_id,
                'userId': 'user-numeric',
                'timestamp': '2023-12-08T10:00:00.000Z',
                'traceId': 'trace-numeric'
            }
            
            event = {'data': event_data}
            
            handler(event, self.mock_context)
            
            # Verify the numeric postId is handled correctly in logs
            expected_message = f"Feed update: Post {post_id} liked by user user-numeric - updating recommendation algorithms"
            self.mock_logger.info.assert_any_call(
                expected_message,
                {
                    'postId': post_id,
                    'userId': 'user-numeric',
                    'timestamp': '2023-12-08T10:00:00.000Z',
                    'traceId': 'trace-numeric',
                    'action': 'feed-update'
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
            'Invalid like:update-feed event data',
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
            'Invalid like:update-feed event data',
            {
                'error': 'Missing required fields',
                'eventData': invalid_event_data,
                'traceId': None
            }
        )
    
    def test_completely_malformed_event_data(self):
        """Test handling of completely malformed event data"""
        event = {'data': {'invalid': 'data'}}
        
        handler(event, self.mock_context)
        
        self.mock_logger.error.assert_called_with(
            'Invalid like:update-feed event data',
            {
                'error': 'Missing required fields',
                'eventData': {'invalid': 'data'},
                'traceId': None
            }
        )
    
    def test_null_event_data(self):
        """Test handling of null event data"""
        event = {'data': None}
        
        handler(event, self.mock_context)
        
        self.mock_logger.error.assert_called_with(
            'Invalid like:update-feed event data',
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
        self.mock_logger.info.side_effect = [Exception('Logger error'), None, None]
        
        handler(event, self.mock_context)
        
        # Verify the error was caught and logged
        self.mock_logger.error.assert_called_with(
            'Error processing feed update',
            {
                'error': 'Logger error',
                'eventData': valid_event_data,
                'traceId': 'trace-789'
            }
        )
    
    def test_logger_error_during_simulation_log(self):
        """Test handling of logger throwing an error during simulation log"""
        valid_event_data = {
            'postId': 'post-123',
            'userId': 'user-456',
            'timestamp': '2023-12-08T10:00:00.000Z',
            'traceId': 'trace-789'
        }
        
        event = {'data': valid_event_data}
        
        # Mock logger.info to succeed on first call, fail on second
        self.mock_logger.info.side_effect = [None, Exception('Simulation logger error'), None]
        
        handler(event, self.mock_context)
        
        # Verify the error was caught and logged
        self.mock_logger.error.assert_called_with(
            'Error processing feed update',
            {
                'error': 'Simulation logger error',
                'eventData': valid_event_data,
                'traceId': 'trace-789'
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
        assert self.mock_logger.info.call_count == 3
        assert self.mock_logger.error.call_count == 0
        
        # Verify all log messages include postId
        log_calls = self.mock_logger.info.call_args_list
        for call in log_calls:
            context_data = call[0][1]
            assert context_data['postId'] == 'context-test'
        
        # Verify feed update log includes all required context
        feed_update_call = log_calls[0]
        assert 'context-test' in feed_update_call[0][0]
        context_data = feed_update_call[0][1]
        assert context_data['postId'] == 'context-test'
        assert context_data['userId'] == 'user-context'
        assert context_data['timestamp'] == '2023-12-08T14:00:00.000Z'
        assert context_data['traceId'] == 'trace-context'
        assert context_data['action'] == 'feed-update'
        
        # Verify simulation log includes required context
        simulation_call = log_calls[1]
        simulation_context = simulation_call[0][1]
        assert simulation_context['postId'] == 'context-test'
        assert simulation_context['userId'] == 'user-context'
        assert simulation_context['traceId'] == 'trace-context'
        assert simulation_context['simulation'] == 'recommendation-boost'
        
        # Verify completion log includes required context
        completion_call = log_calls[2]
        completion_context = completion_call[0][1]
        assert completion_context['postId'] == 'context-test'
        assert completion_context['userId'] == 'user-context'
        assert completion_context['traceId'] == 'trace-context'
    
    def test_log_message_format_includes_postid(self):
        """Test that log messages format includes postId in the message text"""
        valid_event_data = {
            'postId': 'message-format-test',
            'userId': 'user-format',
            'timestamp': '2023-12-08T10:00:00.000Z',
            'traceId': 'trace-format'
        }
        
        event = {'data': valid_event_data}
        
        handler(event, self.mock_context)
        
        # Verify the main log message includes postId in the text
        first_call = self.mock_logger.info.call_args_list[0]
        message = first_call[0][0]
        assert 'message-format-test' in message
        assert 'user-format' in message
        assert 'updating recommendation algorithms' in message
    
    def test_feed_simulation_functionality(self):
        """Test that feed simulation is performed without database connections"""
        valid_event_data = {
            'postId': 'simulation-test',
            'userId': 'user-sim',
            'timestamp': '2023-12-08T10:00:00.000Z',
            'traceId': 'trace-sim'
        }
        
        event = {'data': valid_event_data}
        
        handler(event, self.mock_context)
        
        # Verify simulation log was created
        simulation_call = None
        for call in self.mock_logger.info.call_args_list:
            if 'simulation' in call[0][1]:
                simulation_call = call
                break
        
        assert simulation_call is not None
        assert simulation_call[0][1]['simulation'] == 'recommendation-boost'
        
        # Verify no actual database calls were made (no external dependencies)
        # This is implicit since we're only using logger.info calls
        assert self.mock_logger.info.call_count == 3