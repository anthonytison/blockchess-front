// Create Player Use Case

import { IPlayerRepository, IClock } from '@/ports/repositories';
import { PlayerEntity, validatePlayerName, validateSuiAddress } from '@/domain/entities';

export interface CreatePlayerRequest {
  name: string;
  suiAddress: string;
}

export interface CreatePlayerResponse {
  player: PlayerEntity;
}

export class CreatePlayerUseCase {
  constructor(
    private playerRepository: IPlayerRepository,
    private clock: IClock
  ) {}

  async execute(request: CreatePlayerRequest): Promise<CreatePlayerResponse> {
    // Validate player name length
    if (!validatePlayerName(request.name)) {
      throw new Error('Player name must be between 2 and 50 characters');
    }

    // Validate Sui address format
    if (!validateSuiAddress(request.suiAddress)) {
      throw new Error('Invalid Sui address format');
    }

    // Check for existing player with same Sui address
    const existingPlayer = await this.playerRepository.getBySuiAddress(
      request.suiAddress
    );
    if (existingPlayer) {
      throw new Error('A player with this Sui address already exists');
    }

    // Create player with generated ID and timestamp
    const now = this.clock.now();
    const player = await this.playerRepository.create({
      name: request.name,
      suiAddress: request.suiAddress,
      createdAt: now,
    });

    return { player };
  }
}
