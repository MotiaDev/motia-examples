import { AQIData, Location } from '../../types/aqi.types'
import { formatAQIUrl } from '../../utils/aqi/aqi-utils'

export interface FetchAQIDataOptions {
  location: Location
  firecrawlApiKey?: string
  openWeatherApiKey?: string
}

/**
 * Convert OpenWeatherMap AQI (1-5 scale) to EPA AQI (0-500 scale)
 */
function convertToEpaAqi(owmAqi: number, pm25: number): number {
  // Use PM2.5 concentration to calculate EPA AQI
  if (pm25 <= 12.0) return Math.round((pm25 / 12.0) * 50)
  if (pm25 <= 35.4) return Math.round(50 + ((pm25 - 12.1) / 23.3) * 50)
  if (pm25 <= 55.4) return Math.round(100 + ((pm25 - 35.5) / 19.9) * 50)
  if (pm25 <= 150.4) return Math.round(150 + ((pm25 - 55.5) / 94.9) * 50)
  if (pm25 <= 250.4) return Math.round(200 + ((pm25 - 150.5) / 99.9) * 100)
  return Math.round(300 + ((pm25 - 250.5) / 99.9) * 100)
}

/**
 * Fetch AQI data using OpenWeatherMap API (fallback)
 */
async function fetchFromOpenWeather(location: Location, apiKey: string): Promise<AQIData> {
  // Step 1: Geocode city to get coordinates
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location.city)},${encodeURIComponent(location.state || '')},${encodeURIComponent(location.country)}&limit=1&appid=${apiKey}`
  
  console.log('[DEBUG] OpenWeatherMap geocoding URL:', geoUrl.replace(apiKey, 'API_KEY_HIDDEN'))
  console.log('[DEBUG] API key present:', !!apiKey, 'length:', apiKey?.length)
  
  const geoResponse = await fetch(geoUrl)
  console.log('[DEBUG] Geocoding response status:', geoResponse.status)
  
  if (!geoResponse.ok) {
    const errorText = await geoResponse.text()
    console.error('[DEBUG] Geocoding error response:', errorText)
    throw new Error(`Geocoding failed: ${geoResponse.status} - ${errorText}`)
  }
  
  const geoData = await geoResponse.json()
  if (!geoData || geoData.length === 0) {
    throw new Error(`Location not found: ${location.city}`)
  }
  
  const { lat, lon } = geoData[0]
  
  // Step 2: Fetch air pollution data
  const airUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
  const airResponse = await fetch(airUrl)
  
  if (!airResponse.ok) {
    throw new Error(`Air Pollution API failed: ${airResponse.status}`)
  }
  
  const airData = await airResponse.json()
  if (!airData.list || airData.list.length === 0) {
    throw new Error('No air pollution data available')
  }
  
  const pollution = airData.list[0]
  const components = pollution.components
  
  // Step 3: Fetch weather data
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
  const weatherResponse = await fetch(weatherUrl)
  
  if (!weatherResponse.ok) {
    throw new Error(`Weather API failed: ${weatherResponse.status}`)
  }
  
  const weatherData = await weatherResponse.json()
  
  const epaAqi = convertToEpaAqi(pollution.main.aqi, components.pm2_5)
  
  return {
    aqi: epaAqi,
    temperature: weatherData.main.temp,
    humidity: weatherData.main.humidity,
    wind_speed: weatherData.wind.speed * 3.6,
    pm25: components.pm2_5,
    pm10: components.pm10,
    co: components.co / 1000,
    timestamp: new Date(pollution.dt * 1000).toISOString(),
    source_url: `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=pollution&lat=${lat}&lon=${lon}&zoom=10`,
  }
}

/**
 * Fetch AQI data using Firecrawl (primary method) - matches Python SDK structure
 */
async function fetchFromFirecrawl(location: Location, apiKey: string): Promise<AQIData> {
  const url = formatAQIUrl(location.country, location.state, location.city)
  
  // Use Firecrawl's extract endpoint (matching Python SDK)
  const extractResponse = await fetch('https://api.firecrawl.dev/v1/extract', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      urls: [`${url}/*`],  // Array of URLs with wildcard (matches Python)
      prompt: 'Extract the current real-time AQI, temperature, humidity, wind speed, PM2.5, PM10, and CO levels from the page. Also extract the timestamp of the data.',
      schema: {
        type: 'object',
        properties: {
          aqi: { 
            type: 'number', 
            description: 'Air Quality Index' 
          },
          temperature: { 
            type: 'number', 
            description: 'Temperature in degrees Celsius' 
          },
          humidity: { 
            type: 'number', 
            description: 'Humidity percentage' 
          },
          wind_speed: { 
            type: 'number', 
            description: 'Wind speed in kilometers per hour' 
          },
          pm25: { 
            type: 'number', 
            description: 'Particulate Matter 2.5 micrometers' 
          },
          pm10: { 
            type: 'number', 
            description: 'Particulate Matter 10 micrometers' 
          },
          co: { 
            type: 'number', 
            description: 'Carbon Monoxide level' 
          },
        },
        required: ['aqi', 'temperature', 'humidity', 'wind_speed', 'pm25', 'pm10', 'co'],
      },
    }),
  })
  
  if (!extractResponse.ok) {
    const errorText = await extractResponse.text()
    throw new Error(`Firecrawl API error: ${extractResponse.status} - ${errorText}`)
  }
  
  const firecrawlResult = await extractResponse.json()
  
  // Match Python response structure: { success, data, status, expiresAt }
  if (!firecrawlResult.success) {
    throw new Error(`Failed to extract AQI data: ${firecrawlResult.status}`)
  }
  
  const extractedData = firecrawlResult.data
  
  if (!extractedData || typeof extractedData !== 'object') {
    throw new Error(`No data extracted from Firecrawl: ${JSON.stringify(firecrawlResult)}`)
  }
  
  // Check if we got actual data (not all zeros)
  const hasValidData = extractedData.aqi > 0 || extractedData.temperature !== 0 || extractedData.pm25 > 0
  
  if (!hasValidData) {
    throw new Error(`Firecrawl returned empty data (all zeros). Website may be down or blocking requests.`)
  }
  
  return {
    aqi: extractedData.aqi || 0,
    temperature: extractedData.temperature || 0,
    humidity: extractedData.humidity || 0,
    wind_speed: extractedData.wind_speed || 0,
    pm25: extractedData.pm25 || 0,
    pm10: extractedData.pm10 || 0,
    co: extractedData.co || 0,
    timestamp: new Date().toISOString(),
    source_url: url,
  }
}

/**
 * Main function: Try Firecrawl first, fall back to OpenWeatherMap if it fails
 */
export async function fetchAQIData(options: FetchAQIDataOptions): Promise<AQIData> {
  const { location, firecrawlApiKey, openWeatherApiKey } = options
  
  // Determine if location is in India (where aqi.in has good coverage)
  const isIndianLocation = location.country.toLowerCase() === 'india' || location.country.toLowerCase() === 'in'
  
  // Try Firecrawl first ONLY for Indian locations (if API key provided)
  if (firecrawlApiKey && isIndianLocation) {
    try {
      console.log(`[INFO] Using Firecrawl for Indian location: ${location.city}`)
      return await fetchFromFirecrawl(location, firecrawlApiKey)
    } catch (firecrawlError) {
      console.warn('Firecrawl failed for Indian location, falling back to OpenWeatherMap:', firecrawlError instanceof Error ? firecrawlError.message : 'Unknown error')
      
      // Fall back to OpenWeatherMap if available
      if (openWeatherApiKey) {
        return await fetchFromOpenWeather(location, openWeatherApiKey)
      }
      
      // Re-throw if no fallback available
      throw firecrawlError
    }
  }
  
  // For non-Indian locations, use OpenWeatherMap directly (better global coverage)
  if (openWeatherApiKey) {
    console.log(`[INFO] Using OpenWeatherMap for ${location.country} location: ${location.city}`)
    return await fetchFromOpenWeather(location, openWeatherApiKey)
  }
  
  // If no OpenWeatherMap key and location is not India, error out
  if (!isIndianLocation && !openWeatherApiKey) {
    throw new Error('OpenWeatherMap API key required for non-Indian locations')
  }
  
  throw new Error('No API keys provided. Set either FIRECRAWL_API_KEY (India) or OPENWEATHER_API_KEY (Global)')
}
