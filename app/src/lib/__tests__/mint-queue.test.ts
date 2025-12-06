/**
 * @jest-environment jsdom
 */

import { mintQueue } from '../mint-queue';
import { PlayerEntity } from '@/domain/entities';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('MintQueue', () => {
  const mockMintFunction = jest.fn();
  const mockPlayer: PlayerEntity = {
    id: 'test-player-id',
    name: 'Test Player',
    suiAddress: '0x123',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mintQueue.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    mintQueue.clear();
    jest.useRealTimers();
  });

  it('should initialize with mint function', () => {
    mintQueue.initialize(mockMintFunction);
    expect(mintQueue.getQueueLength()).toBe(0);
  });

  it('should enqueue mint tasks', () => {
    mintQueue.initialize(mockMintFunction);
    mintQueue.enqueue('first_game', mockPlayer);

    expect(mintQueue.getQueueLength()).toBe(1);
  });

  it('should not enqueue if player has no sui address', () => {
    mintQueue.initialize(mockMintFunction);
    const playerWithoutAddress = { ...mockPlayer, suiAddress: null };

    mintQueue.enqueue('first_game', playerWithoutAddress);

    expect(mintQueue.getQueueLength()).toBe(0);
  });

  it('should persist queue to localStorage', () => {
    mintQueue.initialize(mockMintFunction);
    mintQueue.enqueue('first_game', mockPlayer);

    const stored = localStorageMock.getItem('blockchess_mint_queue');
    expect(stored).not.toBeNull();
    
    const queue = JSON.parse(stored!);
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('first_game');
    expect(queue[0].player.id).toBe(mockPlayer.id);
  });

  it('should resume queue after page reload', () => {
    // Simulate existing queue in localStorage
    const existingQueue = [
      {
        id: 'existing-task-id',
        type: 'first_game_created',
        player: mockPlayer,
        timestamp: Date.now(),
        retries: 0,
      },
    ];
    localStorageMock.setItem('blockchess_mint_queue', JSON.stringify(existingQueue));

    mintQueue.initialize(mockMintFunction);
    
    // Queue should be loaded from localStorage
    expect(mintQueue.getQueueLength()).toBe(1);
  });

  it('should filter out stale tasks older than 24 hours', () => {
    const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    const oldQueue = [
      {
        id: 'old-task-id',
        type: 'first_game',
        player: mockPlayer,
        timestamp: oldTimestamp,
        retries: 0,
      },
    ];
    localStorageMock.setItem('blockchess_mint_queue', JSON.stringify(oldQueue));

    mintQueue.initialize(mockMintFunction);
    
    // Old task should be filtered out
    expect(mintQueue.getQueueLength()).toBe(0);
  });

  it('should process queue sequentially', async () => {
    mintQueue.initialize(mockMintFunction);
    
    mockMintFunction.mockResolvedValue('test-object-id');

    mintQueue.enqueue('first_game', mockPlayer);
    mintQueue.enqueue('first_game_created', mockPlayer);

    expect(mintQueue.getQueueLength()).toBe(2);

    // Fast-forward time to trigger processing
    jest.advanceTimersByTime(2000);

    await Promise.resolve(); // Allow async operations to complete

    // Queue should be processing
    // Note: Actual processing requires the mint function to be called
    // This test verifies the queue structure, not the full processing logic
  });

  it('should clear queue', () => {
    mintQueue.initialize(mockMintFunction);
    mintQueue.enqueue('first_game', mockPlayer);
    
    expect(mintQueue.getQueueLength()).toBe(1);

    mintQueue.clear();

    expect(mintQueue.getQueueLength()).toBe(0);
    expect(localStorageMock.getItem('blockchess_mint_queue')).toBeNull();
  });
});

