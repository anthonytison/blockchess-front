import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { query } from '@/adapters/postgres/database';
import { checkRewardExists } from '@/app/actions/reward';
import { rewardsList } from '@/lib/blockchain/rewards';
import { randomUUID } from 'crypto';

let io: SocketIOServer | null = null;

// Track processing sessions per player to avoid duplicate processing
const processingSessions = new Map<string, boolean>();

// Get queue delay from environment variable (default 5 seconds)
const QUEUE_DELAY_MS = parseInt(process.env.MINT_QUEUE_DELAY_MS || '5000', 10);

/**
 * Initialize Socket.io server
 * This should be called from a custom Next.js server or API route
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3050",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: '/api/socket.io',
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
    });

    // Join room for a specific player
    socket.on('join-player-room', async (playerSuiAddress: string) => {
      socket.join(`player:${playerSuiAddress}`);

      // Get all pending tasks for this player
      const tasks = await query(
        `SELECT id, reward_type, player_id, player_sui_address FROM mint_queue WHERE player_sui_address = $1`,
        [playerSuiAddress]
      );

      
    });

    // Leave room
    socket.on('leave-player-room', (playerSuiAddress: string) => {
      socket.leave(`player:${playerSuiAddress}`);

      // delete all pending task promises for this player
      pendingTaskPromises.delete(playerSuiAddress);

      // delete all processing sessions for this player
      processingSessions.delete(playerSuiAddress);
    });

    // Handle mint request from client
    socket.on('request-mint', async (data: {
      rewardType: string;
      playerId: string;
      playerSuiAddress: string;
    }) => {

      try {
        // Check if reward already exists to avoid duplicates
        const rewardCheck = await checkRewardExists({
          playerId: data.playerId,
          rewardType: data.rewardType,
        });

        // For wins type, we allow enqueueing even if some wins rewards exist
        if (data.rewardType !== 'wins' && rewardCheck.exists) {
          socket.emit('mint-error', {
            error: `Reward ${data.rewardType} already exists for this player`,
            rewardType: data.rewardType,
          });
          return;
        }

        // Check if there's already a pending task for this reward type and player
        const existingTask = await query(
          `SELECT id FROM mint_queue 
           WHERE player_id = $1 
           AND reward_type = $2 
           AND status IN ('pending', 'processing')
           LIMIT 1`,
          [data.playerId, data.rewardType]
        );

        if (existingTask.rows.length > 0) {
          socket.emit('mint-error', {
            error: `Mint task already queued for ${data.rewardType}`,
            rewardType: data.rewardType,
          });
          return;
        }

        // Insert new task
        const taskId = randomUUID();
        await query(
          `INSERT INTO mint_queue (id, reward_type, player_id, player_sui_address, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())`,
          [taskId, data.rewardType, data.playerId, data.playerSuiAddress]
        );

        // Check if there's already a processing session for this player
        if (!processingSessions.get(data.playerSuiAddress)) {
          // Start processing all pending tasks for this player
          processingSessions.set(data.playerSuiAddress, true);
          
          // Wait for the delay, then process all pending tasks
          setTimeout(async () => {
            await processAllPendingTasks(data.playerSuiAddress);
            processingSessions.delete(data.playerSuiAddress);
          }, QUEUE_DELAY_MS);
        }
      } catch (error) {
        socket.emit('mint-error', {
          error: error instanceof Error ? error.message : 'Failed to process mint request',
          rewardType: data.rewardType,
        });
      }
    });

    // Handle mint completion from client
    socket.on('mint-completed', async (data: {
      taskId: string;
      objectId: string;
      success: boolean;
      errorMessage?: string;
    }) => {

      try {
        if (data.success) {
          // Get task info before deleting (for notification)
          const taskResult = await query(
            `SELECT reward_type, player_sui_address FROM mint_queue WHERE id = $1`,
            [data.taskId]
          );

          const task = taskResult.rows[0];
          if (!task) {
            // Try to find and resolve promise by checking all pending promises
            for (const [address, promise] of pendingTaskPromises.entries()) {
              if (promise.taskId === data.taskId) {
                promise.resolve();
                pendingTaskPromises.delete(address);
                break;
              }
            }
            return;
          }

          const rewardType = task.reward_type;
          const playerSuiAddress = task.player_sui_address;

          // Find reward name for notification
          const reward = rewardsList.find(r => r.nft.badge_type === rewardType);
          const rewardName = reward?.nft.name || rewardType;

          // Delete the task after successful minting
          await query(
            `DELETE FROM mint_queue WHERE id = $1`,
            [data.taskId]
          );

          // Resolve the promise to continue processing the next task
          const promise = pendingTaskPromises.get(playerSuiAddress);
          if (promise && promise.taskId === data.taskId) {
            promise.resolve();
            pendingTaskPromises.delete(playerSuiAddress);
          }
        } else {
          // Mark as failed (keep for debugging/retry purposes)
          const taskResult = await query(
            `SELECT player_sui_address FROM mint_queue WHERE id = $1`,
            [data.taskId]
          );
          const playerSuiAddress = taskResult.rows[0]?.player_sui_address;

          await query(
            `UPDATE mint_queue 
             SET status = 'failed', 
                 error_message = $2,
                 processed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1`,
            [data.taskId, data.errorMessage || 'Unknown error']
          );

          // Resolve the promise to continue processing the next task even on failure
          if (playerSuiAddress) {
            const promise = pendingTaskPromises.get(playerSuiAddress);
            if (promise && promise.taskId === data.taskId) {
              promise.resolve();
              pendingTaskPromises.delete(playerSuiAddress);
            }
          }
        }
      } catch (error) {
        // Try to resolve promise on error to prevent blocking
        const taskResult = await query(
          `SELECT player_sui_address FROM mint_queue WHERE id = $1`,
          [data.taskId]
        ).catch(() => ({ rows: [] }));
        const playerSuiAddress = taskResult.rows[0]?.player_sui_address;
        if (playerSuiAddress) {
          const promise = pendingTaskPromises.get(playerSuiAddress);
          if (promise && promise.taskId === data.taskId) {
            promise.resolve();
            pendingTaskPromises.delete(playerSuiAddress);
          }
        }
      }
    });
  });

  return io;
}

// Track pending task processing per player
const pendingTaskPromises = new Map<string, { resolve: () => void; taskId: string }>();



/**
 * Process all pending tasks for a player sequentially
 * Waits for each task to complete before processing the next one
 */
async function processAllPendingTasks(playerSuiAddress: string) {
  try {
    while (true) {
      // Get the next pending task for this player
      const tasksResult = await query(
        `SELECT id, reward_type, player_id, player_sui_address
         FROM mint_queue
         WHERE player_sui_address = $1
         AND status = 'pending'
         ORDER BY created_at ASC
         LIMIT 1`,
        [playerSuiAddress]
      );

      if (tasksResult.rows.length === 0) {
        break;
      }

      const task = tasksResult.rows[0];

      // Mark task as processing
      await query(
        `UPDATE mint_queue 
         SET status = 'processing', updated_at = NOW()
         WHERE id = $1`,
        [task.id]
      );

      // Emit mint-now event for this task
      emitToPlayer(playerSuiAddress, 'mint-now', {
        taskId: task.id,
        rewardType: task.reward_type,
        playerId: task.player_id,
        playerSuiAddress: task.player_sui_address,
      });

      // Wait for the client to complete this task
      // The client will emit 'mint-completed' which will resolve this promise
      await new Promise<void>((resolve) => {
        pendingTaskPromises.set(playerSuiAddress, { resolve, taskId: task.id });

        // Timeout after 60 seconds to prevent infinite waiting
        setTimeout(() => {
          if (pendingTaskPromises.has(playerSuiAddress)) {
            pendingTaskPromises.delete(playerSuiAddress);
            resolve();
          }
        }, 60000);
      });

      // Small delay before processing next task
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    processingSessions.delete(playerSuiAddress);
    pendingTaskPromises.delete(playerSuiAddress);
  } finally {
    processingSessions.delete(playerSuiAddress);
    pendingTaskPromises.delete(playerSuiAddress);
  }
}

/**
 * Get the Socket.io server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Emit event to a specific player
 */
export function emitToPlayer(playerSuiAddress: string, event: string, data: any) {
  if (!io) {
    return;
  }

  io.to(`player:${playerSuiAddress}`).emit(event, data);
}

