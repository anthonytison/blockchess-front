'use server'

import { query } from '@/adapters/postgres/database';
import { shouldEarnReward, saveReward } from '@/app/actions/reward';
import { rewardsList } from '@/lib/blockchain/rewards';
import { mintNftTransaction } from '@/lib/sui-transactions';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

interface MintTask {
  id: string;
  reward_type: string;
  player_id: string;
  player_sui_address: string;
  retries: number;
  max_retries: number;
}

/**
 * Mark a task as processing (PATCH)
 * Called from frontend before processing with user wallet
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { taskId, status } = body;

    if (!taskId || !status) {
      return Response.json(
        { error: 'taskId and status are required' },
        { status: 400 }
      );
    }

    if (status !== 'processing') {
      return Response.json(
        { error: 'Status must be "processing"' },
        { status: 400 }
      );
    }

    await query(
      `UPDATE mint_queue 
       SET status = 'processing', updated_at = NOW()
       WHERE id = $1`,
      [taskId]
    );

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Process pending mint tasks from the queue
 * DEPRECATED: This endpoint used server-side signing which requires server wallet funding.
 * Use the frontend mint queue provider instead, which processes tasks with user wallets.
 * This endpoint is kept for backward compatibility but should not be used.
 */
export async function POST(request: Request) {
  try {
    // Get pending tasks (limit to prevent overload)
    const tasksResult = await query(
      `SELECT id, reward_type, player_id, player_sui_address, retries, max_retries
       FROM mint_queue
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 10
       FOR UPDATE SKIP LOCKED`,
      []
    );

    if (tasksResult.rows.length === 0) {
      return Response.json({ processed: 0, message: 'No pending tasks' });
    }

    const tasks: MintTask[] = tasksResult.rows;
    let processed = 0;
    let failed = 0;

    // Determine network type (must match sui-transactions.ts logic)
    const networkType = process.env.NEXT_PUBLIC_SUI_NETWORK_TYPE || 'localnet';
    
    // Get package ID based on network type (must match sui-transactions.ts logic)
    let packageId: string;
    let badgeRegistryId: string;
    switch (networkType) {
      case 'devnet':
        packageId = process.env.NEXT_PUBLIC_SUI_NETWORK_DEVNET_PACKAGE_ID as string;
        badgeRegistryId = process.env.NEXT_PUBLIC_SUI_NETWORK_DEVNET_BADGE_REGISTRY_ID || '';
        break;
      case 'testnet':
        packageId = process.env.NEXT_PUBLIC_SUI_NETWORK_TESTNET_PACKAGE_ID as string;
        badgeRegistryId = process.env.NEXT_PUBLIC_SUI_NETWORK_TESTNET_BADGE_REGISTRY_ID || '';
        break;
      case 'mainnet':
        packageId = process.env.NEXT_PUBLIC_SUI_NETWORK_MAINNET_PACKAGE_ID as string;
        badgeRegistryId = process.env.NEXT_PUBLIC_SUI_NETWORK_MAINNET_BADGE_REGISTRY_ID || '';
        break;
      default:
        packageId = process.env.NEXT_PUBLIC_SUI_NETWORK_LOCALNET_PACKAGE_ID as string;
        badgeRegistryId = process.env.NEXT_PUBLIC_SUI_NETWORK_LOCALNET_BADGE_REGISTRY_ID || '';
    }
    
    if (!packageId) {
      throw new Error(`Package ID not set for network type: ${networkType}. Please set the appropriate NEXT_PUBLIC_SUI_NETWORK_${networkType.toUpperCase()}_PACKAGE_ID environment variable.`);
    }

    if (!badgeRegistryId) {
      throw new Error(
        `BadgeRegistry object ID not set for network type: ${networkType}. ` +
        `Please set NEXT_PUBLIC_SUI_NETWORK_${networkType.toUpperCase()}_BADGE_REGISTRY_ID environment variable. ` +
        `You can find it by: 1) Checking the package publish transaction output, ` +
        `2) Using: sui client transaction <publish-tx-digest>, ` +
        `3) Running: tsx scripts/find-badge-registry.ts ${packageId} ${networkType}`
      );
    }
    
    // Get Sui client - use networkType to ensure consistency
    const suiClient = new SuiClient({ url: getFullnodeUrl(networkType as any) });
    
    // Get private key from environment (for server-side signing)
    const privateKey = process.env.SUI_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('SUI_PRIVATE_KEY environment variable not set');
    }
    
    // Decode the base64 private key
    const decodedKey = fromB64(privateKey);
    
    // Ed25519Keypair.fromSecretKey expects exactly 32 bytes
    // Handle different key formats: 32 bytes (secret only), 48 bytes (secret + metadata), or 64 bytes (full keypair)
    let secretKey: Uint8Array;
    if (decodedKey.length === 32) {
      secretKey = decodedKey;
    } else if (decodedKey.length >= 32) {
      // Extract first 32 bytes (the secret key)
      secretKey = decodedKey.slice(0, 32);
    } else {
      throw new Error(`Invalid private key length: expected at least 32 bytes, got ${decodedKey.length}`);
    }
    
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const signerAddress = keypair.toSuiAddress();
    
    // Check gas balance before processing transactions
    try {
      const coins = await suiClient.getCoins({
        owner: signerAddress,
        coinType: '0x2::sui::SUI',
      });
      
      if (coins.data.length === 0) {
        throw new Error(
          `No SUI coins found for signer address ${signerAddress} on ${networkType} network. ` +
          `Please fund this account with SUI tokens to pay for gas fees. ` +
          `For testnet, you can get test SUI from: https://discord.com/channels/916379725201563759/971488439931392130`
        );
      }
      
      // Calculate total balance
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    } catch (balanceError: any) {
      const balanceErrorMessage = balanceError?.message || balanceError?.toString() || 'Unknown error';
      if (balanceErrorMessage.includes('No SUI coins found')) {
        throw balanceError;
      }
    }

    for (const task of tasks) {
      try {
        // Mark task as processing
        await query(
          `UPDATE mint_queue 
           SET status = 'processing', updated_at = NOW()
           WHERE id = $1`,
          [task.id]
        );

        // Check if reward should be earned
        const rewardToEarn = await shouldEarnReward(task.player_sui_address, task.reward_type);
        
        if (!rewardToEarn) {
          // Reward already earned or not eligible
          await query(
            `UPDATE mint_queue 
             SET status = 'completed', updated_at = NOW(), processed_at = NOW()
             WHERE id = $1`,
            [task.id]
          );
          processed++;
          continue;
        }

        // Find reward config
        const reward = rewardsList.find(r => r.nft.badge_type === rewardToEarn);
        if (!reward) {
          throw new Error(`Reward config not found for badge_type: ${rewardToEarn}`);
        }

        // Create and execute mint transaction
        // Pass badgeRegistryId explicitly to ensure it's used
        const transaction = mintNftTransaction(reward.nft, task.player_sui_address, badgeRegistryId);
        
        // Sign and execute transaction
        let result;
        try {
          result = await suiClient.signAndExecuteTransaction({
            signer: keypair,
            transaction,
            options: {
              showEffects: true,
              showObjectChanges: true,
            },
          });
        } catch (txError: any) {
          const txErrorMessage = txError?.message || txError?.toString() || 'Unknown transaction error';
          
          // Check for gas-related errors
          if (txErrorMessage.includes('No valid gas coins') || txErrorMessage.includes('gas coins') || txErrorMessage.includes('insufficient gas')) {
            const enhancedError = new Error(
              `Insufficient gas for transaction. ` +
              `Signer address: ${signerAddress}. ` +
              `Network: ${networkType}. ` +
              `Please fund this account with SUI tokens. ` +
              `For testnet, get test SUI from: https://discord.com/channels/916379725201563759/971488439931392130 ` +
              `Original error: ${txErrorMessage}`
            );
            throw enhancedError;
          }
          
          // Check for package-related errors
          if (txErrorMessage.includes('Dependent package not found') || txErrorMessage.includes('package not found')) {
            const enhancedError = new Error(
              `Package not found on ${networkType} network. ` +
              `Package ID: ${packageId}. ` +
              `Please verify: 1) The package is published to ${networkType}, ` +
              `2) NEXT_PUBLIC_SUI_NETWORK_TYPE=${networkType} matches your network, ` +
              `3) NEXT_PUBLIC_SUI_NETWORK_${networkType.toUpperCase()}_PACKAGE_ID is set correctly. ` +
              `Original error: ${txErrorMessage}`
            );
            throw enhancedError;
          }
          throw txError;
        }

        // Wait for transaction to be indexed
        let objectId: string | undefined;
        const maxRetries = 15;
        const delay = 1000;
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            const txResponse = await suiClient.getTransactionBlock({
              digest: result.digest,
              options: {
                showEffects: true,
                showObjectChanges: true,
              },
            });

            // Extract object ID from transaction result
            const createdChange = txResponse.objectChanges?.find(
              (change: any) => change.type === 'created' && change.objectType?.includes('badge::Badge')
            );
            if (createdChange && 'objectId' in createdChange) {
              objectId = createdChange.objectId as string;
            }

            if (objectId) {
              break;
            }
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        if (!objectId) {
          throw new Error('Badge object ID not found in transaction result');
        }

        // Save reward to database
        await saveReward({
          type: rewardToEarn,
          playerId: task.player_id,
          objectId: objectId as string,
        });

        // Mark task as completed
        await query(
          `UPDATE mint_queue 
           SET status = 'completed', updated_at = NOW(), processed_at = NOW()
           WHERE id = $1`,
          [task.id]
        );

        processed++;
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';

        // Check if we should retry
        if (task.retries < task.max_retries) {
          // Retry - mark as pending again
          await query(
            `UPDATE mint_queue 
             SET status = 'pending', retries = retries + 1, error_message = $2, updated_at = NOW()
             WHERE id = $1`,
            [task.id, errorMessage]
          );
        } else {
          // Max retries reached - mark as failed
          await query(
            `UPDATE mint_queue 
             SET status = 'failed', error_message = $2, updated_at = NOW(), processed_at = NOW()
             WHERE id = $1`,
            [task.id, errorMessage]
          );
          failed++;
        }
      }
    }

    return Response.json({
      processed,
      failed,
      total: tasks.length,
      message: `Processed ${processed} tasks, ${failed} failed`,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

