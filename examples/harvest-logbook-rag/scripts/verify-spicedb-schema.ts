/**
 * Verify SpiceDB Schema Script
 * Run this script to verify the SpiceDB schema is correctly installed
 *
 * Usage: npx tsx scripts/verify-spicedb-schema.ts
 */

import { getSpiceDBService } from '../src/services/harvest-logbook/spicedb-service';
import 'dotenv/config';

async function verifySchema() {
  try {
    console.log('🔐 Connecting to SpiceDB...');
    const spicedb = getSpiceDBService();

    console.log('📥 Reading schema from SpiceDB...');
    const schema = await spicedb.readSchema();

    console.log('\n✅ Current Schema:');
    console.log('━'.repeat(80));
    console.log(schema);
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('❌ Error reading schema:', error);
    process.exit(1);
  }
}

verifySchema();
