import React, { useState } from 'react';

interface Location {
  city: string;
  state?: string;
  country: string;
}

interface AQIData {
  aqi: number;
  temperature: number;
  humidity: number;
  wind_speed: number;
  pm25: number;
  pm10: number;
  co: number;
  timestamp: string;
  source_url: string;
}

interface HealthRecommendation {
  overall_assessment: string;
  health_impact: {
    severity: string;
    description: string;
  };
}

interface AnalysisResult {
  request_id: string;
  location: Location;
  aqi_data: AQIData;
  recommendations?: HealthRecommendation;
  created_at: string;
}

interface FormState {
  city: string;
  state: string;
  country: string;
  activity: string;
  medicalConditions: string;
  includeTrends: boolean;
}

export function AQIDashboardUI(): React.ReactElement {
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    city: 'Los Angeles',
    state: 'California',
    country: 'USA',
    activity: 'morning jog',
    medicalConditions: '',
    includeTrends: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/aqi/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: {
            city: form.city,
            state: form.state || undefined,
            country: form.country,
          },
          user_context: {
            planned_activity: form.activity,
            medical_conditions: form.medicalConditions ? form.medicalConditions.split(',').map(c => c.trim()) : [],
          },
          include_trends: form.includeTrends,
          user_id: 'workbench-user',
        }),
      });

      const data = await response.json();
      setCurrentRequestId(data.request_id);

      // Poll for results
      pollForResults(data.request_id);
    } catch (error) {
      console.error('Failed to start analysis:', error);
      setLoading(false);
    }
  };

  const pollForResults = async (requestId: string): Promise<void> => {
    let attempts = 0;
    const maxAttempts = 20;
    let isComplete = false;

    const poll = async (): Promise<void> => {
      // Stop if already complete or max attempts reached
      if (isComplete || attempts >= maxAttempts) {
        setLoading(false);
        setCurrentRequestId(null);
        return;
      }

      attempts++;

      try {
        const response = await fetch(`http://localhost:3000/aqi/analyze/${requestId}`);
        
        if (!response.ok) {
          // Wait and try again
          setTimeout(() => poll(), 2000);
          return;
        }

        const data = await response.json() as AnalysisResult;

        // Check if we have valid data
        if (data.aqi_data && data.aqi_data.aqi > 0) {
          isComplete = true; // Set flag to prevent further polling
          setResults(prev => [data, ...prev.slice(0, 4)]);
          setLoading(false);
          setCurrentRequestId(null);
          return; // STOP POLLING
        }

        // Still processing, wait and try again
        setTimeout(() => poll(), 2000);
      } catch (error) {
        console.error('Polling error:', error);
        // Wait and try again on error
        setTimeout(() => poll(), 2000);
      }
    };

    // Start polling
    await poll();
  };

  const getAQIColor = (aqi: number): string => {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
  };

  const getAQILevel = (aqi: number): string => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
          🌍 AQI Analysis Dashboard
        </h1>
        <p style={{ color: 'white', fontSize: '14px' }}>
          Analyze air quality and get AI-powered health recommendations
        </p>
      </div>

      {/* Analysis Form */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: '16px', 
        padding: '2px', 
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '14px',
          padding: '28px'
        }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🔍</span>
            Start New Analysis
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                  City <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '10px', 
                    border: '2px solid #e2e8f0',
                    fontSize: '14px',
                    color: '#1e293b',
                    background: '#f8fafc',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  placeholder="e.g., Mumbai"
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                  State/Province
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '10px', 
                    border: '2px solid #e2e8f0',
                    fontSize: '14px',
                    color: '#1e293b',
                    background: '#f8fafc',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  placeholder="e.g., Maharashtra"
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                  Country <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '10px', 
                    border: '2px solid #e2e8f0',
                    fontSize: '14px',
                    color: '#1e293b',
                    background: '#f8fafc',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  placeholder="e.g., India"
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                  Planned Activity <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.activity}
                  onChange={(e) => setForm({ ...form, activity: e.target.value })}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '10px', 
                    border: '2px solid #e2e8f0',
                    fontSize: '14px',
                    color: '#1e293b',
                    background: '#f8fafc',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  placeholder="e.g., morning jog"
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                Medical Conditions <span style={{ color: '#64748b', fontWeight: '400', fontSize: '13px' }}>(comma-separated)</span>
              </label>
              <input
                type="text"
                value={form.medicalConditions}
                onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  borderRadius: '10px', 
                  border: '2px solid #e2e8f0',
                  fontSize: '14px',
                  color: '#1e293b',
                  background: '#f8fafc',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                placeholder="e.g., asthma, allergies"
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: '24px', background: '#f1f5f9', padding: '14px 16px', borderRadius: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.includeTrends}
                  onChange={(e) => setForm({ ...form, includeTrends: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#667eea' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                  📊 Include 7-day trend analysis
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ 
                background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 28px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%',
                transition: 'all 0.3s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(102, 126, 234, 0.4)',
                transform: loading ? 'scale(0.98)' : 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(102, 126, 234, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
            >
              {loading ? '🔄 Analyzing... (this may take 10-15 seconds)' : '🚀 Start Analysis'}
            </button>
          </form>
        </div>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '20px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📊</span>
            Recent Analyses
          </h2>

          {results.map((result, index) => (
            <div
              key={result.request_id}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '28px',
                marginBottom: '20px',
                border: '2px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                transition: 'all 0.3s'
              }}
            >
              {/* Location Header */}
              <div style={{ marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📍</span>
                  {result.location.city}
                  {result.location.state && `, ${result.location.state}`}
                  , {result.location.country}
                </h3>
                <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
                  {new Date(result.created_at).toLocaleString()}
                </p>
              </div>

              {/* AQI Badge */}
              <div
                style={{
                  background: getAQIColor(result.aqi_data.aqi),
                  color: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}
              >
                <div style={{ fontSize: '64px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {result.aqi_data.aqi}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>
                  {getAQILevel(result.aqi_data.aqi)}
                </div>
              </div>

              {/* Environmental Data Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '16px', 
                marginBottom: '24px' 
              }}>
                <div style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', padding: '18px', borderRadius: '12px', border: '2px solid #7dd3fc' }}>
                  <div style={{ fontSize: '12px', color: '#0369a1', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🌡️ Temperature</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#0c4a6e' }}>{result.aqi_data.temperature.toFixed(1)}°C</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', padding: '18px', borderRadius: '12px', border: '2px solid #a5b4fc' }}>
                  <div style={{ fontSize: '12px', color: '#4338ca', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💧 Humidity</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#312e81' }}>{result.aqi_data.humidity}%</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', padding: '18px', borderRadius: '12px', border: '2px solid #86efac' }}>
                  <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💨 Wind Speed</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#14532d' }}>{result.aqi_data.wind_speed.toFixed(1)} km/h</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', padding: '18px', borderRadius: '12px', border: '2px solid #fbbf24' }}>
                  <div style={{ fontSize: '12px', color: '#b45309', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚠️ PM2.5</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#78350f' }}>{result.aqi_data.pm25.toFixed(1)} µg/m³</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)', padding: '18px', borderRadius: '12px', border: '2px solid #fb923c' }}>
                  <div style={{ fontSize: '12px', color: '#c2410c', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚠️ PM10</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c2d12' }}>{result.aqi_data.pm10.toFixed(1)} µg/m³</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)', padding: '18px', borderRadius: '12px', border: '2px solid #f87171' }}>
                  <div style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>☣️ CO Level</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#7f1d1d' }}>{result.aqi_data.co.toFixed(2)} mg/m³</div>
                </div>
              </div>

              {/* AI Recommendations */}
              {result.recommendations && (
                <div style={{ 
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', 
                  border: '2px solid #34d399', 
                  borderRadius: '12px', 
                  padding: '20px' 
                }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}>
                    <span style={{ fontSize: '20px' }}>🤖</span>
                    AI-Powered Assessment
                  </h4>
                  <p style={{ fontSize: '15px', lineHeight: '1.7', marginBottom: '16px', color: '#064e3b', fontWeight: '500' }}>
                    {result.recommendations.overall_assessment}
                  </p>
                  <div style={{ 
                    background: 'white', 
                    padding: '16px', 
                    borderRadius: '10px', 
                    fontSize: '14px',
                    border: '2px solid #6ee7b7'
                  }}>
                    <strong style={{ color: '#047857', fontSize: '15px' }}>
                      Health Impact: <span style={{ 
                        background: '#fef3c7', 
                        color: '#b45309', 
                        padding: '4px 10px', 
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {result.recommendations.health_impact.severity}
                      </span>
                    </strong>
                    <p style={{ margin: '10px 0 0 0', color: '#1e293b', lineHeight: '1.6' }}>
                      {result.recommendations.health_impact.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Email Notification Badge */}
              <div style={{ 
                marginTop: '20px', 
                padding: '16px', 
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '14px',
                color: '#1e40af',
                border: '2px solid #93c5fd',
                fontWeight: '600'
              }}>
                <span style={{ fontSize: '18px' }}>✉️</span>
                <span>Email notification sent to configured recipients</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 40px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          borderRadius: '20px',
          border: '3px dashed #cbd5e1',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>🌍</div>
          <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px', color: '#1e293b' }}>
            No analyses yet
          </h3>
          <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '500' }}>
            Start your first AQI analysis to see results here
          </p>
        </div>
      )}
    </div>
  );
}

