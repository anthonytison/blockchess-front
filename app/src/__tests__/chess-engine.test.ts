import { ChessEngine } from '@/lib/chess/engine';

describe('ChessEngine', () => {
  let engine: ChessEngine;

  beforeEach(() => {
    engine = new ChessEngine();
  });

  test('should initialize with starting position', () => {
    const boardState = engine.getBoardState();
    expect(boardState.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(boardState.turn).toBe('w');
    expect(boardState.isCheck).toBe(false);
    expect(boardState.isCheckmate).toBe(false);
  });

  test('should make valid moves', () => {
    const result = engine.makeMove('e2', 'e4');
    expect(result.success).toBe(true);
    expect(result.move?.from).toBe('e2');
    expect(result.move?.to).toBe('e4');
    expect(result.move?.san).toBe('e4');
  });

  test('should reject invalid moves', () => {
    const result = engine.makeMove('e2', 'e5');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should get legal moves for a piece', () => {
    const moves = engine.getLegalMoves('e2');
    expect(moves).toContain('e3');
    expect(moves).toContain('e4');
    expect(moves).toHaveLength(2);
  });

  test('should detect checkmate', () => {
    // Fool's mate
    engine.makeMove('f2', 'f3');
    engine.makeMove('e7', 'e5');
    engine.makeMove('g2', 'g4');
    engine.makeMove('d8', 'h4');
    
    const boardState = engine.getBoardState();
    expect(boardState.isCheckmate).toBe(true);
    expect(engine.getResult()).toBe('0-1');
    expect(engine.getWinner()).toBe('black');
  });

  test('should load position from FEN', () => {
    const testFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const success = engine.loadFen(testFen);
    expect(success).toBe(true);
    // The chess.js library may normalize the FEN, so we check the key parts
    const boardState = engine.getBoardState();
    expect(boardState.fen).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq');
    expect(boardState.turn).toBe('b');
  });
});