interface StreamMessage {
  message: string;
  from: 'user' | 'assistant';
  status: 'created' | 'streaming' | 'completed';
  timestamp: string;
}

export class MotiaStreamClient {
  private baseUrl: string;
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  subscribe(
    streamName: string,
    conversationId: string,
    callback: (messages: Record<string, StreamMessage>) => void
  ) {
    const connectionKey = `${streamName}:${conversationId}`;
    
    // Clear existing timeout if any
    const existingTimeout = this.intervals.get(connectionKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    let lastMessageCount = 0;
    let pollCount = 0;
    let pollInterval: NodeJS.Timeout;
    const maxIdlePolls = 5; // Stop polling after 5 consecutive polls with no changes
    
    // Adaptive polling: start fast, then slow down
    let currentPollInterval = 200; // Start with 200ms for immediate responsiveness
    const maxPollInterval = 2000; // Max 2 seconds between polls

    const poll = async () => {
      try {
        const messages = await this.fetchStreamGroup(streamName, conversationId);
        const currentMessageCount = Object.keys(messages).length;
        
        // Check if there are new messages or if any message is streaming
        const hasStreamingMessages = Object.values(messages).some(msg => msg.status === 'streaming');
        const hasChanges = currentMessageCount !== lastMessageCount || hasStreamingMessages;
        
        // Always call callback to ensure UI updates
        callback(messages);
        
        if (hasChanges || hasStreamingMessages) {
          lastMessageCount = currentMessageCount;
          pollCount = 0; // Reset idle counter
          currentPollInterval = 200; // Reset to fast polling when active
          console.log(`📡 Active polling for conversation ${conversationId} - ${currentMessageCount} messages, streaming: ${hasStreamingMessages}`);
        } else {
          pollCount++;
          // Gradually increase polling interval when idle
          currentPollInterval = Math.min(currentPollInterval * 1.5, maxPollInterval);
          
          // Stop polling if no changes for maxIdlePolls consecutive polls
          if (pollCount >= maxIdlePolls) {
            console.log(`🔇 Stopping polling for conversation ${conversationId} - no activity after ${maxIdlePolls} polls`);
            clearTimeout(pollInterval);
            this.intervals.delete(connectionKey);
            return;
          }
        }
        
        // Schedule next poll with adaptive interval
        pollInterval = setTimeout(poll, currentPollInterval);
        this.intervals.set(connectionKey, pollInterval);
        
      } catch (error) {
        console.error('Error polling stream:', error);
        // Retry with longer interval on error
        pollInterval = setTimeout(poll, Math.min(currentPollInterval * 2, maxPollInterval));
        this.intervals.set(connectionKey, pollInterval);
      }
    };

    // Start polling immediately
    poll();

    // Return cleanup function
    return () => {
      clearTimeout(pollInterval);
      this.intervals.delete(connectionKey);
    };
  }

  private async fetchStreamGroup(
    streamName: string,
    conversationId: string
  ): Promise<Record<string, StreamMessage>> {
    try {
      // Use our custom API endpoint to get conversation messages
      const response = await fetch(
        `${this.baseUrl}/api/conversations/${conversationId}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          // Conversation doesn't exist yet, return empty
          return {};
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.messages || {};
    } catch (error) {
      console.error('Failed to fetch conversation messages:', error);
      return {};
    }
  }

  disconnect(streamName: string, conversationId: string) {
    const connectionKey = `${streamName}:${conversationId}`;
    const timeout = this.intervals.get(connectionKey);
    if (timeout) {
      clearTimeout(timeout);
      this.intervals.delete(connectionKey);
    }
  }

  disconnectAll() {
    this.intervals.forEach((timeout) => clearTimeout(timeout));
    this.intervals.clear();
  }

  // Restart polling for a conversation (useful when sending new messages)
  restartPolling(streamName: string, conversationId: string, callback: (messages: Record<string, StreamMessage>) => void) {
    this.disconnect(streamName, conversationId);
    this.subscribe(streamName, conversationId, callback);
  }
}

export const streamClient = new MotiaStreamClient();
