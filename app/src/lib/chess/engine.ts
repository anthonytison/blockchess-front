// Chess engine wrapper - abstracts chess.js functionality

import { Chess, Square } from 'chess.js';
import { BoardState } from '@/domain/entities';

export class ChessEngine {
  private chess: Chess;

  constructor(fen?: string) {
    this.chess = new Chess(fen);
  }

  // Get current board state
  getBoardState(): BoardState {
    return {
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      isCheck: this.chess.inCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      legalMoves: this.chess.moves({ verbose: true }).map(move => 
        `${move.from}${move.to}${move.promotion || ''}`
      ),
    };
  }

  // Make a move
  makeMove(from: string, to: string, promotion?: string): {
    success: boolean;
    move?: {
      from: string;
      to: string;
      san: string;
      fen: string;
      captured?: string; // Type of captured piece (p, r, n, b, q, k)
    };
    error?: string;
  } {
    try {
      const moveObj = {
        from: from as Square,
        to: to as Square,
        promotion: promotion as any,
      };

      const move = this.chess.move(moveObj);
      
      if (!move) {
        return {
          success: false,
          error: 'Invalid move',
        };
      }

      return {
        success: true,
        move: {
          from: move.from,
          to: move.to,
          san: move.san,
          fen: this.chess.fen(),
          captured: move.captured, // This will be the piece type if a capture occurred
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get legal moves for a square
  getLegalMoves(square: string): string[] {
    return this.chess.moves({ 
      square: square as Square, 
      verbose: true 
    }).map(move => move.to);
  }

  // Load position from FEN
  loadFen(fen: string): boolean {
    try {
      this.chess.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  // Get piece at square
  getPiece(square: string) {
    return this.chess.get(square as Square);
  }

  // Get all pieces on board
  getBoard() {
    return this.chess.board();
  }

  // Get current FEN
  getFen(): string {
    return this.chess.fen();
  }

  // Get current turn
  getTurn(): 'w' | 'b' {
    return this.chess.turn();
  }

  // Undo last move
  undo() {
    return this.chess.undo();
  }

  // Get game history
  getHistory() {
    return this.chess.history({ verbose: true });
  }

  // Reset to starting position
  reset() {
    this.chess.reset();
  }

  // Get ASCII representation (for debugging)
  ascii() {
    return this.chess.ascii();
  }

  // Check if game is over
  isGameOver() {
    return this.chess.isGameOver();
  }

  // Get game result
  getResult(): string | null {
    if (this.chess.isCheckmate()) {
      return this.chess.turn() === 'w' ? '0-1' : '1-0';
    }
    if (this.chess.isDraw() || this.chess.isStalemate()) {
      return '1/2-1/2';
    }
    return null;
  }

  // Get winner
  getWinner(): string | null {
    if (this.chess.isCheckmate()) {
      return this.chess.turn() === 'w' ? 'black' : 'white';
    }
    if (this.chess.isDraw() || this.chess.isStalemate()) {
      return 'draw';
    }
    return null;
  }

  // Get captured pieces from game history
  getCapturedPieces(): { white: string[]; black: string[] } {
    const history = this.chess.history({ verbose: true });
    const capturedWhite: string[] = [];
    const capturedBlack: string[] = [];

    for (const move of history) {
      if (move.captured) {
        // If white made the move, they captured a black piece
        if (move.color === 'w') {
          capturedBlack.push(move.captured);
        } else {
          capturedWhite.push(move.captured);
        }
      }
    }

    return { white: capturedWhite, black: capturedBlack };
  }

  // Simple computer move (random legal move)
  getComputerMove(): { from: string; to: string; san: string } | null {
    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return null;
    
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return {
      from: randomMove.from,
      to: randomMove.to,
      san: randomMove.san,
    };
  }
}