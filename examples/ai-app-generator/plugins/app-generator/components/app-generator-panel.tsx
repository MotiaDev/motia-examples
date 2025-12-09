/**
 * AI App Generator Panel
 * 
 * Workbench plugin component for triggering app generation workflows
 * and viewing/downloading completed applications.
 */

import React, { useState, useEffect, useCallback } from 'react';

interface Workflow {
  flowId: string;
  appSpec: {
    title: string;
    genre: string;
    description: string;
    features: string[];
  };
  status: string;
  currentPhase: string;
  createdAt: string;
  updatedAt: string;
  metrics?: {
    totalTokens: number;
    estimatedCost: number;
  };
}

interface AppSpec {
  title: string;
  genre: string;
  description: string;
  features: string[];
  targetAudience?: string;
}

const GENRES = [
  'e-commerce', 'dashboard', 'content-editor', 'social-platform',
  'portfolio', 'blog', 'saas', 'landing-page', 'admin-panel',
  'chat-app', 'marketplace', 'booking-system', 'productivity',
  'task-manager', 'crm', 'analytics', 'custom'
];

export const AppGeneratorPanel: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AppSpec>({
    title: '',
    genre: 'dashboard',
    description: '',
    features: [''],
    targetAudience: '',
  });

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/apps');
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (err: any) {
      setError('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
    const interval = setInterval(fetchWorkflows, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchWorkflows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setGenerating(true);

    try {
      const response = await fetch('/apps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          features: formData.features.filter(f => f.trim()),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`App generation started! Flow ID: ${data.flowId}`);
        setShowForm(false);
        setFormData({
          title: '',
          genre: 'dashboard',
          description: '',
          features: [''],
          targetAudience: '',
        });
        fetchWorkflows();
      } else {
        setError(data.error || 'Failed to start generation');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadZip = async (flowId: string, appTitle: string) => {
    try {
      const response = await fetch(`/apps/${flowId}/download/zip`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appTitle.toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    }
  };

  const handleDownloadJson = async (flowId: string, appTitle: string) => {
    try {
      const response = await fetch(`/apps/${flowId}/download`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Download failed');
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appTitle.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    }
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, ''],
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f),
    }));
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'coding': case 'testing': case 'designing': return 'bg-blue-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="p-4 h-full overflow-auto bg-slate-900 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          AI App Generator
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>{showForm ? '✕' : '+'}</span>
          {showForm ? 'Cancel' : 'New App'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
          <button onClick={() => setError(null)} className="float-right">✕</button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-lg text-green-200">
          {success}
          <button onClick={() => setSuccess(null)} className="float-right">✕</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Generate New Application</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">App Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="My Awesome App"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Genre *</label>
              <select
                value={formData.genre}
                onChange={e => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {GENRES.map(g => (
                  <option key={g} value={g}>{g.replace(/-/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-slate-300">Description *</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
              placeholder="Describe your application in detail..."
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-slate-300">Features *</label>
            {formData.features.map((feature, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={feature}
                  onChange={e => updateFeature(index, e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={`Feature ${index + 1}`}
                />
                {formData.features.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addFeature}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              + Add Feature
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-slate-300">Target Audience</label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={e => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Small businesses, developers, students"
            />
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-medium transition-all disabled:opacity-50"
          >
            {generating ? '🔄 Generating...' : '🚀 Generate Application'}
          </button>
        </form>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Workflows</h3>
          <button
            onClick={fetchWorkflows}
            className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            Refresh
          </button>
        </div>

        {workflows.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-4xl mb-2">📦</p>
            <p>No workflows yet. Generate your first app!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map(workflow => (
              <div
                key={workflow.flowId}
                className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{workflow.appSpec?.title || workflow.flowId}</h4>
                    <p className="text-sm text-slate-400">
                      {workflow.appSpec?.genre?.replace(/-/g, ' ') || 'unknown'} • 
                      {workflow.appSpec?.features?.length || 0} features
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(workflow.status)} text-white`}>
                      {workflow.status}
                    </span>
                  </div>
                </div>

                {workflow.appSpec?.description && (
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                    {workflow.appSpec.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Phase: {workflow.currentPhase} | 
                    Tokens: {workflow.metrics?.totalTokens?.toLocaleString() || 0} | 
                    Cost: ${workflow.metrics?.estimatedCost?.toFixed(4) || '0.0000'}
                  </div>
                  <div className="flex gap-2">
                    {workflow.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleDownloadZip(workflow.flowId, workflow.appSpec?.title || 'app')}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-white"
                          title="Download as ZIP"
                        >
                          📦 ZIP
                        </button>
                        <button
                          onClick={() => handleDownloadJson(workflow.flowId, workflow.appSpec?.title || 'app')}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
                          title="Download as JSON"
                        >
                          📄 JSON
                        </button>
                      </>
                    )}
                    <a
                      href={`/apps/${workflow.flowId}/status`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white"
                    >
                      View Status
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppGeneratorPanel;
