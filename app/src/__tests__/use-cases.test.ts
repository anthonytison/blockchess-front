import { StartGameUseCase } from '@/use-cases/start-game';
import { MakeMoveUseCase } from '@/use-cases/make-move';
import { IGameRepository, IMoveRepository, IClock, IPlayerRepository } from '@/ports/repositories';
import { Game, Move, PlayerEntity } from '@/domain/entities';
import { DateTime } from 'luxon';

// Mock implementations
class MockGameRepository implements IGameRepository {
  private games: Game[] = [];

  async create(game: Partial<Game>): Promise<Game> {
    const now = DateTime.local().toString();
    const newGame: Game = {
      id: game.id || 'test-game-1',
      createdAt: game.createdAt || now,
      updatedAt: game.updatedAt || now,
      mode: game.mode || 'vs',
      player1Id: game.player1Id || 'player-1',
      player2Id: game.player2Id || 'player-2',
      winner: game.winner || null,
      result: game.result || null,
      finalFen: game.finalFen || null,
      moveCount: game.moveCount || 0,
    };
    this.games.push(newGame);
    return newGame;
  }

  async getById(id: string): Promise<Game | null> {
    return this.games.find(g => g.id === id) || null;
  }

  async list(): Promise<Game[]> {
    return this.games;
  }

  async finishGame(id: string, update: any): Promise<void> {
    const game = this.games.find(g => g.id === id);
    if (game) {
      Object.assign(game, update);
    }
  }

  async updateMoveCount(id: string, count: number): Promise<void> {
    const game = this.games.find(g => g.id === id);
    if (game) {
      game.moveCount = count;
    }
  }

  async updateGameState(id: string, update: any): Promise<void> {
    const game = this.games.find(g => g.id === id);
    if (game) {
      Object.assign(game, update);
    }
  }

  async getByIdWithPlayers(id: string): Promise<any> {
    return this.games.find(g => g.id === id) || null;
  }

  async listWithPlayers(params?: any): Promise<any[]> {
    return this.games;
  }

  async getPlayerStatistics(playerId: string): Promise<any> {
    return { totalGames: 0, gamesWon: 0, gamesLost: 0, gamesDraw: 0 };
  }
}

class MockMoveRepository implements IMoveRepository {
  private moves: Move[] = [];

  async addMove(move: Move): Promise<Move> {
    const newMove = { ...move, id: this.moves.length + 1 };
    this.moves.push(newMove);
    return newMove;
  }

  async listMoves(gameId: string): Promise<Move[]> {
    return this.moves.filter(m => m.gameId === gameId);
  }

  async getMoveByNumber(gameId: string, moveNumber: number): Promise<Move | null> {
    return this.moves.find(m => m.gameId === gameId && m.moveNumber === moveNumber) || null;
  }
}

class MockPlayerRepository implements IPlayerRepository {
  private players: PlayerEntity[] = [];

  async create(player: Partial<PlayerEntity>): Promise<PlayerEntity> {
    const newPlayer: PlayerEntity = {
      id: player.id || `player-${this.players.length + 1}`,
      name: player.name || 'Test Player',
      suiAddress: player.suiAddress || null,
      createdAt: player.createdAt || DateTime.local().toString(),
    };
    this.players.push(newPlayer);
    return newPlayer;
  }

  async update(player: Partial<PlayerEntity>): Promise<PlayerEntity> {
    const found = this.players.find(p => p.id === player.id);
    if (found) {
      Object.assign(found, player);
      return found;
    }
    throw new Error('Player not found');
  }

  async getById(id: string): Promise<PlayerEntity | null> {
    return this.players.find(p => p.id === id) || null;
  }

  async getBySuiAddress(suiAddress: string): Promise<PlayerEntity | null> {
    return this.players.find(p => p.suiAddress === suiAddress) || null;
  }

  async getComputerPlayer(): Promise<PlayerEntity> {
    let computer = this.players.find(p => p.suiAddress === null);
    if (!computer) {
      computer = await this.create({
        name: 'Computer',
        suiAddress: null,
      });
    }
    return computer;
  }

  async list(params?: any): Promise<PlayerEntity[]> {
    return this.players;
  }
}

class MockClock implements IClock {
  now(): string {
    return DateTime.local().toString();
  }
  timestamp(): number {
    return 1640995200000; // Fixed timestamp for testing
  }
}

describe('Use Cases', () => {
  let gameRepository: MockGameRepository;
  let moveRepository: MockMoveRepository;
  let playerRepository: MockPlayerRepository;
  let clock: MockClock;

  beforeEach(() => {
    gameRepository = new MockGameRepository();
    moveRepository = new MockMoveRepository();
    playerRepository = new MockPlayerRepository();
    clock = new MockClock();
  });

  describe('StartGameUseCase', () => {
    test('should create a new vs game', async () => {
      const player1 = await playerRepository.create({ name: 'Alice', suiAddress: '0x123' });
      const player2 = await playerRepository.create({ name: 'Bob', suiAddress: '0x456' });
      
      const useCase = new StartGameUseCase(gameRepository, playerRepository, clock);
      
      const result = await useCase.execute({
        mode: 'vs',
        player1Id: player1.id!,
        player2Id: player2.id!,
      });

      expect(result.game.mode).toBe('vs');
      expect(typeof result.game.createdAt).toBe('string');
    });

    test('should create a new solo game', async () => {
      const player1 = await playerRepository.create({ name: 'Alice', suiAddress: '0x123' });
      
      const useCase = new StartGameUseCase(gameRepository, playerRepository, clock);
      
      const result = await useCase.execute({
        mode: 'solo',
        player1Id: player1.id!,
      });

      expect(result.game.mode).toBe('solo');
    });
  });

  describe('MakeMoveUseCase', () => {
    test('should make a valid move', async () => {
      const useCase = new MakeMoveUseCase(moveRepository, gameRepository, clock);
      
      // First create a game
      await gameRepository.create({
        id: 'test-game',
        mode: 'vs',
        player1Id: 'player-1',
        player2Id: 'player-2',
      });

      const result = await useCase.execute({
        gameId: 'test-game',
        from: 'e2',
        to: 'e4',
      });

      expect(result.move.from).toBe('e2');
      expect(result.move.to).toBe('e4');
      expect(result.move.san).toBe('e4');
      expect(result.isGameOver).toBe(false);
      
      // Verify timestamp is a string and in correct format
      expect(typeof result.move.timestamp).toBe('string');
      expect(result.move.timestamp.length).toBeGreaterThan(10);
      console.log('Move timestamp:', result.move.timestamp);
      console.log('Timestamp type:', typeof result.move.timestamp);
    });
    
    test('should create move with proper timestamp format', async () => {
      const useCase = new MakeMoveUseCase(moveRepository, gameRepository, clock);
      
      await gameRepository.create({
        id: 'test-game-2',
        mode: 'vs',
        player1Id: 'player-1',
        player2Id: 'player-2',
      });

      const result = await useCase.execute({
        gameId: 'test-game-2',
        from: 'e2',
        to: 'e4',
      });

      // Check that timestamp is not a number
      expect(typeof result.move.timestamp).toBe('string');
      expect(result.move.timestamp).not.toMatch(/^\d+$/); // Should not be just digits
      
      // Verify it's a valid DateTime string
      const parsed = DateTime.fromISO(result.move.timestamp);
      expect(parsed.isValid).toBe(true);
    });

    test('should reject invalid move', async () => {
      const useCase = new MakeMoveUseCase(moveRepository, gameRepository, clock);
      
      await gameRepository.create({
        id: 'test-game',
        mode: 'vs',
        player1Id: 'player-1',
        player2Id: 'player-2',
      });

      await expect(useCase.execute({
        gameId: 'test-game',
        from: 'e2',
        to: 'e5',
      })).rejects.toThrow();
    });
  });
});