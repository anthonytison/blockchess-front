'use server'

import { query } from '@/adapters/postgres/database';
import { checkRewardExists } from './reward';
import { randomUUID } from 'crypto';
import { emitToPlayer } from '@/lib/socket-server';

export interface EnqueueMintParams {
  rewardType: string;
  playerId: string;
  playerSuiAddress: string;
}

export interface EnqueueMintResponse {
  success: boolean;
  taskId?: string;
  message?: string;
}

/**
 * Enqueue a mint task to the server-side queue
 */
export const enqueueMint = async (
  params: EnqueueMintParams
): Promise<EnqueueMintResponse> => {
  try {
    // Check if reward already exists to avoid duplicates
    const rewardCheck = await checkRewardExists({
      playerId: params.playerId,
      rewardType: params.rewardType,
    });

    // For wins type, we allow enqueueing even if some wins rewards exist
    // (the processor will determine which specific reward to mint)
    if (params.rewardType !== 'wins' && rewardCheck.exists) {
      return {
        success: false,
        message: `Reward ${params.rewardType} already exists for this player`,
      };
    }

    // Check if there's already a pending task for this reward type and player
    const existingTask = await query(
      `SELECT id FROM mint_queue 
       WHERE player_id = $1 
       AND reward_type = $2 
       AND status IN ('pending', 'processing')
       LIMIT 1`,
      [params.playerId, params.rewardType]
    );

    if (existingTask.rows.length > 0) {
      return {
        success: false,
        message: `Mint task already queued for ${params.rewardType}`,
      };
    }

    // Insert new task
    const taskId = randomUUID();
    await query(
      `INSERT INTO mint_queue (id, reward_type, player_id, player_sui_address, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())`,
      [taskId, params.rewardType, params.playerId, params.playerSuiAddress]
    );

    // Emit socket event to notify client about new mint task with full task data
    try {
      emitToPlayer(params.playerSuiAddress, 'mint-task-queued', {
        taskId,
        rewardType: params.rewardType,
        playerId: params.playerId,
        playerSuiAddress: params.playerSuiAddress,
      });
    } catch (error) {
      // Don't fail the enqueue if socket fails
    }

    return {
      success: true,
      taskId,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to enqueue mint',
    };
  }
};

export interface GetQueueStatusParams {
  playerId: string;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

/**
 * Get queue status for a player
 */
export const getQueueStatus = async (
  params: GetQueueStatusParams
): Promise<QueueStatus> => {
  try {
    const result = await query(
      `SELECT status, COUNT(*) as count
       FROM mint_queue
       WHERE player_id = $1
       GROUP BY status`,
      [params.playerId]
    );

    const status: QueueStatus = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    result.rows.forEach((row: any) => {
      const count = parseInt(row.count, 10);
      status[row.status as keyof QueueStatus] = count;
    });

    return status;
  } catch (error) {
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
  }
};

