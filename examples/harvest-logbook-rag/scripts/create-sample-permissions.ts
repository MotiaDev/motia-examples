/**
 * Create Sample Permissions Script
 * Run this script to create sample organizations, farms, and user permissions
 *
 * Usage:
 *   npx tsx scripts/create-sample-permissions.ts
 *   npx tsx scripts/create-sample-permissions.ts --user user_bob --role viewer
 *   npx tsx scripts/create-sample-permissions.ts --user user_charlie --role editor --farm farm_2
 */

import { getSpiceDBService } from '../src/services/harvest-logbook/spicedb-service';
import 'dotenv/config';

interface ScriptOptions {
  userId: string;
  farmRole: 'owner' | 'editor' | 'viewer';
  orgRole?: 'admin' | 'member';
  orgId: string;
  farmId: string;
  setupOrg: boolean;
  setupFarm: boolean;
}

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    userId: 'user_alice',
    farmRole: 'owner',
    orgId: 'org_1',
    farmId: 'farm_1',
    setupOrg: true,
    setupFarm: true,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--user':
        options.userId = args[++i];
        options.setupOrg = false;
        options.setupFarm = false;
        break;
      case '--role':
        const role = args[++i];
        if (role !== 'owner' && role !== 'editor' && role !== 'viewer') {
          throw new Error(`Invalid role: ${role}. Must be owner, editor, or viewer`);
        }
        options.farmRole = role;
        break;
      case '--org-role':
        const orgRole = args[++i];
        if (orgRole !== 'admin' && orgRole !== 'member') {
          throw new Error(`Invalid org role: ${orgRole}. Must be admin or member`);
        }
        options.orgRole = orgRole;
        break;
      case '--org':
        options.orgId = args[++i];
        break;
      case '--farm':
        options.farmId = args[++i];
        break;
      case '--help':
        console.log(`
Usage: npx tsx scripts/create-sample-permissions.ts [options]

Options:
  --user <id>       User ID (default: user_alice)
  --role <role>     Farm role: owner, editor, or viewer (default: owner)
                    - owner: view, edit, query, manage
                    - editor: view, edit, query
                    - viewer: view, query only
  --org-role <role> Organization role: admin or member (optional)
  --org <id>        Organization ID (default: org_1)
  --farm <id>       Farm ID (default: farm_1)
  --help            Show this help message

Examples:
  # Create default setup (Alice as owner)
  npx tsx scripts/create-sample-permissions.ts

  # Add Bob as viewer (read-only)
  npx tsx scripts/create-sample-permissions.ts --user user_bob --role viewer

  # Add Charlie as editor
  npx tsx scripts/create-sample-permissions.ts --user user_charlie --role editor

  # Add David as member of organization
  npx tsx scripts/create-sample-permissions.ts --user user_david --role viewer --org-role member
`);
        process.exit(0);
    }
  }

  return options;
}

async function createSamplePermissions() {
  try {
    const options = parseArgs();

    console.log('🔐 Connecting to SpiceDB...');
    const spicedb = getSpiceDBService();

    // Create organization if this is the initial setup
    if (options.setupOrg) {
      console.log('\n📝 Creating sample organization...');
      await spicedb.createRelationship({
        subjectType: 'user',
        subjectId: options.userId,
        relation: 'admin',
        resourceType: 'organization',
        resourceId: options.orgId
      });
      console.log(`✅ Created: user:${options.userId} is admin of organization:${options.orgId}`);
    }

    // Create organization relationship for user if org-role is specified
    if (options.orgRole) {
      console.log('\n📝 Adding user to organization...');
      await spicedb.createRelationship({
        subjectType: 'user',
        subjectId: options.userId,
        relation: options.orgRole,
        resourceType: 'organization',
        resourceId: options.orgId
      });
      console.log(`✅ Created: user:${options.userId} is ${options.orgRole} of organization:${options.orgId}`);
    }

    // Create farm if this is the initial setup
    if (options.setupFarm) {
      console.log('\n📝 Creating sample farm...');
      await spicedb.createRelationship({
        subjectType: 'organization',
        subjectId: options.orgId,
        relation: 'organization',
        resourceType: 'farm',
        resourceId: options.farmId
      });
      console.log(`✅ Created: organization:${options.orgId} owns farm:${options.farmId}`);
    }

    // Add user to farm with specified role
    console.log(`\n📝 Adding user to farm as ${options.farmRole}...`);
    await spicedb.createRelationship({
      subjectType: 'user',
      subjectId: options.userId,
      relation: options.farmRole,
      resourceType: 'farm',
      resourceId: options.farmId
    });
    console.log(`✅ Created: user:${options.userId} is ${options.farmRole} of farm:${options.farmId}`);
    
    console.log('\n🔍 Verifying permissions...');

    // Check view permission
    const canView = await spicedb.checkPermission({
      userId: options.userId,
      resourceType: 'farm',
      resourceId: options.farmId,
      permission: 'view'
    });
    console.log(`Can user:${options.userId} view farm:${options.farmId}? ${canView ? '✅ Yes' : '❌ No'}`);

    // Check edit permission
    const canEdit = await spicedb.checkPermission({
      userId: options.userId,
      resourceType: 'farm',
      resourceId: options.farmId,
      permission: 'edit'
    });
    console.log(`Can user:${options.userId} edit farm:${options.farmId}? ${canEdit ? '✅ Yes' : '❌ No'}`);

    // Check query permission
    const canQuery = await spicedb.checkPermission({
      userId: options.userId,
      resourceType: 'farm',
      resourceId: options.farmId,
      permission: 'query'
    });
    console.log(`Can user:${options.userId} query farm:${options.farmId}? ${canQuery ? '✅ Yes' : '❌ No'}`);

    // Check manage permission
    const canManage = await spicedb.checkPermission({
      userId: options.userId,
      resourceType: 'farm',
      resourceId: options.farmId,
      permission: 'manage'
    });
    console.log(`Can user:${options.userId} manage farm:${options.farmId}? ${canManage ? '✅ Yes' : '❌ No'}`);

    console.log('\n✅ Sample permissions created successfully!');
    console.log('\n📖 You can now test the API with these credentials:');
    console.log(`   Header: x-user-id: ${options.userId}`);
    console.log(`   Body: { "farmId": "${options.farmId}", ... }`);

  } catch (error) {
    console.error('❌ Error creating sample permissions:', error);
    process.exit(1);
  }
}

createSamplePermissions();

