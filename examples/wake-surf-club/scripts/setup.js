#!/usr/bin/env node

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

console.log('🏄‍♂️ Tuesday WakeSurf Club Setup')
console.log('================================\n')

// Generate a secure JWT secret
const jwtSecret = crypto.randomBytes(32).toString('hex')
console.log('✅ Generated JWT secret')

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '..', '.env')
const envExamplePath = path.join(__dirname, '..', 'env.example')

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, 'utf8')
    envContent = envContent.replace('your-super-secure-secret-key-here', jwtSecret)
    fs.writeFileSync(envPath, envContent)
    console.log('✅ Created .env file with generated JWT secret')
  } else {
    const defaultEnv = `# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890

# JWT Signing Secret (generated)
HOST_SIGNING_SECRET=${jwtSecret}

# Public App URL (for generating links in SMS)
PUBLIC_APP_URL=http://localhost:3000

# Timezone (default: America/Chicago)
TIMEZONE=America/Chicago
`
    fs.writeFileSync(envPath, defaultEnv)
    console.log('✅ Created .env file with default configuration')
  }
} else {
  console.log('ℹ️  .env file already exists')
}

console.log('\n📋 Next Steps:')
console.log('1. Edit .env file with your Twilio credentials')
console.log('2. Run: pnpm install')
console.log('3. Run: pnpm dev:full')
console.log('4. Visit: http://localhost:3000')
console.log('\n🔑 Your JWT Secret (save this!):')
console.log(jwtSecret)
console.log('\n📱 For testing SMS, use Twilio sandbox numbers')
console.log('🎉 Happy surfing!')
