import { createGame, getGames } from '../game';
import { startGameUseCase, getHistoryUseCase } from '@/lib/di';

// Mock the dependencies
jest.mock('@/lib/di', () => ({
  startGameUseCase: {
    execute: jest.fn(),
  },
  getHistoryUseCase: {
    execute: jest.fn(),
  },
}));

describe('Game Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGame', () => {
    it('should accept object_id in request', async () => {
      const objectId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockGame = {
        id: 'game-123',
        mode: 'solo' as const,
        player1Id: 'player-1',
        player2Id: 'computer',
        objectId: objectId,
        createdAt: Date.now().toString(),
        updatedAt: Date.now().toString(),
        moveCount: 0,
      };

      (startGameUseCase.execute as jest.Mock).mockResolvedValue({ game: mockGame });

      const result = await createGame({
        mode: 'solo',
        player1Id: 'player-1',
        objectId: objectId,
      });

      expect(startGameUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'solo',
          player1Id: 'player-1',
          objectId: objectId,
        })
      );
      expect(result.game.objectId).toBe(objectId);
    });

    it('should handle request without object_id', async () => {
      const mockGame = {
        id: 'game-124',
        mode: 'vs' as const,
        player1Id: 'player-1',
        player2Id: 'player-2',
        objectId: null,
        createdAt: Date.now().toString(),
        updatedAt: Date.now().toString(),
        moveCount: 0,
      };

      (startGameUseCase.execute as jest.Mock).mockResolvedValue({ game: mockGame });

      const result = await createGame({
        mode: 'vs',
        player1Id: 'player-1',
        player2Id: 'player-2',
      });

      expect(startGameUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'vs',
          player1Id: 'player-1',
          player2Id: 'player-2',
          objectId: null,
        })
      );
      expect(result.game.objectId).toBeNull();
    });

    it('should throw error for invalid mode', async () => {
      await expect(
        createGame({
          mode: 'invalid' as any,
          player1Id: 'player-1',
        })
      ).rejects.toThrow('Invalid mode. Must be "solo" or "vs"');
    });

    it('should throw error when player1Id is missing', async () => {
      await expect(
        createGame({
          mode: 'solo',
          player1Id: '',
        })
      ).rejects.toThrow('player1Id is required');
    });

    it('should throw error when player2Id is missing for vs mode', async () => {
      await expect(
        createGame({
          mode: 'vs',
          player1Id: 'player-1',
        })
      ).rejects.toThrow('player2Id is required for vs mode');
    });
  });

  describe('getGames', () => {
    it('should include object_id in response for single game', async () => {
      const objectId = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const mockGames = [
        {
          id: 'game-125',
          mode: 'solo' as const,
          player1Id: 'player-1',
          player2Id: 'computer',
          objectId: objectId,
          createdAt: Date.now().toString(),
          updatedAt: Date.now().toString(),
          moveCount: 0,
        },
      ];

      (getHistoryUseCase.execute as jest.Mock).mockResolvedValue({ games: mockGames });

      const result = await getGames();

      expect(getHistoryUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
      expect(result.games).toHaveLength(1);
      expect(result.games[0].objectId).toBe(objectId);
    });

    it('should include object_id in response for multiple games', async () => {
      const objectId1 = '0x1111111111111111111111111111111111111111111111111111111111111111';
      const objectId2 = '0x2222222222222222222222222222222222222222222222222222222222222222';
      const mockGames = [
        {
          id: 'game-126',
          mode: 'solo' as const,
          player1Id: 'player-1',
          player2Id: 'computer',
          objectId: objectId1,
          createdAt: Date.now().toString(),
          updatedAt: Date.now().toString(),
          moveCount: 0,
        },
        {
          id: 'game-127',
          mode: 'vs' as const,
          player1Id: 'player-1',
          player2Id: 'player-2',
          objectId: objectId2,
          createdAt: Date.now().toString(),
          updatedAt: Date.now().toString(),
          moveCount: 0,
        },
        {
          id: 'game-128',
          mode: 'solo' as const,
          player1Id: 'player-1',
          player2Id: 'computer',
          objectId: null,
          createdAt: Date.now().toString(),
          updatedAt: Date.now().toString(),
          moveCount: 0,
        },
      ];

      (getHistoryUseCase.execute as jest.Mock).mockResolvedValue({ games: mockGames });

      const result = await getGames();

      expect(result.games).toHaveLength(3);
      expect(result.games[0].objectId).toBe(objectId1);
      expect(result.games[1].objectId).toBe(objectId2);
      expect(result.games[2].objectId).toBeNull();
    });

    it('should pass query parameters correctly', async () => {
      const mockGames: any[] = [];
      (getHistoryUseCase.execute as jest.Mock).mockResolvedValue({ games: mockGames });

      await getGames({
        limit: 10,
        offset: 20,
        playerId: 'player-1',
        sortBy: 'updatedAt',
        sortOrder: 'asc',
      });

      expect(getHistoryUseCase.execute).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
        playerId: 'player-1',
        sortBy: 'updatedAt',
        sortOrder: 'asc',
      });
    });
  });
});

