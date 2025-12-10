import { MortgageRate, ScraperResult } from './types'

/**
 * Scrapes mortgage rates from multiple sources
 * In production, you'd use real scraping or APIs from mortgage sites
 */
export async function scrapeMortgageRates(): Promise<ScraperResult> {
  // For demo purposes, we'll simulate scraping
  // In production, integrate with:
  // - Freddie Mac API
  // - Bankrate.com scraping
  // - Zillow API
  // - Mortgage News Daily API
  
  const timestamp = new Date().toISOString()
  
  // Simulated rates - replace with actual scraping
  const rates: MortgageRate[] = [
    {
      lender: 'Bank of America',
      product: '30-year fixed',
      rate: 6.875,
      apr: 7.012,
      points: 0.5,
      source: 'bankofamerica.com',
      timestamp
    },
    {
      lender: 'Wells Fargo',
      product: '30-year fixed',
      rate: 6.750,
      apr: 6.891,
      points: 0.75,
      source: 'wellsfargo.com',
      timestamp
    },
    {
      lender: 'Chase',
      product: '30-year fixed',
      rate: 6.625,
      apr: 6.779,
      points: 1.0,
      source: 'chase.com',
      timestamp
    },
    {
      lender: 'Rocket Mortgage',
      product: '30-year fixed',
      rate: 6.500,
      apr: 6.654,
      points: 0.5,
      source: 'rocketmortgage.com',
      timestamp
    },
    {
      lender: 'Bank of America',
      product: '15-year fixed',
      rate: 5.875,
      apr: 6.012,
      points: 0.5,
      source: 'bankofamerica.com',
      timestamp
    }
  ]
  
  return {
    rates,
    scrapedAt: timestamp,
    source: 'multi-lender-aggregate'
  }
}

/**
 * Compare current rates with previous rates to detect significant changes
 */
export function detectRateChanges(
  currentRates: MortgageRate[],
  previousRates: MortgageRate[],
  thresholdPercent: number = 0.125 // Alert on 0.125% (12.5 basis points) change
): Array<{ current: MortgageRate; previous: MortgageRate; change: number }> {
  const changes: Array<{ current: MortgageRate; previous: MortgageRate; change: number }> = []
  
  for (const current of currentRates) {
    const previous = previousRates.find(
      p => p.lender === current.lender && p.product === current.product
    )
    
    if (previous) {
      const change = current.rate - previous.rate
      if (Math.abs(change) >= thresholdPercent) {
        changes.push({ current, previous, change })
      }
    }
  }
  
  return changes
}

