/**
 * Quick script to get your service account email
 * Run: npx tsx scripts/get-service-account-email.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local if it exists
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config() // Also try default .env

const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL

if (serviceAccountJson) {
  try {
    const parsed = JSON.parse(serviceAccountJson)
    console.log('\n✅ Service Account Email:')
    console.log(`   ${parsed.client_email}\n`)
    console.log('📋 Copy this email and share your calendars with it.\n')
  } catch (error) {
    console.error('❌ Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:', error)
  }
} else if (clientEmail) {
  console.log('\n✅ Service Account Email:')
  console.log(`   ${clientEmail}\n`)
  console.log('📋 Copy this email and share your calendars with it.\n')
} else {
  console.error('\n❌ No service account credentials found.')
  console.error('   Set either GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CLIENT_EMAIL\n')
}


