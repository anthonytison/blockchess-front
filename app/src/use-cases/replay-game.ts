// Replay Game Use Case

import { GameWithPlayers, IGameRepository, IMoveRepository } from '@/ports/repositories';
import { GameState, BoardState, Player } from '@/domain/entities';
import { ChessEngine } from '@/lib/chess/engine';

export interface ReplayGameRequest {
  gameId: string;
  moveNumber?: number; // If specified, replay up to this move
}

export interface ReplayGameResponse {
  gameState: GameState;
}

export class ReplayGameUseCase {
  constructor(
    private gameRepository: IGameRepository,
    private moveRepository: IMoveRepository
  ) {}

  async execute(request: ReplayGameRequest): Promise<ReplayGameResponse> {
    // Get game
    const game: GameWithPlayers | null = await this.gameRepository.getByIdWithPlayers(request.gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    // Get all moves
    const allMoves = await this.moveRepository.listMoves(request.gameId);
    
    // Determine which moves to replay
    const movesToReplay = request.moveNumber 
      ? allMoves.slice(0, request.moveNumber)
      : allMoves;

    // Create chess engine and replay moves
    const engine = new ChessEngine();
    // Replay all moves, extracting promotion from SAN notation if present
    for (const move of movesToReplay) {
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

    // Get current board state
    const boardState: BoardState = engine.getBoardState();

    // Create players with cleaner structure
    const player1Color = game.player1Color || 'white';
    const player2Color = player1Color === 'white' ? 'black' : 'white';
    
    let players: Player[];
    let humanPlayer: Player;
    let computerPlayer: Player | undefined;

    if (game.mode === 'solo') {
      // Solo mode: Human vs Computer
      humanPlayer = {
        name: game.player1.name,
        color: player1Color as 'white' | 'black',
        isComputer: false,
        isHuman: true,
      };
      
      computerPlayer = {
        name: 'HAL',
        color: player2Color as 'white' | 'black',
        isComputer: true,
        isHuman: false,
      };
      
      players = [humanPlayer, computerPlayer];
    } else {
      // VS mode: Human vs Human
      const player1: Player = {
        name: game.player1.name || 'Player 1',
        color: player1Color as 'white' | 'black',
        isComputer: false,
        isHuman: true,
      };
      
      const player2: Player = {
        name: game.player2.name || 'Player 2',
        color: player2Color as 'white' | 'black',
        isComputer: false,
        isHuman: true,
      };
      
      players = [player1, player2];
      humanPlayer = player1; // In VS mode, both are human, but we need to track current player
    }

    const gameState: GameState = {
      game,
      moves: allMoves,
      currentPosition: movesToReplay.length,
      boardState,
      players,
      humanPlayer,
      computerPlayer,
    };

    return { gameState };
  }
}