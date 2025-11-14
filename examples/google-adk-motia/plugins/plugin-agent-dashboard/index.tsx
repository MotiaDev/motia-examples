import React, { useState, useEffect, useRef } from 'react';

interface AgentDashboardProps {
  // Workbench context props
}

interface ApiResponse {
  request_id?: string;
  session_id?: string;
  response?: string;
  status?: string;
  final_output?: string;
  error?: string;
}

export function AgentDashboardUI(props: AgentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'simple' | 'research' | 'tools'>('simple');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [requestId, setRequestId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  // Poll for chat agent response  
  useEffect(() => {
    if (!requestId || activeTab !== 'simple') return;

    console.log('🔄 Starting chat result polling:', { requestId });

    let isCancelled = false;
    let pollAttempts = 0;
    const maxAttempts = 30; // 30 * 500ms = 15 seconds max

    const pollForResult = async () => {
      while (!isCancelled && pollAttempts < maxAttempts) {
        pollAttempts++;
        
        try {
          const res = await fetch(`http://localhost:3000/agents/chat/${requestId}`);
          const data: ApiResponse = await res.json();

          if (data.response) {
            console.log('✅ Chat completed!');
            setResponse(data.response);
            setLoading(false);
            setError('');
            break;
          } else if (data.error) {
            console.error('❌ Chat error:', data.error);
            setError(data.error);
            setResponse('');
            setLoading(false);
            break;
          } else if (data.status === 'processing') {
            setResponse(`✨ AI is thinking... (${Math.floor(pollAttempts * 0.5)}s)`);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }

        // Wait 500ms before next poll (much faster than before)
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (pollAttempts >= maxAttempts && !isCancelled) {
        setError('Response timeout. Please try again.');
        setLoading(false);
      }
    };

    pollForResult();

    return () => {
      isCancelled = true;
      console.log('🛑 Stopped polling for chat result');
    };
  }, [requestId, activeTab]);

  // Subscribe to research progress stream for multi-agent (with polling fallback)
  useEffect(() => {
    if (!requestId || activeTab !== 'research') return;

    console.log('🔄 Starting research result polling:', { requestId });

    let isCancelled = false;
    let pollAttempts = 0;
    const maxAttempts = 180; // 180 * 500ms = 90 seconds max (research can take 50-70s)

    const pollForResult = async () => {
      while (!isCancelled && pollAttempts < maxAttempts) {
        pollAttempts++;
        
        try {
          const res = await fetch(`http://localhost:3000/agents/research/${requestId}`);
          const data: ApiResponse = await res.json();

          if (data.final_output) {
            console.log('✅ Research completed!');
            setResponse(data.final_output);
            setLoading(false);
            setError('');
            break;
          } else if (data.error) {
            console.error('❌ Research error:', data.error);
            setError(data.error);
            setResponse('');
            setLoading(false);
            break;
          } else if (data.status === 'processing' || data.status === 'executing') {
            setResponse(`🔬 Multi-agent research in progress... (${Math.floor(pollAttempts * 0.5)}s)`);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }

        // Wait 500ms before next poll
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (pollAttempts >= maxAttempts && !isCancelled) {
        setError('Research timeout. The agents may still be working - please try refreshing.');
        setLoading(false);
      }
    };

    pollForResult();

    return () => {
      isCancelled = true;
      console.log('🛑 Stopped polling for research result');
    };
  }, [requestId, activeTab]);

  const handleSimpleChat = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    setResponse('🚀 Sending request to agent...');
    setError('');
    
    try {
      const res = await fetch('http://localhost:3000/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          agent_type: 'simple',
          config: {
            model: 'gemini-2.5-flash',
            temperature: 0.7,
          },
        }),
      });
      
      const data: ApiResponse = await res.json();
      
      if (data.request_id && data.session_id) {
        setRequestId(data.request_id);
        setSessionId(data.session_id);
        setResponse('✨ Request accepted. Connecting to stream...');
        // Stream subscription happens automatically via useEffect
      } else if (data.error) {
        setError(data.error);
        setLoading(false);
      }
    } catch (error) {
      setError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleResearchWorkflow = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResponse('🔬 Starting multi-agent research workflow...');
    setError('');
    
    try {
      const res = await fetch('http://localhost:3000/agents/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          workflow_type: 'sequential',
        }),
      });
      
      const data: ApiResponse = await res.json();
      
      if (data.request_id) {
        setRequestId(data.request_id);
        setSessionId(data.request_id); // Using request_id as session_id for research
        setResponse('✨ Research workflow initiated. Connecting to stream...');
        // Stream subscription happens automatically via useEffect
      } else if (data.error) {
        setError(data.error);
        setLoading(false);
      }
    } catch (error) {
      setError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b-2 border-blue-500 dark:border-blue-600 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="text-4xl">🤖</span>
              Agent Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></span>
              {loading ? 'Fast polling active (500ms)...' : 'Google ADK-powered agents running on Motia'}
            </p>
          </div>
          {requestId && (
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Request ID</p>
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                {requestId.substring(0, 8)}...
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 pt-2">
        <button
          onClick={() => {
            setActiveTab('simple');
            setResponse('');
            setError('');
          }}
          className={`px-6 py-3 text-sm font-semibold transition-all rounded-t-lg ${
            activeTab === 'simple'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 -mb-0.5'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50'
          }`}
        >
          <span className="flex items-center gap-2">
            💬 Simple Chat
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab('research');
            setResponse('');
            setError('');
          }}
          className={`px-6 py-3 text-sm font-semibold transition-all rounded-t-lg ${
            activeTab === 'research'
              ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-b-2 border-purple-500 -mb-0.5'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50'
          }`}
        >
          <span className="flex items-center gap-2">
            🔬 Research Workflow
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab('tools');
            setResponse('');
            setError('');
          }}
          className={`px-6 py-3 text-sm font-semibold transition-all rounded-t-lg ${
            activeTab === 'tools'
              ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border-b-2 border-green-500 -mb-0.5'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50'
          }`}
        >
          <span className="flex items-center gap-2">
            🛠️ Tools & Capabilities
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'simple' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  💬
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Simple Chat Agent
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Powered by Google Gemini • Real-time AI responses
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !loading && message.trim()) {
                        handleSimpleChat();
                      }
                    }}
                    placeholder="Ask me anything... (Cmd/Ctrl + Enter to send)"
                    className="w-full h-40 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                    disabled={loading}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSimpleChat}
                    disabled={loading || !message.trim()}
                    className="flex-1 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>🚀</span> Send Message
                      </span>
                    )}
                  </button>
                  
                  {(response || error) && (
                    <button
                      onClick={() => {
                        setMessage('');
                        setResponse('');
                        setError('');
                        setRequestId('');
                      }}
                      className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              
              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                        Error
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {response && !error && (
                  <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-lg">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue-100 dark:border-blue-800">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-2xl">✨</span> Agent Response
                      </h3>
                      {loading && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-2">
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Polling
                        </span>
                      )}
                    </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div 
                      className="text-base leading-relaxed"
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        color: 'var(--tw-prose-body)',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: response
                          // Code blocks with syntax highlighting
                          .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 dark:bg-gray-950 text-green-400 p-4 rounded-lg overflow-x-auto my-4 border border-gray-700"><code>$2</code></pre>')
                          // Inline code
                          .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 text-pink-600 dark:text-pink-400 px-2 py-1 rounded text-sm font-mono">$1</code>')
                          // Bold text
                          .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>')
                          // Headers
                          .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-3">$1</h3>')
                          .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">$1</h2>')
                          // Line breaks
                          .replace(/\n\n/g, '<br/><br/>')
                          // Make base text highly visible
                          .replace(/^(.+)$/gm, '<span class="text-gray-900 dark:text-gray-100">$1</span>')
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Example prompts */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                💡 Try these example prompts:
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'Explain quantum computing in simple terms',
                  'Write a Python function to calculate fibonacci',
                  'What are the top 3 programming languages in 2024?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setMessage(prompt)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-gray-900 dark:text-gray-100 rounded-lg hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 border border-blue-200 dark:border-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'research' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  🔬
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Multi-Agent Research Workflow
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Researcher → Summarizer → Critic • Comprehensive analysis
                  </p>
                </div>
              </div>
              
              {/* Agent Pipeline Visualization */}
              <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-850 rounded-xl border-2 border-purple-200 dark:border-purple-700/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-lg mb-3 shadow-md">
                      1
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Research Agent</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Gathers data</p>
                  </div>
                  <div className="text-3xl text-purple-500 dark:text-purple-400 px-6">→</div>
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg mb-3 shadow-md">
                      2
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Summarizer</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Synthesizes</p>
                  </div>
                  <div className="text-3xl text-purple-500 dark:text-purple-400 px-6">→</div>
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg mb-3 shadow-md">
                      3
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Critic Agent</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Analyzes</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Research Query
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !loading && query.trim()) {
                        handleResearchWorkflow();
                      }
                    }}
                    placeholder="Enter your research query... (e.g., 'Research the future of renewable energy in smart cities')"
                    className="w-full h-40 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                    disabled={loading}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResearchWorkflow}
                    disabled={loading || !query.trim()}
                    className="flex-1 px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Research in progress...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>🚀</span> Start Research
                      </span>
                    )}
                  </button>
                  
                  {(response || error) && (
                    <button
                      onClick={() => {
                        setQuery('');
                        setResponse('');
                        setError('');
                        setRequestId('');
                      }}
                      className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                {loading && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                    <p className="text-sm text-purple-800 dark:text-purple-300 text-center">
                      ⏱️ Multi-agent research takes 10-30 seconds • Please be patient
                    </p>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                        Error
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {response && !error && (
                  <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-200 dark:border-purple-700 shadow-lg">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-purple-100 dark:border-purple-800">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-2xl">📊</span> Research Report
                      </h3>
                      {loading && (
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-2">
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Polling
                        </span>
                      )}
                    </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div 
                      className="text-base leading-relaxed"
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: response
                          // Code blocks with syntax highlighting
                          .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 dark:bg-gray-950 text-green-400 p-4 rounded-lg overflow-x-auto my-4 border border-gray-700"><code>$2</code></pre>')
                          // Inline code
                          .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 text-pink-600 dark:text-pink-400 px-2 py-1 rounded text-sm font-mono">$1</code>')
                          // Headers
                          .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-purple-900 dark:text-purple-300 mt-6 mb-3">$1</h3>')
                          .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-purple-900 dark:text-purple-200 mt-8 mb-4">$1</h2>')
                          .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-10 mb-5">$1</h1>')
                          // Bold text
                          .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>')
                          // Lists
                          .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-2 text-gray-900 dark:text-gray-100">• $1</li>')
                          .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 mb-2 text-gray-900 dark:text-gray-100">$1. $2</li>')
                          // Line breaks
                          .replace(/\n\n/g, '<br/><br/>')
                          // Make remaining text highly visible
                          .replace(/^(?!<[hl]|<li|<code|<pre|<strong)(.+)$/gm, '<span class="text-gray-900 dark:text-gray-100">$1</span>')
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Example queries */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                💡 Example research queries:
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'Research AI regulation in the European Union',
                  'Investigate CRISPR gene editing developments',
                  'Analyze personalized learning platforms in education',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setQuery(prompt)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 text-gray-900 dark:text-gray-100 rounded-lg hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/50 dark:hover:to-indigo-900/50 border border-purple-200 dark:border-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  🛠️
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Available Tools & Capabilities
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    6 powerful tools integrated • Extensible architecture
                  </p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="group p-6 border border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl transition-all bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      🔍
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">
                        Web Search
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        Search the web using Google Search to find current information and real-time data
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs rounded-full font-semibold border border-blue-200 dark:border-blue-700">
                          Built-in
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full border border-gray-200 dark:border-gray-600">
                          Real-time
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="group p-6 border border-gray-300 dark:border-gray-700 rounded-xl hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-xl transition-all bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      💻
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">
                        Code Execution
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        Execute Python code safely in a sandboxed environment with timeout protection
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs rounded-full font-semibold border border-purple-200 dark:border-purple-700">
                          Built-in
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full border border-gray-200 dark:border-gray-600">
                          Sandboxed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="group p-6 border border-gray-300 dark:border-gray-700 rounded-xl hover:border-green-400 dark:hover:border-green-500 hover:shadow-xl transition-all bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      🌐
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">
                        Web Scraping
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        Extract content from web pages with CSS selector support and smart parsing
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs rounded-full font-semibold border border-green-200 dark:border-green-700">
                          Built-in
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full border border-gray-200 dark:border-gray-600">
                          Async
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="group p-6 border border-gray-300 dark:border-gray-700 rounded-xl hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-xl transition-all bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      🧮
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">
                        Calculator
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        Perform mathematical calculations with support for advanced functions
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 text-xs rounded-full font-semibold border border-orange-200 dark:border-orange-700">
                          Function
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full border border-gray-200 dark:border-gray-600">
                          Fast
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="group p-6 border border-gray-300 dark:border-gray-700 rounded-xl hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-xl transition-all bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-900/40 dark:to-sky-800/40 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      ☁️
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">
                        Weather
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        Get current weather information for any location with temperature units support
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 text-xs rounded-full font-semibold border border-sky-200 dark:border-sky-700">
                          Function
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full border border-gray-200 dark:border-gray-600">
                          API
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="group p-6 border border-gray-300 dark:border-gray-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xl transition-all bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      📅
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">
                        Date & Time
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        Get current date and time with timezone conversion and formatting options
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-xs rounded-full font-semibold border border-indigo-200 dark:border-indigo-700">
                          Function
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full border border-gray-200 dark:border-gray-600">
                          Utility
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Info box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-4">
                <span className="text-3xl">ℹ️</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Extensible Tool System
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    The agent system supports custom tools, third-party integrations (LangChain, CrewAI), 
                    and Model Context Protocol (MCP) tools. You can easily add new capabilities by defining 
                    tool schemas in <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-xs">src/services/agents/tools.ts</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

