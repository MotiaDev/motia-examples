/**
 * Setup SpiceDB Schema Script
 * Run this script to initialize the SpiceDB schema
 *
 * Usage: npx tsx scripts/setup-spicedb-schema.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { getSpiceDBService } from '../src/services/harvest-logbook/spicedb-service';
import 'dotenv/config';

async function setupSchema() {
  try {
    console.log('📝 Reading schema file...');
    const schemaPath = path.join(__dirname, '../src/services/harvest-logbook/spicedb.schema');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('🔐 Connecting to SpiceDB...');
    const spicedb = getSpiceDBService();

    console.log('📤 Writing schema to SpiceDB...');
    await spicedb.writeSchema(schema);

    console.log('✅ Schema successfully written to SpiceDB!');
    console.log('\n📖 You can now verify the schema with:');
    console.log('   npx tsx scripts/verify-spicedb-schema.ts');

  } catch (error) {
    console.error('❌ Error setting up schema:', error);
    process.exit(1);
  }
}

setupSchema();
