#!/usr/bin/env node

/**
 * Reseed Data Script
 * Dumps and rebuilds all data with proper state architecture
 */

const fs = require('fs')
const path = require('path')

const STATE_FILE = path.join(__dirname, '..', '.motia', 'motia.state.json')

function clearState() {
  console.log('🗑️  Clearing existing state...')
  fs.writeFileSync(STATE_FILE, '{}')
  console.log('✅ State cleared')
}

function createFriends() {
  console.log('👥 Creating friends with proper list structure...')
  
  const sampleFriends = [
    {
      id: 'friend-1',
      name: 'Alex Johnson',
      phone: '(555) 123-4567',
      phoneE164: '+15551234567',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'friend-2', 
      name: 'Sarah Chen',
      phone: '(555) 234-5678',
      phoneE164: '+15552345678',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'friend-3',
      name: 'Mike Rodriguez', 
      phone: '(555) 345-6789',
      phoneE164: '+15553456789',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'friend-4',
      name: 'Emma Wilson',
      phone: '(555) 456-7890', 
      phoneE164: '+15554567890',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'friend-5',
      name: 'David Kim',
      phone: '(555) 567-8901',
      phoneE164: '+15555678901', 
      active: true,
      createdAt: new Date().toISOString()
    }
  ]
  
  const state = {}
  
  // Store friends individually and in list
  for (const friend of sampleFriends) {
    state[`friends:${friend.id}`] = JSON.stringify(friend)
    state[`friendsByPhone:${friend.phoneE164}`] = JSON.stringify({ friendId: friend.id })
  }
  state['friends:list'] = JSON.stringify(sampleFriends)
  
  console.log(`✅ Created ${sampleFriends.length} friends`)
  return state
}

function createSessions() {
  console.log('📅 Creating sessions with proper list structure...')
  
  const today = new Date()
  const nextTuesday = new Date()
  nextTuesday.setDate(today.getDate() + (2 - today.getDay() + 7) % 7) // Next Tuesday
  const nextTuesdayStr = nextTuesday.toISOString().split('T')[0]
  
  const sampleSessions = [
    {
      id: 'session-1',
      date: nextTuesdayStr,
      startTime: '07:00',
      endTime: '09:00', 
      capacity: 3,
      status: 'published',
      location: 'Lake Tahoe - Emerald Bay',
      createdAt: new Date().toISOString()
    }
  ]
  
  const state = {}
  
  // Store sessions individually and in list
  for (const session of sampleSessions) {
    state[`sessions:${session.id}`] = JSON.stringify(session)
    state[`sessions:${session.date}`] = JSON.stringify(session)
  }
  state['sessions:list'] = JSON.stringify(sampleSessions)
  state['nextSession:current'] = JSON.stringify({ sessionId: sampleSessions[0].id })
  
  // Create empty bookings list
  state['bookings:list'] = JSON.stringify([])
  
  console.log(`✅ Created ${sampleSessions.length} sessions`)
  return state
}

function writeState(state) {
  console.log('💾 Writing state to file...')
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  console.log('✅ State written successfully')
}

function main() {
  console.log('🚀 Starting data reseed...')
  
  try {
    // Clear existing state
    clearState()
    
    // Create new state
    const friendsState = createFriends()
    const sessionsState = createSessions()
    
    // Combine and write
    const combinedState = { ...friendsState, ...sessionsState }
    writeState(combinedState)
    
    console.log('🎉 Data reseed completed successfully!')
    console.log('📊 State summary:')
    console.log(`   - Friends: ${Object.keys(friendsState).filter(k => k.startsWith('friends:') && !k.includes('list')).length}`)
    console.log(`   - Sessions: ${Object.keys(sessionsState).filter(k => k.startsWith('sessions:') && !k.includes('list')).length}`)
    console.log('   - Lists: friends:list, sessions:list')
    
  } catch (error) {
    console.error('❌ Error during reseed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }
