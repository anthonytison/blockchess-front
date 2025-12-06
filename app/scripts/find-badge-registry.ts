#!/usr/bin/env tsx
/**
 * Utility script to find the BadgeRegistry object ID from a published package
 * 
 * Usage:
 *   tsx scripts/find-badge-registry.ts <package-id> [network]
 * 
 * Example:
 *   tsx scripts/find-badge-registry.ts 0x39c62a7fc9e67b3642f110991315d68bba52d8020c1e6600bcedccdfc6991edb localnet
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const networkType = process.argv[3] || process.env.NEXT_PUBLIC_SUI_NETWORK_TYPE || 'localnet';
const packageId = process.argv[2];

if (!packageId) {
  console.error('Error: Package ID is required');
  console.error('Usage: tsx scripts/find-badge-registry.ts <package-id> [network]');
  process.exit(1);
}

async function findBadgeRegistry() {
  const suiClient = new SuiClient({ url: getFullnodeUrl(networkType as any) });

  try {
    console.log(`Searching for BadgeRegistry for package ${packageId} on ${networkType}...`);

    // Get package information
    const packageObject = await suiClient.getObject({
      id: packageId,
      options: {
        showType: true,
        showOwner: true,
        showPreviousTransaction: true,
      },
    });

    if (!packageObject.data) {
      throw new Error(`Package ${packageId} not found on ${networkType}`);
    }

    // Get the publish transaction
    const publishTxDigest = packageObject.data.previousTransaction;
    if (!publishTxDigest) {
      throw new Error('Could not find publish transaction for package');
    }

    console.log(`Found publish transaction: ${publishTxDigest}`);

    // Get transaction details
    const txResponse = await suiClient.getTransactionBlock({
      digest: publishTxDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showInput: false,
      },
    });

    // Find the BadgeRegistry shared object in the created objects
    const badgeRegistryType = `${packageId}::badge::BadgeRegistry`;
    const createdObjects = txResponse.objectChanges?.filter(
      (change: any) => 
        change.type === 'created' && 
        change.objectType === badgeRegistryType
    );

    if (createdObjects && createdObjects.length > 0) {
      const registryId = (createdObjects[0] as any).objectId;
      console.log('\n✅ Found BadgeRegistry object ID:');
      console.log(registryId);
      console.log('\nAdd this to your .env file:');
      console.log(`NEXT_PUBLIC_SUI_NETWORK_${networkType.toUpperCase()}_BADGE_REGISTRY_ID=${registryId}`);
      return registryId;
    }

    // If not found in created objects, try to find it in published objects
    const publishedObjects = txResponse.objectChanges?.filter(
      (change: any) => 
        change.type === 'published' &&
        change.packageId === packageId
    );

    if (publishedObjects && publishedObjects.length > 0) {
      // Try to query for shared objects of type BadgeRegistry
      console.log('BadgeRegistry not found in transaction changes. Querying for shared objects...');
      
      // Query events to find BadgeRegistry creation
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${packageId}::badge::BadgeMinted`,
        },
        limit: 1,
        order: 'ascending',
      });

      // Alternative: Query all objects and filter by type
      // Note: This is a workaround - ideally we'd query by object type directly
      console.log('\n⚠️  BadgeRegistry not found in publish transaction.');
      console.log('You may need to find it manually by:');
      console.log(`1. Check the publish transaction: sui client transaction ${publishTxDigest}`);
      console.log('2. Look for a shared object of type BadgeRegistry in the "Created Objects" section');
      console.log('3. Or query the package owner address for shared objects');
      
      return null;
    }

    throw new Error('BadgeRegistry object not found in publish transaction');
  } catch (error: any) {
    console.error('Error finding BadgeRegistry:', error.message);
    console.error('\nAlternative methods to find BadgeRegistry:');
    console.log('1. Check the publish transaction output when you published the package');
    console.log('2. Use: sui client transaction <publish-tx-digest>');
    console.log('3. Look for "Created Objects" with type BadgeRegistry');
    process.exit(1);
  }
}

findBadgeRegistry()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

