#!/usr/bin/env node

/**
 * Test script to verify environment configuration
 * Usage: node scripts/test-storage-connection.js
 */

require('dotenv').config()

function testConfiguration() {
  try {
    console.log('🔍 Testing configuration...\n')

    const storageType = process.env.STORAGE_TYPE || 's3'
    console.log(`📦 Storage Type: ${storageType}`)

    if (storageType === 's3') {
      // Check S3 environment variables
      const requiredVars = ['AWS_REGION', 'AWS_S3_BUCKET_NAME']
      const missingVars = requiredVars.filter(varName => !process.env[varName])
      
      if (missingVars.length > 0) {
        console.error('❌ Missing required S3 environment variables:')
        missingVars.forEach(varName => console.error(`   - ${varName}`))
        console.error('\nPlease check your .env file.')
        process.exit(1)
      }

      console.log('✅ S3 Environment variables found:')
      console.log(`   - AWS_REGION: ${process.env.AWS_REGION}`)
      console.log(`   - AWS_S3_BUCKET_NAME: ${process.env.AWS_S3_BUCKET_NAME}`)
      
      if (process.env.AWS_ACCESS_KEY_ID) {
        console.log(`   - AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 8)}...`)
      } else {
        console.log('   - AWS_ACCESS_KEY_ID: Using default credential chain')
      }
    } else if (storageType === 'local') {
      const storagePath = process.env.LOCAL_STORAGE_PATH || 'output'
      console.log('✅ Local Storage Configuration:')
      console.log(`   - LOCAL_STORAGE_PATH: ${storagePath}`)
    }

    console.log('\n🎉 Configuration looks good!')
    console.log('\n💡 To test the actual storage connection:')
    console.log('   1. Start the server: npm run dev')
    console.log('   2. Try uploading a small image via the API')
    console.log('   3. Check the server logs for any errors')

    console.log('\n📚 For more detailed testing:')
    console.log('   - Use the base64 converter: node scripts/convert-to-base64.js image.jpg')
    console.log('   - Test the upload endpoint with the generated JSON')

  } catch (error) {
    console.error('\n❌ Configuration test failed:')
    console.error(`   Error: ${error.message}`)
    process.exit(1)
  }
}

// Run the test
testConfiguration()