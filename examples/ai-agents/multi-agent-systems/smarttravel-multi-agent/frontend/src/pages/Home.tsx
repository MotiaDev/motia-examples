import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { triggerTravelPlan, type TravelPlanRequest } from '../api/client'

const TRAVEL_STYLES = [
  { value: 'backpacker', label: 'Backpacker - Budget-friendly & Authentic' },
  { value: 'comfort', label: 'Comfort - Balanced & Convenient' },
  { value: 'luxury', label: 'Luxury - Premium & Exclusive' },
  { value: 'eco-conscious', label: 'Eco-Conscious - Sustainable & Responsible' },
] as const

const TRAVEL_VIBES = [
  { value: 'relaxing', label: '🧘 Relaxing', emoji: '🧘' },
  { value: 'adventure', label: '🏔️ Adventure', emoji: '🏔️' },
  { value: 'romantic', label: '💕 Romantic', emoji: '💕' },
  { value: 'cultural', label: '🏛️ Cultural', emoji: '🏛️' },
  { value: 'food-focused', label: '🍽️ Food-Focused', emoji: '🍽️' },
  { value: 'nature', label: '🌿 Nature', emoji: '🌿' },
  { value: 'photography', label: '📸 Photography', emoji: '📸' },
]

export function Home() {
  const navigate = useNavigate()
  
  const mutation = useMutation({
    mutationFn: triggerTravelPlan,
    onSuccess: (data) => {
      navigate({ to: '/plan/$planId', params: { planId: data.planId } })
    },
  })

  const form = useForm({
    defaultValues: {
      name: '',
      destination: '',
      startingLocation: '',
      duration: 5,
      travelDates: { start: '' },
      adults: 2,
      children: 0,
      budget: 2000,
      budgetCurrency: 'USD',
      budgetFlexible: false,
      travelStyle: 'comfort' as const,
      pace: [2],
      vibes: [] as string[],
      priorities: [] as string[],
      interests: '',
    },
    onSubmit: async ({ value }) => {
      mutation.mutate(value as TravelPlanRequest)
    },
  })

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ✈️ SmartTravel
          </h1>
          <p className="text-xl text-gray-600">
            Multi-agent system for intelligent travel planning
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="space-y-8"
          >
            {/* Basic Info */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">
                📍 Trip Overview
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field name="name">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="destination">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destination
                      </label>
                      <input
                        type="text"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g., Paris, Tokyo, Bali"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="startingLocation">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Starting From
                      </label>
                      <input
                        type="text"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g., New York, London"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="duration">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="travelDates.start">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            {/* Group Details */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">
                👥 Travel Group
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field name="adults">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adults
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="children">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Children
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">
                💰 Budget & Style
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field name="budget">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Budget per Person (USD)
                      </label>
                      <input
                        type="number"
                        min="100"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="travelStyle">
                  {(field) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Travel Style
                      </label>
                      <select
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value as any)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {TRAVEL_STYLES.map((style) => (
                          <option key={style.value} value={style.value}>
                            {style.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            {/* Vibes */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">
                ✨ Travel Vibes
              </h2>
              
              <form.Field name="vibes">
                {(field) => (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TRAVEL_VIBES.map((vibe) => (
                      <label
                        key={vibe.value}
                        className={`
                          flex items-center justify-center px-4 py-3 rounded-lg cursor-pointer transition-all
                          ${field.state.value.includes(vibe.value)
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={field.state.value.includes(vibe.value)}
                          onChange={(e) => {
                            const newVibes = e.target.checked
                              ? [...field.state.value, vibe.value]
                              : field.state.value.filter(v => v !== vibe.value)
                            field.handleChange(newVibes)
                          }}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{vibe.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            {/* Interests */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">
                🎯 Interests
              </h2>
              
              <form.Field name="interests">
                {(field) => (
                  <textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Tell us about your interests... (e.g., Art, history, wine tasting, photography)"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </form.Field>
            </div>

            {/* Submit */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {mutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Your Perfect Trip...
                  </span>
                ) : (
                  '🚀 Create My Travel Plan'
                )}
              </button>
              
              {mutation.isError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">
                    ❌ Error: {mutation.error?.message || 'Failed to create travel plan'}
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            Powered by 6 specialized AI agents 🤖 • Built with{' '}
            <a 
              href="https://motia.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium underline"
            >
              Motia
            </a>
            {' '}&{' '}
            <a 
              href="https://tanstack.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium underline"
            >
              TanStack
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

