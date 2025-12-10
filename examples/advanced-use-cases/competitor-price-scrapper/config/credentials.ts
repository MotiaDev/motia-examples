/**
 * Credentials configuration for the Competitor Price Scraper workflow
 * 
 * Environment variables required:
 * - OPENAI_API_KEY: OpenAI API key for embeddings
 * - ANTHROPIC_API_KEY: Anthropic API key for Claude
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_ANON_KEY: Supabase anonymous key
 * - GOOGLE_SHEETS_CLIENT_EMAIL: Service account email
 * - GOOGLE_SHEETS_PRIVATE_KEY: Service account private key
 * - GOOGLE_SHEETS_SPREADSHEET_ID: Target spreadsheet ID
 * - SLACK_BOT_TOKEN: Slack bot token
 * - ENABLE_SHEETS_LOGGING: Toggle for Google Sheets logging (true/false)
 */

export interface Credentials {
  openai: {
    apiKey: string
  }
  anthropic: {
    apiKey: string
  }
  supabase: {
    url: string
    anonKey: string
  }
  googleSheets: {
    clientEmail: string
    privateKey: string
    spreadsheetId: string
  }
  slack: {
    botToken: string
  }
  features: {
    enableSheetsLogging: boolean
  }
}

/**
 * Get credentials from environment variables
 * @returns Credentials object
 */
export function getCredentials(): Credentials {
  const missing: string[] = []

  // Check required environment variables
  const required = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SLACK_BOT_TOKEN'
  ]

  // Check conditionally required variables
  if (process.env.ENABLE_SHEETS_LOGGING === 'true') {
    required.push(
      'GOOGLE_SHEETS_CLIENT_EMAIL',
      'GOOGLE_SHEETS_PRIVATE_KEY',
      'GOOGLE_SHEETS_SPREADSHEET_ID'
    )
  }

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key)
    }
  })

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!
    },
    supabase: {
      url: process.env.SUPABASE_URL!,
      anonKey: process.env.SUPABASE_ANON_KEY!
    },
    googleSheets: {
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '',
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY || '',
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
    },
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN!
    },
    features: {
      enableSheetsLogging: process.env.ENABLE_SHEETS_LOGGING === 'true'
    }
  }
}

/**
 * Validate credentials on startup
 */
export function validateCredentials(): void {
  try {
    const creds = getCredentials()
    console.log('Credentials validated successfully')
    console.log('Features:', {
      sheetsLogging: creds.features.enableSheetsLogging
    })
  } catch (error) {
    console.error('Credential validation failed:', error)
    throw error
  }
}
