import { StreamConfig } from 'motia'
import { z } from 'zod'

/**
 * Schema for individual property details
 */
export const propertyDetailsSchema = z.object({
  address: z.string().describe('Full property address'),
  price: z.string().optional().describe('Property price'),
  bedrooms: z.string().optional().describe('Number of bedrooms'),
  bathrooms: z.string().optional().describe('Number of bathrooms'),
  squareFeet: z.string().optional().describe('Square footage'),
  propertyType: z.string().optional().describe('Type of property (House/Condo/Townhouse/Apartment)'),
  description: z.string().optional().describe('Property description'),
  features: z.array(z.string()).optional().describe('Property features and amenities'),
  images: z.array(z.string()).optional().describe('Property image URLs'),
  agentContact: z.string().optional().describe('Agent contact information'),
  listingUrl: z.string().optional().describe('Original listing URL'),
  valuation: z.object({
    assessment: z.string().optional().describe('Fair price/Over priced/Under priced analysis'),
    investmentPotential: z.enum(['High', 'Medium', 'Low']).optional().describe('Investment potential rating'),
    recommendation: z.string().optional().describe('Key recommendation')
  }).optional().describe('Property valuation analysis')
})

export type PropertyDetails = z.infer<typeof propertyDetailsSchema>

/**
 * Schema for complete property search results
 */
export const propertyResultsSchema = z.object({
  searchId: z.string().describe('Unique identifier for the search session'),
  properties: z.array(propertyDetailsSchema).describe('List of properties found'),
  totalCount: z.number().describe('Total number of properties found'),
  marketAnalysis: z.object({
    condition: z.string().optional().describe('Market condition (buyer\'s/seller\'s market)'),
    priceTrends: z.string().optional().describe('Current price trends'),
    neighborhoods: z.array(z.string()).optional().describe('Key neighborhoods analyzed'),
    investmentOutlook: z.string().optional().describe('Investment outlook summary')
  }).optional().describe('Market analysis results'),
  sourceWebsites: z.array(z.string()).describe('Websites searched'),
  searchCriteria: z.record(z.any()).describe('Original search criteria used'),
  createdAt: z.string().describe('ISO timestamp when search was created'),
  completedAt: z.string().optional().describe('ISO timestamp when search completed')
})

export type PropertyResults = z.infer<typeof propertyResultsSchema>

export const config: StreamConfig = {
  name: 'propertyResults',
  schema: propertyResultsSchema,
  baseConfig: { storageType: 'default' }
}

