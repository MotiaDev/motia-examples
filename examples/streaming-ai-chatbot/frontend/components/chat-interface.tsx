'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PromptBox } from '@/components/ui/chatgpt-prompt-input';
import { ChatHistory } from '@/components/chat-history';
import { MarkdownMessage } from '@/components/markdown-message'; // New import
import { apiClient } from '@/lib/api';
import { streamClient } from '@/lib/stream';

interface ChatMessage {
  id: string;
  message: string;
  from: 'user' | 'assistant';
  status: 'created' | 'streaming' | 'completed';
  timestamp: string;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ChatHistoryItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to conversation stream for real-time updates
    const unsubscribe = streamClient.subscribe(
      'conversation',
      conversationId,
      (streamMessages) => {
        // Convert stream messages to array format
        const messageArray = Object.entries(streamMessages)
          .map(([id, data]) => ({
            id,
            ...data,
          }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setMessages(messageArray);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [conversationId]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);

    try {
      // Generate conversation ID if not exists
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        currentConversationId = crypto.randomUUID();
        setConversationId(currentConversationId);
      }

      const response = await apiClient.sendMessage(message, currentConversationId);
      console.log('Message sent successfully:', response);
      
      // Restart polling to catch the new AI response
      streamClient.restartPolling('conversation', currentConversationId, (messages) => {
        const messageArray = Object.entries(messages)
          .map(([id, data]) => ({
            id,
            ...data,
          }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setMessages(messageArray);
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    // Save current conversation to history if it has messages
    if (conversationId && messages.length > 0) {
      const firstUserMessage = messages.find(m => m.from === 'user')?.message || 'New conversation';
      const lastMessage = messages[messages.length - 1]?.message || '';
      
      setConversations(prev => [
        {
          id: conversationId,
          title: firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '...' : ''),
          lastMessage: lastMessage.slice(0, 100) + (lastMessage.length > 100 ? '...' : ''),
          timestamp: new Date().toISOString(),
        },
        ...prev
      ]);
    }

    // Start new conversation
    setConversationId('');
    setMessages([]);
    setIsLoading(false);
  };

  const handleSelectConversation = (selectedConversationId: string) => {
    // Save current conversation before switching
    if (conversationId && messages.length > 0 && conversationId !== selectedConversationId) {
      const firstUserMessage = messages.find(m => m.from === 'user')?.message || 'New conversation';
      const lastMessage = messages[messages.length - 1]?.message || '';
      
      setConversations(prev => {
        const existing = prev.find(c => c.id === conversationId);
        if (existing) {
          return prev.map(c => 
            c.id === conversationId 
              ? { ...c, lastMessage: lastMessage.slice(0, 100) + (lastMessage.length > 100 ? '...' : '') }
              : c
          );
        } else {
          return [
            {
              id: conversationId,
              title: firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '...' : ''),
              lastMessage: lastMessage.slice(0, 100) + (lastMessage.length > 100 ? '...' : ''),
              timestamp: new Date().toISOString(),
            },
            ...prev
          ];
        }
      });
    }

    // Switch to selected conversation
    setConversationId(selectedConversationId);
    setMessages([]);
    setIsLoading(true);

    // Load messages for selected conversation
    // The useEffect will handle loading the messages
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.from === 'user';
    const isStreaming = msg.status === 'streaming';

    return (
      <div
        key={msg.id}
        className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
          <div
            className={`relative px-4 py-3 rounded-2xl ${
              isUser
                ? 'bg-blue-500 text-white ml-auto'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            }`}
          >
            <div className="text-sm leading-relaxed">
              {isUser ? (
                // User messages: plain text
                <>
                  {msg.message.length > 0 ? msg.message : 'Processing...'}
                </>
              ) : (
                // AI messages: markdown formatted
                <>
                  {msg.message.length > 0 ? (
                    <MarkdownMessage content={msg.message} />
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 italic">
                      {isStreaming ? 'Thinking...' : 'Processing...'}
                    </span>
                  )}
                  {isStreaming && (
                    <span className="inline-block w-2 h-5 ml-1 bg-current animate-pulse" />
                  )}
                </>
              )}
            </div>
            
            {/* Timestamp */}
            <div
              className={`text-xs mt-1 opacity-70 ${
                isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {formatTimestamp(msg.timestamp)}
              {msg.status === 'streaming' && (
                <span className="ml-1 animate-pulse">●</span>
              )}
            </div>
          </div>

          {/* Avatar */}
          <div
            className={`flex items-center mt-1 ${
              isUser ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                isUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-purple-600 text-white'
              }`}
            >
              {isUser ? 'U' : 'AI'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Chat History Sidebar */}
      <ChatHistory
        conversations={conversations}
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          AI Chat Assistant
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {conversationId ? `ID: ${conversationId.slice(0, 8)}...` : 'New conversation'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-medium mb-2">Welcome to AI Chat</h3>
            <p>Start a conversation by typing a message below.</p>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            {isLoading && !messages.find(m => m.status === 'streaming') && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
          <PromptBox
            onSubmit={handleSendMessage}
            placeholder="Type your message..."
          />
        </div>
      </div>
      </div>
    </div>
  );
}
