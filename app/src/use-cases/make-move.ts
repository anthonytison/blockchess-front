// Make Move Use Case

import { IMoveRepository, IGameRepository, IClock } from '@/ports/repositories';
import { Move } from '@/domain/entities';
import { ChessEngine } from '@/lib/chess/engine';
import { DateTime } from 'luxon';

export interface MakeMoveRequest {
  gameId: string;
  from: string;
  to: string;
  promotion?: string;
  san?: string;  // Pre-calculated SAN notation
  fen?: string;  // Pre-calculated FEN
}

export interface MakeMoveResponse {
  move: Move;
  isGameOver: boolean;
  winner?: string;
  result?: string;
  capturedPieces?: {
    white: string[];
    black: string[];
  };
  boardState?: {
    fen: string;
    turn: 'w' | 'b';
    isCheck: boolean;
    isCheckmate: boolean;
  };
}

export class MakeMoveUseCase {
  constructor(
    private moveRepository: IMoveRepository,
    private gameRepository: IGameRepository,
    private clock: IClock
  ) {}

  async execute(request: MakeMoveRequest): Promise<MakeMoveResponse> {
    // Get current game state
    const game = await this.gameRepository.getById(request.gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    // Get all moves to reconstruct position
    const moves = await this.moveRepository.listMoves(request.gameId);
    
    // Create chess engine and replay moves
    const engine = new ChessEngine();
    // Replay all moves, extracting promotion from SAN notation if present
    for (const move of moves) {
      // Extract promotion from SAN notation (e.g., "g8=Q" means promote to queen)
      let promotion: string | undefined = undefined;
      if (move.san && move.san.includes('=')) {
        const promotionMatch = move.san.match(/=([QRBN])/);
        if (promotionMatch) {
          promotion = promotionMatch[1].toLowerCase();
        }
      }
      engine.makeMove(move.from, move.to, promotion);
    }

    // Get the current turn before making the move (this is the player making the move)
    const movingPlayerTurn = engine.getTurn();
    const playerColor = movingPlayerTurn === 'w' ? 'white' : 'black';

    // Validate and make the new move
    const moveResult = engine.makeMove(request.from, request.to, request.promotion);
    if (!moveResult.success) {
      const currentFen = engine.getFen();
      const errorDetails = JSON.stringify({ from: request.from, to: request.to, promotion: request.promotion });
      throw new Error(`Invalid move: ${errorDetails}. Current position: ${currentFen}`);
    }

    // Create move record (use pre-calculated values if provided)
    const move: Move = {
      gameId: request.gameId,
      moveNumber: moves.length + 1,
      from: request.from,
      to: request.to,
      san: request.san || moveResult.move!.san,
      fen: request.fen || moveResult.move!.fen,
      timestamp: DateTime.local().toISO() || DateTime.local().toString(),
      playerColor: playerColor, // Color of player who made the move
    };

    // Save move
    const savedMove = await this.moveRepository.addMove(move);

    // Update game move count, captured pieces, current turn, and final FEN
    const capturedPieces = engine.getCapturedPieces();
    const boardState = engine.getBoardState();
    const currentTurn = boardState.turn === 'w' ? 'white' : 'black';
    
    await this.gameRepository.updateGameState(request.gameId, {
      moveCount: move.moveNumber,
      capturedPiecesWhite: JSON.stringify(capturedPieces.white),
      capturedPiecesBlack: JSON.stringify(capturedPieces.black),
      currentTurn,
      finalFen: engine.getFen(),
    });

    // Check if game is over
    const isGameOver = engine.isGameOver();
    let winner: string | undefined;
    let result: string | undefined;

    if (isGameOver) {
      result = engine.getResult() || undefined;
      const engineWinner = engine.getWinner();
      const player1Color = game.player1Color || 'white';
      
      if (engineWinner === 'draw') {
        winner = 'draw';
      } else if (engineWinner) {
        // Convert engine winner ('white' | 'black') to 'white' | 'black' format
        const winningColor = engineWinner === 'white' ? 'white' : 'black';
        
        // Determine winner based on player1Color and game mode
        if (game.mode === 'solo') {
          winner = winningColor === player1Color ? 'player1' : 'computer';
        } else {
          winner = winningColor === player1Color ? 'player1' : 'player2';
        }
      }

      // Update game with final result
      await this.gameRepository.finishGame(request.gameId, {
        winner,
        result,
        finalFen: moveResult.move!.fen,
      });
    }

    return {
      move: savedMove,
      isGameOver,
      winner,
      result,
      capturedPieces,
      boardState: {
        fen: moveResult.move!.fen,
        turn: engine.getTurn(),
        isCheck: engine.getBoardState().isCheck,
        isCheckmate: engine.getBoardState().isCheckmate,
      },
    };
  }
}