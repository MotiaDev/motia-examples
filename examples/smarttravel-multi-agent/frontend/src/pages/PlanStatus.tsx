import React from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getTravelPlanStatus } from '../api/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const AGENT_EMOJIS: Record<string, string> = {
  'Destination Explorer': '🏛️',
  'Flight Search Agent': '✈️',
  'Hotel Search Agent': '🏨',
  'Dining Agent': '🍽️',
  'Itinerary Specialist': '📅',
  'Budget Agent': '💰',
}

export function PlanStatus() {
  const { planId } = useParams({ from: '/plan/$planId' })
  
  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['travel-plan', planId],
    queryFn: () => getTravelPlanStatus(planId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'processing' || status === 'pending' ? 2000 : false
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading travel plan...</p>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-800 mb-2">❌ Plan Not Found</h2>
          <p className="text-red-600 mb-4">
            {error?.message || 'Travel plan not found'}
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Create New Plan
          </Link>
        </div>
      </div>
    )
  }

  const isComplete = plan.status === 'completed'
  const isFailed = plan.status === 'failed'
  const isProcessing = plan.status === 'processing' || plan.status === 'pending'

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Create Another Trip
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Travel Plan Status
          </h1>
          <p className="text-gray-600">Plan ID: {planId}</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {isComplete && '✅ Plan Ready!'}
                {isFailed && '❌ Planning Failed'}
                {isProcessing && '⏳ Creating Your Perfect Trip...'}
              </h2>
              <p className="text-gray-600 mt-1">{plan.currentStep}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{plan.progress}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                isComplete ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-blue-600'
              }`}
              style={{ width: `${plan.progress}%` }}
            />
          </div>

          {/* Agent Status */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              🤖 AI Agents Progress
            </h3>
            
            {/* Show compilation status when finalizing */}
            {isProcessing && plan.progress >= 95 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <div>
                    <div className="font-medium text-purple-900">
                      🧠 Compiling Your Complete Travel Guide...
                    </div>
                    <div className="text-sm text-purple-700 mt-1">
                      Waiting for all agents to finish, then generating your final itinerary with AI
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {plan.agents.map((agent) => (
              <div
                key={agent.agentName}
                className={`
                  flex items-center justify-between p-4 rounded-lg
                  ${agent.status === 'completed' ? 'bg-green-50 border border-green-200' :
                    agent.status === 'failed' ? 'bg-red-50 border border-red-200' :
                    agent.status === 'running' ? 'bg-blue-50 border border-blue-200' :
                    'bg-gray-50 border border-gray-200'}
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{AGENT_EMOJIS[agent.agentName]}</span>
                  <div>
                    <div className="font-medium text-gray-900">{agent.agentName}</div>
                    {agent.error && (
                      <div className="text-sm text-red-600">{agent.error}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {agent.status === 'completed' && <span className="text-green-600">✓</span>}
                  {agent.status === 'failed' && <span className="text-red-600">✗</span>}
                  {agent.status === 'running' && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  )}
                  <span className="text-sm text-gray-600 capitalize">{agent.status}</span>
                </div>
              </div>
            ))}
          </div>

          {isFailed && plan.error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Error Details:</p>
              <p className="text-red-600 text-sm mt-1">{plan.error}</p>
            </div>
          )}
        </div>

        {/* Final Itinerary */}
        {isComplete && plan.finalItinerary && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              🎉 Your Complete Travel Guide
            </h2>
            
            {plan.finalItinerary.summary && (
              <div className="prose prose-lg max-w-none mb-8">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {plan.finalItinerary.summary}
                </ReactMarkdown>
              </div>
            )}

            <div className="mt-8 space-y-6">
              {plan.finalItinerary.detailedResults?.destination && (
                <details className="bg-blue-50 rounded-lg p-6">
                  <summary className="text-lg font-semibold text-blue-900 cursor-pointer">
                    🏛️ Destination Research
                  </summary>
                  <div className="mt-4 prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {plan.finalItinerary.detailedResults.destination}
                    </ReactMarkdown>
                  </div>
                </details>
              )}

              {plan.finalItinerary.detailedResults?.flights && (
                <details className="bg-sky-50 rounded-lg p-6">
                  <summary className="text-lg font-semibold text-sky-900 cursor-pointer">
                    ✈️ Flight Options
                  </summary>
                  <div className="mt-4 prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {plan.finalItinerary.detailedResults.flights}
                    </ReactMarkdown>
                  </div>
                </details>
              )}

              {plan.finalItinerary.detailedResults?.hotels && (
                <details className="bg-amber-50 rounded-lg p-6">
                  <summary className="text-lg font-semibold text-amber-900 cursor-pointer">
                    🏨 Accommodation Options
                  </summary>
                  <div className="mt-4 prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {plan.finalItinerary.detailedResults.hotels}
                    </ReactMarkdown>
                  </div>
                </details>
              )}

              {plan.finalItinerary.detailedResults?.dining && (
                <details className="bg-orange-50 rounded-lg p-6">
                  <summary className="text-lg font-semibold text-orange-900 cursor-pointer">
                    🍽️ Dining Recommendations
                  </summary>
                  <div className="mt-4 prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {plan.finalItinerary.detailedResults.dining}
                    </ReactMarkdown>
                  </div>
                </details>
              )}

              {plan.finalItinerary.detailedResults?.itinerary && (
                <details className="bg-indigo-50 rounded-lg p-6">
                  <summary className="text-lg font-semibold text-indigo-900 cursor-pointer">
                    📅 Day-by-Day Itinerary
                  </summary>
                  <div className="mt-4 prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {plan.finalItinerary.detailedResults.itinerary}
                    </ReactMarkdown>
                  </div>
                </details>
              )}

              {plan.finalItinerary.detailedResults?.budget && (
                <details className="bg-green-50 rounded-lg p-6">
                  <summary className="text-lg font-semibold text-green-900 cursor-pointer">
                    💰 Budget Breakdown
                  </summary>
                  <div className="mt-4 prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {plan.finalItinerary.detailedResults.budget}
                    </ReactMarkdown>
                  </div>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

