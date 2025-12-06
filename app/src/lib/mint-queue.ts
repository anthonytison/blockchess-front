// Persistent mint queue service with localStorage
// Survives page reloads and processes mints sequentially
// Part of the infrastructure layer

import { PlayerEntity } from '@/domain/entities';

interface MintTask {
  id: string;
  type: string;
  player: PlayerEntity;
  timestamp: number;
  retries: number;
}

export type MintFunction = (type: string, player: PlayerEntity | null) => Promise<string>;

class MintQueue {
  private maxRetries = 3;
  private delayBetweenMints = 1500;
  private processingInterval: NodeJS.Timeout | null = null;
  private mintFunction: MintFunction | null = null;
  private isInitialized = false;

  /**
   * Initialize the queue with a mint function
   * Can be called multiple times to update the mint function (for hot reloading)
   */
  initialize(mintFn: MintFunction): void {
    // Stop existing processing interval if any
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.mintFunction = mintFn;
    this.isInitialized = true;
    
    // Start processing on initialization (after page reload)
    if (typeof window !== 'undefined') {
      this.startProcessing();
    }
  }

  /**
   * Check if reward is already minted (in database)
   * This is an async check that needs to be called before enqueueing
   * For "wins" type, we allow enqueueing even if check fails (view might not be updated yet)
   */
  private async isRewardAlreadyMinted(type: string, player: PlayerEntity): Promise<boolean> {
    try {
      // Use server action to check if reward exists (avoids importing database code in client)
      const { checkRewardExists } = await import('@/app/actions/reward');
      const result = await checkRewardExists({
        playerId: player.id,
        rewardType: type,
      });
      
      console.log(`[MintQueue] Checking rewards for player ${player.id}, type: ${type}, earned:`, result.earnedRewardTypes);
      
      // For wins, check if any wins-related reward exists
      if (type === "wins") {
        // For wins, we still allow enqueueing and let the mint function determine which specific reward
        // But we check for duplicates in queue
        const queue = this.getQueue();
        const isAlreadyQueued = queue.some(
          task => task.type === type && task.player.id === player.id
        );
        if (isAlreadyQueued) {
          console.log(`[MintQueue] Wins reward already in queue for player ${player.id}, skipping duplicate`);
        }
        return isAlreadyQueued;
      }
      
      // For other types, check if the specific reward exists
      if (result.exists) {
        console.log(`[MintQueue] Reward ${type} already exists in database for player ${player.id}, skipping enqueue`);
        return true;
      }
      
      // If reward doesn't exist in database, allow enqueueing (view might not be updated yet)
      console.log(`[MintQueue] Reward ${type} not found in database, allowing enqueue`);
      
      // Also check if this exact reward type is already in the queue to avoid duplicates
      const queue = this.getQueue();
      const isAlreadyQueued = queue.some(
        task => task.type === type && task.player.id === player.id
      );
      
      if (isAlreadyQueued) {
        console.log(`[MintQueue] Reward ${type} is already in queue for player ${player.id}, skipping duplicate`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[MintQueue] Error checking if reward is already minted:', error);
      // On error, allow enqueueing to proceed (fail-safe)
      return false;
    }
  }

  /**
   * Enqueue a mint task (persisted to localStorage)
   * Returns immediately without blocking
   * Checks if reward is already minted before enqueueing
   */
  async enqueue(type: string, player: PlayerEntity | null): Promise<void> {
    if (!player || !player.suiAddress) {
      console.log('[MintQueue] Player has no Sui address, skipping mint');
      return;
    }

    if (!this.isInitialized) {
      console.warn('[MintQueue] Queue not initialized yet, skipping mint');
      return;
    }

    // Check if reward is already minted before enqueueing
    const alreadyMinted = await this.isRewardAlreadyMinted(type, player);
    if (alreadyMinted) {
      return;
    }

    const task: MintTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      player,
      timestamp: Date.now(),
      retries: 0,
    };

    const queue = this.getQueue();
    queue.push(task);
    this.saveQueue(queue);

    // Verify the save worked
    const savedQueue = this.getQueue();
    const wasSaved = savedQueue.some(t => t.id === task.id);
    
    console.log(`[MintQueue] Enqueued mint: ${type} for player ${player.id} (queue length: ${queue.length})`);
    console.log(`[MintQueue] Queue saved: ${wasSaved ? 'YES' : 'NO'}, Verified queue length: ${savedQueue.length}`);
    console.log(`[MintQueue] Debug info:`, {
      isProcessing: this.isProcessing(),
      hasInterval: !!this.processingInterval,
      hasMintFunction: !!this.mintFunction,
      isInitialized: this.isInitialized,
      localStorageKey: process.env.NEXT_PUBLIC_STORAGE_QUEUE as string,
    });
    
    // Verify localStorage content
    if (typeof window !== 'undefined') {
      const rawStored = localStorage.getItem(process.env.NEXT_PUBLIC_STORAGE_QUEUE as string);
      console.log(`[MintQueue] Raw localStorage content:`, rawStored);
    }
    
    // Ensure processing is running
    this.startProcessing();
    
    // Also trigger immediate processing attempt (don't wait for interval)
    if (this.mintFunction && !this.isProcessing()) {
      // Use setTimeout to avoid blocking and allow async processing
      setTimeout(() => {
        this.processQueue().catch((error) => {
          console.error('[MintQueue] Error in immediate processing:', error);
        });
      }, 100);
    }
  }

  /**
   * Get queue from localStorage
   */
  private getQueue(): MintTask[] {
    if (typeof window === 'undefined') {
      console.warn('[MintQueue] Cannot get queue - window is undefined');
      return [];
    }
    
    try {
      const stored = localStorage.getItem(process.env.NEXT_PUBLIC_STORAGE_QUEUE as string);
      if (!stored) {
        return [];
      }
      
      const queue = JSON.parse(stored) as MintTask[];
      // Filter out tasks older than 24 hours to prevent stale data
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const filteredQueue = queue.filter(task => task.timestamp > oneDayAgo);
      
      // If we filtered out items, save the filtered queue
      if (filteredQueue.length !== queue.length) {
        this.saveQueue(filteredQueue);
      }
      
      return filteredQueue;
    } catch (error) {
      console.error('[MintQueue] Error reading queue from localStorage:', error);
      return [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(queue: MintTask[]): void {
    if (typeof window === 'undefined') {
      console.warn('[MintQueue] Cannot save queue - window is undefined');
      return;
    }
    
    try {
      const serialized = JSON.stringify(queue);
      localStorage.setItem(process.env.NEXT_PUBLIC_STORAGE_QUEUE as string, serialized);
      
      // Verify the save worked
      const verification = localStorage.getItem(process.env.NEXT_PUBLIC_STORAGE_QUEUE as string);
      const verified = verification === serialized;
      
      console.log(`[MintQueue] Saved ${queue.length} items to localStorage (verified: ${verified ? 'YES' : 'NO'})`);
      
      if (!verified) {
        console.error('[MintQueue] localStorage save verification failed!', {
          expectedLength: serialized.length,
          actualLength: verification?.length || 0,
        });
      }
    } catch (error: any) {
      console.error('[MintQueue] Error saving queue to localStorage:', error);
      console.error('[MintQueue] Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });
      
      // If localStorage is full, try to clear old items
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[MintQueue] localStorage quota exceeded, clearing old items');
        this.clear();
      }
    }
  }

  /**
   * Start processing queue (checks every 2 seconds)
   */
  private startProcessing(): void {
    if (this.processingInterval || !this.mintFunction || typeof window === 'undefined') {
      if (!this.mintFunction) {
        console.warn('[MintQueue] Cannot start processing - mint function not available');
      }
      return;
    }

    console.log('[MintQueue] Starting processing interval');

    this.processingInterval = setInterval(() => {
      this.processQueue().catch((error) => {
        console.error('[MintQueue] Error in interval processing:', error);
      });
    }, 2000); // Check every 2 seconds
  }

  /**
   * Process the queue (can be called immediately or by interval)
   */
  private async processQueue(): Promise<void> {
    // Check if another instance is already processing
    const processingKey = process.env.NEXT_PUBLIC_STORAGE_QUEUE_PROCESSING as string;
    const isProcessing = localStorage.getItem(processingKey) === 'true';
    
    if (isProcessing) {
      // Safety check: if processing flag has been set for more than 30 seconds, clear it
      // This prevents infinite loops if processing got stuck
      const processingTimestamp = localStorage.getItem(`${processingKey}_timestamp`);
      if (processingTimestamp) {
        const elapsed = Date.now() - parseInt(processingTimestamp, 10);
        if (elapsed > 30000) { // 30 seconds
          console.warn(`[MintQueue] Processing flag stuck for ${elapsed}ms, clearing it`);
          localStorage.removeItem(processingKey);
          localStorage.removeItem(`${processingKey}_timestamp`);
        } else {
          console.log('[MintQueue] Already processing, skipping');
          return;
        }
      } else {
        console.log('[MintQueue] Already processing (no timestamp), skipping');
        return;
      }
    }

    if (!this.mintFunction) {
      console.warn('[MintQueue] Cannot process - mint function not available');
      const debugInfo = this.getDebugInfo();
      console.warn('[MintQueue] Debug info:', debugInfo);
      return;
    }

    // Get fresh queue from localStorage
    let queue = this.getQueue();
    if (queue.length === 0) {
      return;
    }

    // Mark as processing to prevent concurrent processing
    localStorage.setItem(processingKey, 'true');
    localStorage.setItem(`${processingKey}_timestamp`, Date.now().toString());
    console.log(`[MintQueue] Starting to process ${queue.length} items in queue`);

    try {
      // Process items one by one until queue is empty
      // Refresh queue from localStorage each iteration to get latest state
      while (this.mintFunction) {
        queue = this.getQueue();
        if (queue.length === 0) {
          console.log('[MintQueue] Queue is now empty, stopping processing');
          break;
        }

        // Process the first task (it will save the queue after processing)
        await this.processNextTask();
        
        // Refresh queue after processing to get updated state
        queue = this.getQueue();
        
        // Small delay between items to avoid object locking
        if (queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenMints));
        }
      }
    } catch (error) {
      console.error('[MintQueue] Error processing queue:', error);
      const debugInfo = this.getDebugInfo();
      console.error('[MintQueue] Debug info at error:', debugInfo);
    } finally {
      // Always unmark processing flag, even if there was an error
      // Reuse processingKey from outer scope
      try {
        if (processingKey) {
          localStorage.removeItem(processingKey);
          localStorage.removeItem(`${processingKey}_timestamp`);
          console.log('[MintQueue] Processing flag cleared');
        }
      } catch (e) {
        console.error('[MintQueue] Error clearing processing flag:', e);
      }
      
      // Log final queue state
      const finalQueue = this.getQueue();
      console.log(`[MintQueue] Finished processing queue. Remaining items: ${finalQueue.length}`);
    }
  }

  /**
   * Process the next task in queue
   */
  private async processNextTask(): Promise<void> {
    // Get fresh queue from localStorage
    const queue = this.getQueue();
    
    if (queue.length === 0 || !this.mintFunction) {
      console.log('[MintQueue] No tasks to process or mint function unavailable');
      return;
    }

    const task = queue[0];
    console.log(`[MintQueue] Processing mint: ${task.type} for player ${task.player?.id || 'unknown'} (attempt ${task.retries + 1}/${this.maxRetries + 1})`);
    console.log(`[MintQueue] Task details:`, { id: task.id, type: task.type, timestamp: task.timestamp });

    // Double-check if reward is already minted before processing
    // For "wins" type, we check but allow retry if view hasn't updated yet
    // Add timeout to prevent hanging
    let alreadyMinted = false;
    try {
      alreadyMinted = await Promise.race([
        this.isRewardAlreadyMinted(task.type, task.player),
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.warn(`[MintQueue] isRewardAlreadyMinted timeout for ${task.type}, allowing processing`);
            resolve(false); // On timeout, allow processing to proceed
          }, 5000); // 5 second timeout
        }),
      ]);
    } catch (error) {
      console.error('[MintQueue] Error checking if reward already minted:', error);
      // On error, allow processing to proceed
      alreadyMinted = false;
    }
    if (alreadyMinted && task.type !== "wins") {
      console.log(`[MintQueue] Reward ${task.type} is already minted, removing from queue`);
      queue.shift();
      this.saveQueue(queue);
      return;
    }
    
    // For "wins" type, if check indicates already minted but we're here, it means view might not be updated
    // Let the mint function itself check and handle it
    if (alreadyMinted && task.type === "wins") {
      console.log(`[MintQueue] Wins reward check returned already minted, but proceeding to let mint function verify (view may not be updated yet)`);
    }

    try {
      const result = await this.mintFunction(task.type, task.player);
      
      // For "wins" type, if result is empty string, it might mean the view hasn't updated yet
      // Retry after a delay instead of removing from queue
      if (task.type === "wins" && (!result || result === "")) {
        if (task.retries < this.maxRetries) {
          task.retries++;
          const delay = Math.pow(2, task.retries) * 1000; // 2s, 4s, 8s
          console.log(`[MintQueue] Wins reward view may not be updated yet, will retry in ${delay}ms... (attempt ${task.retries}/${this.maxRetries})`);
          
          // Remove from queue and save
          queue.shift();
          this.saveQueue(queue);
          
          // Re-add to end of queue for retry after delay
          setTimeout(() => {
            const retryQueue = this.getQueue();
            retryQueue.push(task);
            this.saveQueue(retryQueue);
            console.log(`[MintQueue] Re-queued wins task ${task.id} for retry`);
          }, delay);
          return;
        } else {
          console.log(`[MintQueue] Wins reward mint returned empty after ${task.retries} retries, removing from queue (may already be earned)`);
          queue.shift();
          this.saveQueue(queue);
          return;
        }
      }
      
      // Success - remove from queue and save
      queue.shift();
      this.saveQueue(queue);
      
      console.log(`[MintQueue] Successfully minted ${task.type}, result:`, result);
      console.log(`[MintQueue] Queue after success: ${queue.length} items remaining`);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || '';
      const isLockedError = errorMessage.includes('already locked') || 
                           errorMessage.includes('non-retriable') ||
                           errorMessage.includes('Transaction is rejected');

      if (isLockedError && task.retries < this.maxRetries) {
        // Retry with exponential backoff
        task.retries++;
        const delay = Math.pow(2, task.retries) * 1000; // 2s, 4s, 8s
        console.log(`[MintQueue] Object locked, will retry in ${delay}ms... (attempt ${task.retries}/${this.maxRetries})`);
        
        // Remove from queue and save
        queue.shift();
        this.saveQueue(queue);
        
        // Re-add to end of queue for retry after delay
        setTimeout(() => {
          const retryQueue = this.getQueue();
          retryQueue.push(task);
          this.saveQueue(retryQueue);
          console.log(`[MintQueue] Re-queued task ${task.id} for retry`);
        }, delay);
      } else {
        // Max retries reached or non-retriable error
        console.error(`[MintQueue] Failed to mint ${task.type} after ${task.retries} retries:`, error);
        console.error('[MintQueue] Error details:', {
          message: errorMessage,
          error: error,
          taskType: task.type,
          playerId: task.player?.id,
        });
        
        // Remove from queue (failed permanently)
        queue.shift();
        this.saveQueue(queue);
        console.log(`[MintQueue] Removed failed task from queue. Remaining: ${queue.length}`);
      }
    }
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.getQueue().length;
  }

  /**
   * Manually trigger queue processing (useful for debugging)
   */
  async processNow(): Promise<void> {
    console.log('[MintQueue] Manually triggering queue processing');
    if (!this.mintFunction) {
      console.warn('[MintQueue] Cannot process - mint function not available');
      return;
    }
    await this.processQueue();
  }

  /**
   * Get debug information about queue state
   */
  getDebugInfo(): {
    isInitialized: boolean;
    hasMintFunction: boolean;
    queueLength: number;
    isProcessing: boolean;
    hasInterval: boolean;
    localStorageContent: string | null;
  } {
    return {
      isInitialized: this.isInitialized,
      hasMintFunction: !!this.mintFunction,
      queueLength: this.getQueueLength(),
      isProcessing: this.isProcessing(),
      hasInterval: !!this.processingInterval,
      localStorageContent: typeof window !== 'undefined' ? localStorage.getItem(process.env.NEXT_PUBLIC_STORAGE_QUEUE as string) : null,
    };
  }

  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(process.env.NEXT_PUBLIC_STORAGE_QUEUE_PROCESSING as string) === 'true';
  }

  /**
   * Clear the queue (useful for testing or reset)
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(process.env.NEXT_PUBLIC_STORAGE_QUEUE as string);
    localStorage.removeItem(process.env.NEXT_PUBLIC_STORAGE_QUEUE_PROCESSING as string);
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Stop processing (useful for cleanup)
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

// Export singleton instance
export const mintQueue = new MintQueue();

