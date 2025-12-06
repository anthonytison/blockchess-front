import { PostgresMoveRepository } from '../postgres/move-repository';
import { Move } from '@/domain/entities';
import { DateTime } from 'luxon';
import { query } from '../postgres/database';

// Mock the database query function
jest.mock('../postgres/database', () => ({
  query: jest.fn(),
}));

describe('PostgresMoveRepository - Timestamp Handling', () => {
  let repository: PostgresMoveRepository;
  const mockQuery = query as jest.MockedFunction<typeof query>;

  beforeEach(() => {
    repository = new PostgresMoveRepository();
    jest.clearAllMocks();
  });

  describe('addMove timestamp format', () => {
    it('should accept DateTime string and pass it correctly to database', async () => {
      const move: Move = {
        gameId: 'test-game-1',
        moveNumber: 1,
        from: 'e2',
        to: 'e4',
        san: 'e4',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        timestamp: DateTime.local().toString(),
        playerColor: 'white',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          game_id: 'test-game-1',
          move_number: 1,
          from_sq: 'e2',
          to_sq: 'e4',
          san: 'e4',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          timestamp: move.timestamp,
          player_color: 'white',
        }],
      });

      const result = await repository.addMove(move);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO moves'),
        expect.arrayContaining([
          'test-game-1',
          1,
          'e2',
          'e4',
          'e4',
          expect.any(String),
          expect.any(String), // timestamp
          'white',
        ])
      );

      // Check that timestamp is a string
      const callArgs = mockQuery.mock.calls[0][1];
      const timestampArg = callArgs[6]; // timestamp is 7th parameter (index 6)
      
      expect(typeof timestampArg).toBe('string');
      expect(timestampArg).not.toMatch(/^\d+$/); // Should not be just digits
      
      // Check that it's a valid ISO-like string
      expect(timestampArg.length).toBeGreaterThan(10);
      
      expect(result.timestamp).toBe(move.timestamp);
    });

    it('should handle ISO string format correctly', async () => {
      const isoString = DateTime.local().toISO();
      const move: Move = {
        gameId: 'test-game-2',
        moveNumber: 1,
        from: 'e2',
        to: 'e4',
        san: 'e4',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        timestamp: isoString || DateTime.local().toString(),
        playerColor: 'white',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          game_id: 'test-game-2',
          move_number: 1,
          from_sq: 'e2',
          to_sq: 'e4',
          san: 'e4',
          fen: move.fen,
          timestamp: move.timestamp,
          player_color: 'white',
        }],
      });

      const result = await repository.addMove(move);

      const callArgs = mockQuery.mock.calls[0][1];
      const timestampArg = callArgs[6];
      
      expect(typeof timestampArg).toBe('string');
      if (isoString) {
        // ISO format should contain T and Z or timezone
        expect(timestampArg).toMatch(/T/);
      }
      
      expect(result.timestamp).toBe(move.timestamp);
    });

    it('should handle numeric string timestamps (legacy data)', async () => {
      // This test handles the case where a numeric string like "1764285117870" is passed
      const moveWithNumericString: Move = {
        gameId: 'test-game-3',
        moveNumber: 1,
        from: 'e2',
        to: 'e4',
        san: 'e4',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        timestamp: '1764285117870', // Numeric string - this was causing the error
        playerColor: 'white',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          game_id: 'test-game-3',
          move_number: 1,
          from_sq: 'e2',
          to_sq: 'e4',
          san: 'e4',
          fen: moveWithNumericString.fen,
          timestamp: DateTime.fromMillis(1764285117870).toISO(),
          player_color: 'white',
        }],
      });

      const result = await repository.addMove(moveWithNumericString);

      const callArgs = mockQuery.mock.calls[0][1];
      const timestampArg = callArgs[6]; // timestamp is 7th parameter (index 6)
      
      // Should be converted to ISO string, not numeric string
      expect(typeof timestampArg).toBe('string');
      expect(timestampArg).not.toMatch(/^\d+$/); // Should not be just digits
      expect(timestampArg).toMatch(/T/); // Should be ISO format with T
      
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });

    it('should handle numeric timestamp values (legacy data)', async () => {
      // This test handles the case where a number is passed (TypeScript shouldn't allow this, but runtime might)
      const moveWithNumber = {
        gameId: 'test-game-4',
        moveNumber: 1,
        from: 'e2',
        to: 'e4',
        san: 'e4',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        timestamp: 1764285117870 as any, // Number - should be converted
        playerColor: 'white' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          game_id: 'test-game-4',
          move_number: 1,
          from_sq: 'e2',
          to_sq: 'e4',
          san: 'e4',
          fen: moveWithNumber.fen,
          timestamp: DateTime.fromMillis(1764285117870).toISO(),
          player_color: 'white',
        }],
      });

      const result = await repository.addMove(moveWithNumber as Move);

      const callArgs = mockQuery.mock.calls[0][1];
      const timestampArg = callArgs[6];
      
      // Should be converted to ISO string
      expect(typeof timestampArg).toBe('string');
      expect(timestampArg).not.toMatch(/^\d+$/); // Should not be just digits
      expect(timestampArg).toMatch(/T/); // Should be ISO format
      
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('timestamp format validation', () => {
    it('should verify DateTime.local().toString() format', () => {
      const timestamp = DateTime.local().toString();
      
      console.log('DateTime.local().toString() produces:', timestamp);
      console.log('Type:', typeof timestamp);
      console.log('Length:', timestamp.length);
      console.log('Is numeric?', /^\d+$/.test(timestamp));
      
      expect(typeof timestamp).toBe('string');
      expect(timestamp.length).toBeGreaterThan(10);
    });

    it('should verify DateTime.local().toISO() format', () => {
      const isoString = DateTime.local().toISO();
      
      console.log('DateTime.local().toISO() produces:', isoString);
      console.log('Type:', typeof isoString);
      
      if (isoString) {
        expect(typeof isoString).toBe('string');
        expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });

});

