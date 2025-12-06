'use server'

import { query } from '@/adapters/postgres/database';
import { emitToPlayer } from '@/lib/socket-server';
import { rewardsList } from '@/lib/blockchain/rewards';

interface CompleteMintParams {
  taskId: string;
  objectId: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Delete a mint task after successful minting, or mark as failed
 * Called from the frontend after processing with user wallet
 */
export async function POST(request: Request) {
  try {
    const body: CompleteMintParams = await request.json();
    const { taskId, objectId, success, errorMessage } = body;

    if (!taskId) {
      return Response.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    if (success) {
      // Get task info before deleting (for socket event)
      const taskResult = await query(
        `SELECT reward_type, player_sui_address FROM mint_queue WHERE id = $1`,
        [taskId]
      );

      const task = taskResult.rows[0];
      const rewardType = task?.reward_type;
      const playerSuiAddress = task?.player_sui_address;

      // Find reward name for notification
      const reward = rewardsList.find(r => r.nft.badge_type === rewardType);
      const rewardName = reward?.nft.name || rewardType;

      // Delete the task after successful minting
      // The reward is already saved in the rewards table, so we don't need the queue item anymore
      await query(
        `DELETE FROM mint_queue WHERE id = $1`,
        [taskId]
      );

      // Emit socket event to notify client about successful mint
      if (playerSuiAddress) {
        try {
          emitToPlayer(playerSuiAddress, 'mint-completed', {
            taskId,
            rewardType,
            rewardName,
            objectId: objectId || null,
          });
        } catch (error) {
          // Don't fail if socket fails
        }
      }

      return Response.json({
        success: true,
        message: 'Task deleted after successful mint',
      });
    } else {
      // Mark as failed (keep for debugging/retry purposes)
      await query(
        `UPDATE mint_queue 
         SET status = 'failed', 
             error_message = $2,
             processed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [taskId, errorMessage || 'Unknown error']
      );

      return Response.json({
        success: true,
        message: 'Task marked as failed',
      });
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

