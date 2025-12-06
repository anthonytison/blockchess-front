'use server'

import { Mode } from '@/domain/entities';
import {
  startGameUseCase,
  getHistoryUseCase,
  replayGameUseCase,
  makeMoveUseCase,
  verifyGamePasswordUseCase,
  moveRepository,
} from '@/lib/di';
import { getGameRepository, getMoveRepository } from '@/lib/database/factory';
import { ChessEngine } from '@/lib/chess/engine';
import { AIChessEngine, AIDifficulty } from '@/lib/chess/ai-engine';
import { DateTime } from 'luxon';
import { StartGameResponse } from '@/use-cases/start-game';

export interface GetGamesParams {
  limit?: number;
  offset?: number;
  playerId?: string;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GetGamesResponse {
  games: any[];
  total: number;
}

export const getGames = async (params: GetGamesParams = {}): Promise<GetGamesResponse> => {
  const result = await getHistoryUseCase.execute({
    limit: params.limit,
    offset: params.offset,
    playerId: params.playerId,
    sortBy: params.sortBy || 'createdAt',
    sortOrder: params.sortOrder || 'desc',
  });
  return result;
};

export interface CreateGameParams {
  mode: Mode;
  player1Id: string;
  player2Id?: string;
  objectId?: string | null;
  password?: string | null;
  timerLimit?: number | null;
  player1Color?: string;
  setupData?: string;
  difficulty?: 'easy' | 'intermediate' | 'hard';
}

export const createGame = async (params: CreateGameParams): Promise<StartGameResponse> => {
  if (!params.mode || !['solo', 'vs'].includes(params.mode)) {
    throw new Error('Invalid mode. Must be "solo" or "vs"');
  }

  if (!params.player1Id || typeof params.player1Id !== 'string') {
    throw new Error('player1Id is required');
  }

  if (params.mode === 'vs' && (!params.player2Id || typeof params.player2Id !== 'string')) {
    throw new Error('player2Id is required for vs mode');
  }

  try {
    const result = await startGameUseCase.execute({
      mode: params.mode,
      player1Id: params.player1Id,
      player2Id: params.mode === 'vs' ? params.player2Id : undefined,
      objectId: params.objectId || null,
      password: params.password || null,
      timerLimit: params.timerLimit || null,
      player1Color: params.player1Color || 'white',
      setupData: params.setupData || '{}',
      difficulty: params.difficulty || 'easy',
    });
    return result;
  } catch (error: any) {
    // Log the error for debugging
    console.error('Error creating game:', error);
    
    // Re-throw known errors as-is
    if (
      error.message === 'Player 1 not found' ||
      error.message === 'Player 2 not found' ||
      error.message === 'Player 2 ID is required for vs mode'
    ) {
      throw error;
    }
    
    // For other errors, include the original error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create game: ${errorMessage}`);
  }
};

export const getGame = async (gameId: string) => {
  try {
    const result = await replayGameUseCase.execute({
      gameId,
    });
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === 'Game not found') {
      throw new Error('Game not found');
    }
    throw new Error('Failed to fetch game');
  }
};

export const getMoves = async (gameId: string) => {
  try {
    const moves = await moveRepository.listMoves(gameId);
    return { moves };
  } catch (error) {
    throw new Error('Failed to fetch moves');
  }
};

export interface MakeMoveParams {
  gameId: string;
  from: string;
  to: string;
  promotion?: string;
  san?: string;
  fen?: string;
}

export const makeMove = async (params: MakeMoveParams) => {
  if (!params.from || !params.to) {
    throw new Error('from and to squares are required');
  }

  const squareRegex = /^[a-h][1-8]$/;
  if (!squareRegex.test(params.from) || !squareRegex.test(params.to)) {
    throw new Error('Invalid square format. Use format like "e2", "e4"');
  }

  try {
    const result = await makeMoveUseCase.execute({
      gameId: params.gameId,
      from: params.from,
      to: params.to,
      promotion: params.promotion,
      san: params.san,
      fen: params.fen,
    });
    return result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Game not found') {
        throw new Error('Game not found');
      }
      if (error.message.includes('Invalid move')) {
        throw error;
      }
      throw new Error(error.message || 'Failed to make move');
    }
    throw new Error('Failed to make move');
  }
};

export interface MakeAiMoveParams {
  gameId: string;
  from: string;
  to: string;
  san?: string;
  fen?: string;
  promotion?: string;
}

export const makeAiMove = async (params: MakeAiMoveParams) => {
  try {
    const gameRepo = getGameRepository();
    const moveRepo = getMoveRepository();
    
    const game = await gameRepo.getById(params.gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const moves = await moveRepo.listMoves(params.gameId);
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

    // Check if promotion is required (pawn reaching 8th rank for white or 1st rank for black)
    const fromPiece = engine.getPiece(params.from);
    const targetRank = parseInt(params.to[1]);
    const isPawn = fromPiece?.type === 'p';
    const requiresPromotion = isPawn && (
      (fromPiece?.color === 'w' && targetRank === 8) ||
      (fromPiece?.color === 'b' && targetRank === 1)
    );
    
    // If promotion is required but not provided, default to queen
    const promotionPiece = requiresPromotion ? (params.promotion || 'q') : params.promotion;

    const moveResult = engine.makeMove(params.from, params.to, promotionPiece);
    if (!moveResult.success) {
      throw new Error(`Invalid AI move: ${moveResult.error || 'Unknown error'}`);
    }

    const moveNumber = moves.length + 1;
    const player1Color = game.player1Color || 'white';
    const aiPlayerColor = player1Color === 'white' ? 'black' : 'white';
    
    await moveRepo.addMove({
      gameId: params.gameId,
      moveNumber,
      from: params.from,
      to: params.to,
      san: params.san || moveResult.move?.san || '',
      fen: params.fen || engine.getFen(),
      timestamp: DateTime.local().toISO() || DateTime.local().toString(),
      playerColor: aiPlayerColor,
    });

    const boardState = engine.getBoardState();
    const capturedPieces = engine.getCapturedPieces();
    
    let winner: string | null = null;
    let result: string | null = null;
    
    if (boardState.isCheckmate) {
      const winningColor = boardState.turn === 'w' ? 'black' : 'white';
      
      if (game.mode === 'solo') {
        winner = winningColor === player1Color ? 'player1' : 'computer';
      } else {
        winner = winningColor === player1Color ? 'player1' : 'player2';
      }
      
      result = winningColor === 'white' ? '1-0' : '0-1';
    } else if (boardState.isDraw) {
      winner = 'draw';
      result = '1/2-1/2';
    }
    
    // Always update current turn and final FEN, even if game is not over
    await gameRepo.updateGameState(params.gameId, {
      finalFen: engine.getFen(),
      moveCount: moveNumber,
      currentTurn: boardState.turn === 'w' ? 'white' : 'black',
      capturedPiecesWhite: JSON.stringify(capturedPieces.white),
      capturedPiecesBlack: JSON.stringify(capturedPieces.black),
      ...(winner && { winner }),
      ...(result && { result })
    });

    return { 
      move: {
        gameId: params.gameId,
        moveNumber,
        from: params.from,
        to: params.to,
        san: params.san || moveResult.move?.san || '',
        fen: params.fen || engine.getFen(),
        timestamp: DateTime.local().toISO() || DateTime.local().toString(),
        playerColor: aiPlayerColor as 'white' | 'black',
      },
      isGameOver: boardState.isCheckmate || boardState.isDraw,
      winner: winner || undefined,
      result: result || undefined,
      capturedPieces: {
        white: capturedPieces.white,
        black: capturedPieces.black,
      },
      boardState: {
        fen: engine.getFen(),
        turn: boardState.turn,
        isCheck: boardState.isCheck,
        isCheckmate: boardState.isCheckmate,
        isDraw: boardState.isDraw,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to make AI move');
  }
};

export interface CalculateAiMoveParams {
  gameId: string;
  fen?: string;
}

export const calculateAiMove = async (params: CalculateAiMoveParams) => {
  try {
    const gameRepo = getGameRepository();
    
    const game = await gameRepo.getById(params.gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const currentFen = params.fen || game.finalFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    
    const engine = new ChessEngine(currentFen);
    const currentTurn = engine.getTurn();
    const player1Color = game.player1Color || 'white';
    const isComputerTurn = game.mode === 'solo' && 
                          ((currentTurn === 'w' && player1Color === 'black') || 
                           (currentTurn === 'b' && player1Color === 'white'));
    
    if (!isComputerTurn) {
      throw new Error('Not computer turn');
    }

    const boardState = engine.getBoardState();
    
    if (boardState.isCheckmate || boardState.isDraw) {
      throw new Error('Game is already over');
    }

    const aiEngine = new AIChessEngine(currentFen);
    const difficulty = (game.difficulty as AIDifficulty) || 'easy';
    const aiMove = aiEngine.getBestMove(difficulty);
    
    if (!aiMove) {
      throw new Error('No valid moves available');
    }

    return { 
      success: true,
      move: {
        from: aiMove.from,
        to: aiMove.to,
        san: aiMove.san,
        promotion: aiMove.promotion,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to calculate AI move');
  }
};

export interface VerifyGamePasswordParams {
  gameId: string;
  password: string;
}

export const verifyGamePassword = async (params: VerifyGamePasswordParams) => {
  if (!params.password || typeof params.password !== 'string') {
    throw new Error('Password is required');
  }

  try {
    const result = await verifyGamePasswordUseCase.execute({
      gameId: params.gameId,
      password: params.password,
    });
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === 'Game not found') {
      throw new Error('Game not found');
    }
    throw new Error('Failed to verify password');
  }
};

export interface ForfeitGameParams {
  gameId: string;
  winner: string | null;
  result: string;
  finalFen: string;
}

export const forfeitGame = async (params: ForfeitGameParams) => {
  if (!params.gameId || typeof params.gameId !== 'string') {
    throw new Error('gameId is required');
  }

  if (!params.result || typeof params.result !== 'string') {
    throw new Error('result is required');
  }

  if (!params.finalFen || typeof params.finalFen !== 'string') {
    throw new Error('finalFen is required');
  }

  try {
    const gameRepo = getGameRepository();
    
    const game = await gameRepo.getById(params.gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.winner !== null) {
      throw new Error('Game is already finished');
    }

    await gameRepo.finishGame(params.gameId, {
      winner: params.winner || undefined,
      result: params.result,
      finalFen: params.finalFen,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Game not found') {
        throw new Error('Game not found');
      }
      if (error.message === 'Game is already finished') {
        throw error;
      }
      throw new Error(error.message || 'Failed to forfeit game');
    }
    throw new Error('Failed to forfeit game');
  }
};