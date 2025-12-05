import jwt from 'jsonwebtoken'
import { format, nextTuesday } from 'date-fns'
import { ClaimToken } from './models'

// JWT utilities
export function createSignedToken(
  sessionId: string, 
  phoneE164: string, 
  secret: string,
  expiresIn: string = '24h'
): string {
  const payload = {
    sessionId,
    phoneE164
  }
  
  return jwt.sign(payload, secret, { expiresIn })
}

export function verifySignedToken(token: string, secret: string): ClaimToken {
  try {
    const decoded = jwt.verify(token, secret) as ClaimToken
    return decoded
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export function createHostToken(secret: string, expiresIn: string = '7d'): string {
  return jwt.sign({ type: 'host' }, secret, { expiresIn })
}

export function verifyHostToken(token: string, secret: string): boolean {
  try {
    const decoded = jwt.verify(token, secret) as any
    return decoded.type === 'host'
  } catch (error) {
    return false
  }
}

// Date utilities
export function getNextTuesday(timezone: string = 'America/Chicago'): string {
  const now = new Date()
  const nextTue = nextTuesday(now)
  return format(nextTue, 'yyyy-MM-dd')
}


export function formatPhoneForDisplay(phoneE164: string): string {
  // Convert +1234567890 to +1 (234) 567-890
  const cleaned = phoneE164.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const number = cleaned.slice(1)
    return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`
  }
  return phoneE164
}

export function maskPhone(phoneE164: string): string {
  // Convert +1234567890 to +1***-***-890
  const cleaned = phoneE164.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const number = cleaned.slice(1)
    return `+1***-***-${number.slice(6)}`
  }
  return phoneE164
}

// Validation utilities
export function isValidPhoneE164(phone: string): boolean {
  // Basic E164 format validation
  return /^\+[1-9]\d{1,14}$/.test(phone)
}

export function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // If it's 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`
  }
  
  // If it's 11 digits and starts with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  
  // If it already has +, return as is
  if (phone.startsWith('+')) {
    return phone
  }
  
  // Otherwise, assume it needs +1
  return `+1${digits}`
}

// Timezone utilities
export function getCurrentTimeInTimezone(timezone: string = 'America/Chicago'): Date {
  // Simple timezone handling - in production you'd want proper timezone library
  const now = new Date()
  const offset = timezone === 'America/Chicago' ? -6 : 0 // CST is UTC-6
  return new Date(now.getTime() + (offset * 60 * 60 * 1000))
}

export function isTimeInRange(
  currentTime: Date, 
  targetHour: number, 
  targetMinute: number = 0,
  timezone: string = 'America/Chicago'
): boolean {
  const zonedTime = getCurrentTimeInTimezone(timezone)
  const currentHour = zonedTime.getHours()
  const currentMin = zonedTime.getMinutes()
  
  return currentHour === targetHour && currentMin >= targetMinute && currentMin < targetMinute + 5
}

// Session utilities
export function calculateNextTuesdayDate(): string {
  const nextTuesdayDate = new Date()
  nextTuesdayDate.setDate(nextTuesdayDate.getDate() + (2 - nextTuesdayDate.getDay() + 7) % 7) // Next Tuesday
  return nextTuesdayDate.toISOString().split('T')[0]
}

export function getSessionDateRange(days: number = 60): string[] {
  const dates: string[] = []
  const today = new Date()
  
  for (let i = 0; i < days; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() + i)
    dates.push(checkDate.toISOString().split('T')[0])
  }
  
  return dates
}

// Booking utilities
export function buildRosterFromBookings(
  bookings: any[], 
  friends: any[], 
  status: string = 'confirmed'
): Array<{ name: string; phoneMasked: string }> {
  return bookings
    .filter(booking => booking.status === status)
    .map(booking => {
      const friend = friends[booking.friendId]
      return {
        name: friend?.name || 'Friend',
        phoneMasked: maskPhone(booking.phoneE164)
      }
    })
}

export function calculateSessionStats(
  bookings: any[], 
  capacity: number
): { confirmed: number; available: number; waitlisted: number } {
  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const waitlisted = bookings.filter(b => b.status === 'waitlisted').length
  
  return {
    confirmed,
    available: Math.max(0, capacity - confirmed),
    waitlisted
  }
}

// State management utilities
export async function getSessionBookings(
  state: any, 
  sessionId: string
): Promise<any[]> {
  const allBookings = await state.get('bookings', 'list') || []
  return allBookings.filter(
    (booking: any) => booking.sessionId === sessionId
  )
}

export async function getActiveFriends(state: any): Promise<any[]> {
  const allFriends = await state.get('friends', 'list') || []
  return allFriends.filter(
    (friend: any) => friend.active === true
  )
}
