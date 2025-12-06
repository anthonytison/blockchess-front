import { SQLiteGameRepository } from '../sqlite/game-repository';
import { Game } from '@/domain/entities';
import db from '../sqlite/database';

describe('Game Repository - object_id functionality', () => {
  let repository: SQLiteGameRepository;

  beforeEach(() => {
    repository = new SQLiteGameRepository();
    // Clean up test data
    db.prepare('DELETE FROM games').run();
  });

  describe('create with object_id', () => {
    it('should create game with object_id value', async () => {
      const objectId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const gameData: Partial<Game> = {
        id: 'test-game-1',
        mode: 'solo',
        player1Id: 'player-1',
        player2Id: 'computer',
        objectId: objectId,
        createdAt: Date.now(),
      };

      const game = await repository.create(gameData);

      expect(game.objectId).toBe(objectId);
      expect(game.id).toBe('test-game-1');
    });

    it('should create game without object_id (null)', async () => {
      const gameData: Partial<Game> = {
        id: 'test-game-2',
        mode: 'vs',
        player1Id: 'player-1',
        player2Id: 'player-2',
        createdAt: Date.now(),
      };

      const game = await repository.create(gameData);

      expect(game.objectId).toBeNull();
      expect(game.id).toBe('test-game-2');
    });

    it('should create game with explicit null object_id', async () => {
      const gameData: Partial<Game> = {
        id: 'test-game-3',
        mode: 'solo',
        player1Id: 'player-1',
        player2Id: 'computer',
        objectId: null,
        createdAt: Date.now(),
      };

      const game = await repository.create(gameData);

      expect(game.objectId).toBeNull();
    });
  });

  describe('getById with object_id', () => {
    it('should retrieve game and include object_id in result', async () => {
      const objectId = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const gameData: Partial<Game> = {
        id: 'test-game-4',
        mode: 'solo',
        player1Id: 'player-1',
        player2Id: 'computer',
        objectId: objectId,
        createdAt: Date.now(),
      };

      await repository.create(gameData);
      const retrievedGame = await repository.getById('test-game-4');

      expect(retrievedGame).not.toBeNull();
      expect(retrievedGame?.objectId).toBe(objectId);
    });

    it('should retrieve game with null object_id', async () => {
      const gameData: Partial<Game> = {
        id: 'test-game-5',
        mode: 'vs',
        player1Id: 'player-1',
        player2Id: 'player-2',
        createdAt: Date.now(),
      };

      await repository.create(gameData);
      const retrievedGame = await repository.getById('test-game-5');

      expect(retrievedGame).not.toBeNull();
      expect(retrievedGame?.objectId).toBeNull();
    });
  });

  describe('updateGameState with object_id', () => {
    it('should update game with object_id parameter', async () => {
      const gameData: Partial<Game> = {
        id: 'test-game-6',
        mode: 'solo',
        player1Id: 'player-1',
        player2Id: 'computer',
        createdAt: Date.now(),
      };

      await repository.create(gameData);

      const newObjectId = '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba';
      await repository.updateGameState('test-game-6', {
        objectId: newObjectId,
      });

      const updatedGame = await repository.getById('test-game-6');
      expect(updatedGame?.objectId).toBe(newObjectId);
    });

    it('should not overwrite object_id when not provided in update', async () => {
      const originalObjectId = '0x1111111111111111111111111111111111111111111111111111111111111111';
      const gameData: Partial<Game> = {
        id: 'test-game-7',
        mode: 'solo',
        player1Id: 'player-1',
        player2Id: 'computer',
        objectId: originalObjectId,
        createdAt: Date.now(),
      };

      await repository.create(gameData);

      await repository.updateGameState('test-game-7', {
        moveCount: 5,
      });

      const updatedGame = await repository.getById('test-game-7');
      expect(updatedGame?.objectId).toBe(originalObjectId);
      expect(updatedGame?.moveCount).toBe(5);
    });
  });

  describe('list with object_id', () => {
    it('should include object_id in list results', async () => {
      const objectId1 = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const objectId2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

      await repository.create({
        id: 'test-game-8',
        mode: 'solo',
        player1Id: 'player-1',
        player2Id: 'computer',
        objectId: objectId1,
        createdAt: Date.now(),
      });

      await repository.create({
        id: 'test-game-9',
        mode: 'vs',
        player1Id: 'player-1',
        player2Id: 'player-2',
        objectId: objectId2,
        createdAt: Date.now(),
      });

      await repository.create({
        id: 'test-game-10',
        mode: 'solo',
        player1Id: 'player-1',
        player2Id: 'computer',
        createdAt: Date.now(),
      });

      const games = await repository.list({ limit: 10 });

      expect(games.length).toBe(3);
      expect(games.find(g => g.id === 'test-game-8')?.objectId).toBe(objectId1);
      expect(games.find(g => g.id === 'test-game-9')?.objectId).toBe(objectId2);
      expect(games.find(g => g.id === 'test-game-10')?.objectId).toBeNull();
    });
  });
});
