/**
 * UI Component for the Generate App API Step
 * 
 * Displays a form to submit app generation requests directly from Workbench.
 * Includes input fields for app specification and a submit button.
 */

import { ApiNode, type ApiNodeProps } from 'motia/workbench';
import React, { useState } from 'react';

export const Node: React.FC<ApiNodeProps> = (props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: 'dashboard',
    features: '',
    targetAudience: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.features) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/apps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          genre: formData.genre,
          features: formData.features.split('\n').filter(f => f.trim()),
          targetAudience: formData.targetAudience || undefined,
          maxIterations: 3,
          priority: 'balanced',
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ApiNode {...props}>
      <div className="p-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          <span>🚀</span>
          <span>{isExpanded ? 'Hide Form' : 'Create New App'}</span>
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">App Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="My Awesome App"
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A comprehensive description of what your app does..."
                rows={2}
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Genre</label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="dashboard">Dashboard</option>
                <option value="e-commerce">E-Commerce</option>
                <option value="content-editor">Content Editor</option>
                <option value="social-platform">Social Platform</option>
                <option value="portfolio">Portfolio</option>
                <option value="blog">Blog</option>
                <option value="saas">SaaS</option>
                <option value="landing-page">Landing Page</option>
                <option value="admin-panel">Admin Panel</option>
                <option value="chat-app">Chat App</option>
                <option value="marketplace">Marketplace</option>
                <option value="booking-system">Booking System</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Features * (one per line)</label>
              <textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="User authentication&#10;Data visualization&#10;Real-time updates"
                rows={3}
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Target Audience</label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                placeholder="e.g., Small business owners"
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Generate App</span>
                </>
              )}
            </button>

            {result && (
              <div className={`p-2 rounded text-xs ${result.error ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                {result.error ? (
                  <p>Error: {result.error}</p>
                ) : (
                  <div>
                    <p className="font-medium">✅ {result.message}</p>
                    <p className="mt-1 text-gray-400">Flow ID: {result.flowId}</p>
                    <p className="text-gray-400">{result.estimatedTime}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ApiNode>
  );
};

