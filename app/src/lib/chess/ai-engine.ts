// Simple AI Chess Engine with different difficulty levels

import { Chess, Move } from 'chess.js';

export type AIDifficulty = 'easy' | 'intermediate' | 'hard';

interface EvaluatedMove {
  move: Move;
  score: number;
}

export class AIChessEngine {
  private chess: Chess;

  constructor(fen?: string) {
    this.chess = new Chess(fen);
  }

  /**
   * Get the best move for the current position based on difficulty
   */
  getBestMove(difficulty: AIDifficulty): Move | null {
    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    switch (difficulty) {
      case 'easy':
        return this.getRandomMove(moves);
      case 'intermediate':
        return this.getMinimaxMove(2);
      case 'hard':
        return this.getMinimaxMove(4);
      default:
        return this.getRandomMove(moves);
    }
  }

  /**
   * Easy difficulty: Random valid move
   */
  private getRandomMove(moves: Move[]): Move {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  /**
   * Intermediate/Hard difficulty: Minimax algorithm
   */
  private getMinimaxMove(depth: number): Move | null {
    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    let bestMove: Move | null = null;
    let bestScore = -Infinity;

    for (const move of moves) {
      this.chess.move(move);
      const score = this.minimax(depth - 1, -Infinity, Infinity, false);
      this.chess.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Minimax algorithm with alpha-beta pruning
   */
  private minimax(depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
    if (depth === 0) {
      return this.evaluatePosition();
    }

    const moves = this.chess.moves({ verbose: true });

    if (moves.length === 0) {
      if (this.chess.isCheckmate()) {
        return isMaximizing ? -10000 : 10000;
      }
      return 0; // Stalemate
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        this.chess.move(move);
        const evaluation = this.minimax(depth - 1, alpha, beta, false);
        this.chess.undo();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        this.chess.move(move);
        const evaluation = this.minimax(depth - 1, alpha, beta, true);
        this.chess.undo();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minEval;
    }
  }

  /**
   * Evaluate the current position
   */
  private evaluatePosition(): number {
    let score = 0;

    // Material evaluation
    const board = this.chess.board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          const value = this.getPieceValue(piece.type);
          score += piece.color === 'w' ? value : -value;
        }
      }
    }

    // Position evaluation (basic)
    score += this.evaluatePosition_basic();

    return score;
  }

  /**
   * Get piece values for material evaluation
   */
  private getPieceValue(pieceType: string): number {
    const values: { [key: string]: number } = {
      'p': 100,   // Pawn
      'n': 320,   // Knight
      'b': 330,   // Bishop
      'r': 500,   // Rook
      'q': 900,   // Queen
      'k': 20000  // King
    };
    return values[pieceType] || 0;
  }

  /**
   * Basic positional evaluation
   */
  private evaluatePosition_basic(): number {
    let score = 0;

    // Favor center control
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    for (const square of centerSquares) {
      const piece = this.chess.get(square as any);
      if (piece) {
        score += piece.color === 'w' ? 10 : -10;
      }
    }

    // Penalize king exposure in opening/middlegame
    if (this.chess.history().length < 20) {
      const whiteKing = this.findKing('w');
      const blackKing = this.findKing('b');
      
      if (whiteKing && (whiteKing.includes('e') || whiteKing.includes('d'))) {
        score -= 50; // Penalize king in center
      }
      if (blackKing && (blackKing.includes('e') || blackKing.includes('d'))) {
        score += 50;
      }
    }

    return score;
  }

  /**
   * Find king position
   */
  private findKing(color: 'w' | 'b'): string | null {
    const board = this.chess.board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === color) {
          return String.fromCharCode(97 + j) + (8 - i);
        }
      }
    }
    return null;
  }

  /**
   * Load a position from FEN
   */
  loadFen(fen: string): boolean {
    try {
      this.chess.load(fen);
      return true;
    } catch {
      return false;
    }
  }
}