#!/usr/bin/env node

const jwt = require('jsonwebtoken')
const crypto = require('crypto')

// Load environment variables
require('dotenv').config()

const HOST_SIGNING_SECRET = process.env.HOST_SIGNING_SECRET
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'http://localhost:3000'

if (!HOST_SIGNING_SECRET) {
  console.error('❌ HOST_SIGNING_SECRET not found in environment')
  process.exit(1)
}

console.log('🌱 Tuesday WakeSurf Club - Test Data Seeder')
console.log('==========================================\n')

// Generate test friends data
const testFriends = [
  { name: 'Alice Johnson', phone: '+15551234567' },
  { name: 'Bob Smith', phone: '+15559876543' },
  { name: 'Carol Davis', phone: '+15555555555' },
  { name: 'David Wilson', phone: '+15551111111' },
  { name: 'Emma Brown', phone: '+15552222222' }
]

// Generate a test session ID
const sessionId = crypto.randomUUID()

// Generate booking links for each friend
console.log('📱 Test Booking Links:')
console.log('=====================')
testFriends.forEach((friend, index) => {
  const token = jwt.sign(
    {
      sessionId,
      phoneE164: friend.phone,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    HOST_SIGNING_SECRET
  )
  
  const bookingUrl = `${PUBLIC_APP_URL}/book?token=${token}`
  console.log(`${index + 1}. ${friend.name} (${friend.phone})`)
  console.log(`   ${bookingUrl}\n`)
})

// Generate admin token
const adminToken = jwt.sign(
  { type: 'host' },
  HOST_SIGNING_SECRET,
  { expiresIn: '7d' }
)

console.log('🔑 Admin Token (for testing admin features):')
console.log('============================================')
console.log(adminToken)
console.log('\n📋 Test Data for Import:')
console.log('========================')
console.log('Copy this into the admin panel to import test friends:')
console.log('')
testFriends.forEach(friend => {
  console.log(`${friend.name}, ${friend.phone}`)
})

console.log('\n🎯 Testing Instructions:')
console.log('=======================')
console.log('1. Start the app: pnpm dev:full')
console.log('2. Visit: http://localhost:3000/admin')
console.log('3. Paste the admin token above')
console.log('4. Import the test friends data')
console.log('5. Use the booking links to test the flow')
console.log('6. Check SMS delivery in Twilio console (if configured)')

console.log('\n📱 SMS Testing:')
console.log('===============')
console.log('For SMS testing, configure Twilio sandbox:')
console.log('1. Get sandbox number from Twilio console')
console.log('2. Update TWILIO_FROM_NUMBER in .env')
console.log('3. Use sandbox numbers for testing (format: +1XXXXXXXXXX)')

console.log('\n🏄‍♂️ Happy testing!')
