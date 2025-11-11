export interface MortgageRate {
  lender: string
  product: string // e.g., "30-year fixed", "15-year fixed"
  rate: number
  apr: number
  points: number
  source: string
  timestamp: string
}

export interface ScraperResult {
  rates: MortgageRate[]
  scrapedAt: string
  source: string
}

