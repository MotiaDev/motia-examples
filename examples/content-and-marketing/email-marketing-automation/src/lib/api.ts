// API client for backend integration
const API_BASE_URL = 'http://localhost:3000'

export interface Campaign {
  $id: string
  name: string
  subject: string
  template: string
  targetAudience: string
  personalizeContent: boolean
  scheduledFor?: string
  status?: string
  sentCount?: number
  createdAt?: string
}

export interface CampaignStats {
  totalCampaigns: number
  emailsSent: number
  openRate: number
  clickRate: number
}

export interface User {
  $id: string
  email: string
  firstName: string
  lastName: string
  status: string
  preferences: string
  metadata: string
  $createdAt?: string
}

export interface PersonalizedEmail {
  recipientId: string
  recipientEmail: string
  recipientName: string
  personalizedSubject: string
  personalizedContent: string
}

export interface CampaignEmailsResponse {
  success: boolean
  campaignId: string
  emails: PersonalizedEmail[]
  total: number
}

// Fetch campaigns from backend
export async function fetchCampaigns(): Promise<Campaign[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns`)
    if (!response.ok) {
      throw new Error('Failed to fetch campaigns')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return []
  }
}

// Fetch single campaign
export async function fetchCampaign(id: string): Promise<Campaign | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch campaign')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return null
  }
}

// Create new campaign
export async function createCampaign(data: Omit<Campaign, '$id'>): Promise<Campaign> {
  const response = await fetch(`${API_BASE_URL}/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create campaign: ${error}`)
  }
  
  return await response.json()
}

// Fetch dashboard stats
export async function fetchDashboardStats(): Promise<CampaignStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`)
    if (!response.ok) {
      throw new Error('Failed to fetch stats')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching stats:', error)
    return {
      totalCampaigns: 0,
      emailsSent: 0,
      openRate: 0,
      clickRate: 0,
    }
  }
}

// Fetch all users
export async function fetchUsers(): Promise<User[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/users`)
    if (!response.ok) {
      throw new Error('Failed to fetch users')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

// Fetch personalized emails for a campaign
export async function fetchCampaignEmails(campaignId: string): Promise<CampaignEmailsResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/emails`)
    if (!response.ok) {
      if (response.status === 404) {
        return null // No emails found yet
      }
      throw new Error('Failed to fetch campaign emails')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching campaign emails:', error)
    return null
  }
}
