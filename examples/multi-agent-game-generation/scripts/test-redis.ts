/**
 * Test script to verify Redis adapter connections
 * Run with: npx ts-node scripts/test-redis.ts
 */
import { RedisStateAdapter } from '@motiadev/adapter-redis-state'
import { RedisCronAdapter } from '@motiadev/adapter-redis-cron'
import { RedisStreamAdapterManager } from '@motiadev/adapter-redis-streams'

async function testRedisAdapters() {
  console.log('🧪 Testing Redis Adapters...\n')

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    database: 0,
  }

  console.log('📡 Redis Config:', redisConfig)
  console.log('')

  // Test 1: State Adapter
  console.log('1️⃣ Testing RedisStateAdapter...')
  try {
    const stateAdapter = new RedisStateAdapter(
      redisConfig,
      {
        keyPrefix: 'test:state:',
        ttl: 60,
      }
    )

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('   ✅ RedisStateAdapter created successfully')
  } catch (error: any) {
    console.log('   ❌ RedisStateAdapter failed:', error.message)
  }

  // Test 2: Cron Adapter
  console.log('\n2️⃣ Testing RedisCronAdapter...')
  try {
    const cronAdapter = new RedisCronAdapter(
      redisConfig,
      {
        keyPrefix: 'test:cron:',
        lockTTL: 30000,
      }
    )

    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('   ✅ RedisCronAdapter created successfully')
  } catch (error: any) {
    console.log('   ❌ RedisCronAdapter failed:', error.message)
  }

  // Test 3: Stream Adapter
  console.log('\n3️⃣ Testing RedisStreamAdapterManager...')
  try {
    const streamAdapter = new RedisStreamAdapterManager(redisConfig)

    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('   ✅ RedisStreamAdapterManager created successfully')
  } catch (error: any) {
    console.log('   ❌ RedisStreamAdapterManager failed:', error.message)
  }

  console.log('\n✨ Redis adapter tests completed!\n')
  process.exit(0)
}

testRedisAdapters().catch(error => {
  console.error('\n💥 Test failed:', error)
  process.exit(1)
})

