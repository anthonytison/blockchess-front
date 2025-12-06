// Start Game Use Case

import { IGameRepository, IPlayerRepository, IClock } from '@/ports/repositories';
import { Game, Mode } from '@/domain/entities';
import { PasswordService } from '@/lib/services/password-service';

export interface StartGameRequest {
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

export interface StartGameResponse {
  game: Game;
}

export class StartGameUseCase {
  constructor(
    private gameRepository: IGameRepository,
    private playerRepository: IPlayerRepository,
    private clock: IClock
  ) {}

  async execute(request: StartGameRequest): Promise<StartGameResponse> {
    const now = this.clock.now();

    // Validate player1 exists
    const player1 = await this.playerRepository.getById(request.player1Id);
    if (!player1) {
      throw new Error('Player 1 not found');
    }

    let player2Id: string;

    if (request.mode === 'solo') {
      // For solo mode, automatically get computer player as player2
      const computerPlayer = await this.playerRepository.getComputerPlayer();
      player2Id = computerPlayer.id as string;
    } else {
      // For vs mode, validate player2Id is provided and exists
      if (!request.player2Id) {
        throw new Error('Player 2 ID is required for vs mode');
      }
      const player2 = await this.playerRepository.getById(request.player2Id);
      if (!player2) {
        throw new Error('Player 2 not found');
      }
      player2Id = request.player2Id;
    }

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (request.password && request.password.trim() !== '') {
      hashedPassword = await PasswordService.hashPassword(request.password);
    }

    // TODO : create the game on the blockchain

    const game = await this.gameRepository.create({
      mode: request.mode,
      player1Id: request.player1Id,
      player2Id: player2Id,
      objectId: request.objectId || null,
      password: hashedPassword,
      timerLimit: request.timerLimit,
      currentTurn: 'white',
      capturedPieces: '[]',
      player1Color: request.player1Color || 'white',
      setupData: request.setupData || '{}',
      difficulty: request.difficulty || 'easy',
      capturedPiecesWhite: '[]',
      capturedPiecesBlack: '[]',
      createdAt: now,
      updatedAt: now,
    });

    return { game };
  }
}