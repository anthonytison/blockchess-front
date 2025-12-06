/**
 * Utility functions for finding and working with BadgeRegistry objects
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

/**
 * Find the BadgeRegistry object ID from a published package
 * The BadgeRegistry is created as a shared object during package initialization
 * 
 * @param packageId The package ID
 * @param networkType The network type (localnet, testnet, mainnet, devnet)
 * @returns The BadgeRegistry object ID, or null if not found
 */
export async function findBadgeRegistryId(
  packageId: string,
  networkType: string = 'localnet'
): Promise<string | null> {
  const suiClient = new SuiClient({ url: getFullnodeUrl(networkType as any) });

  try {
    // Get package information
    const packageObject = await suiClient.getObject({
      id: packageId,
      options: {
        showPreviousTransaction: true,
      },
    });

    if (!packageObject.data?.previousTransaction) {
      return null;
    }

    const publishTxDigest = packageObject.data.previousTransaction;

    // Get transaction details
    const txResponse = await suiClient.getTransactionBlock({
      digest: publishTxDigest,
      options: {
        showObjectChanges: true,
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
      return (createdObjects[0] as any).objectId;
    }

    return null;
  } catch (error) {
    console.error('Error finding BadgeRegistry:', error);
    return null;
  }
}

/**
 * Get BadgeRegistry ID with fallback to finding it from package
 * 
 * @param packageId The package ID
 * @param networkType The network type
 * @param envRegistryId The BadgeRegistry ID from environment variable (if set)
 * @returns The BadgeRegistry object ID
 */
export async function getBadgeRegistryId(
  packageId: string,
  networkType: string = 'localnet',
  envRegistryId?: string
): Promise<string> {
  // First, try environment variable
  if (envRegistryId) {
    return envRegistryId;
  }

  // If not set, try to find it from the package
  const foundId = await findBadgeRegistryId(packageId, networkType);
  if (foundId) {
    return foundId;
  }

  throw new Error(
    `BadgeRegistry object ID not found. ` +
    `Please set NEXT_PUBLIC_SUI_NETWORK_${networkType.toUpperCase()}_BADGE_REGISTRY_ID environment variable. ` +
    `You can find it by checking the package publish transaction or using the find-badge-registry.ts script.`
  );
}

