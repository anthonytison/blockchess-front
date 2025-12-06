'use server'

import { query } from '@/adapters/postgres/database';

interface PendingMintTask {
  id: string;
  reward_type: string;
  player_id: string;
  player_sui_address: string;
  created_at: string;
}

/**
 * Get pending mint tasks for a specific user
 * This endpoint is called from the frontend to get tasks that need user wallet signing
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerSuiAddress = searchParams.get('playerSuiAddress');
    
    if (!playerSuiAddress) {
      return Response.json(
        { error: 'playerSuiAddress query parameter is required' },
        { status: 400 }
      );
    }

    // Get pending tasks for this user
    // Also include "processing" tasks that are older than 5 minutes (stuck tasks)
    const tasksResult = await query(
      `SELECT id, reward_type, player_id, player_sui_address, created_at
       FROM mint_queue
       WHERE player_sui_address = $1
       AND (
         status = 'pending'
         OR (status = 'processing' AND updated_at < NOW() - INTERVAL '5 minutes')
       )
       ORDER BY created_at ASC
       LIMIT 10`,
      [playerSuiAddress]
    );

    const tasks: PendingMintTask[] = tasksResult.rows.map((row: any) => ({
      id: row.id,
      reward_type: row.reward_type,
      player_id: row.player_id,
      player_sui_address: row.player_sui_address,
      created_at: row.created_at,
    }));

    return Response.json({
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

