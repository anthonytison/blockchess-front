// Get Or Create Computer Player Use Case

import { IPlayerRepository } from '@/ports/repositories';
import { PlayerEntity } from '@/domain/entities';

export interface GetOrCreateComputerPlayerResponse {
  player: PlayerEntity;
}

export class GetOrCreateComputerPlayerUseCase {
  constructor(private playerRepository: IPlayerRepository) {}

  async execute(): Promise<GetOrCreateComputerPlayerResponse> {
    // The repository handles the get-or-create logic
    const player = await this.playerRepository.getComputerPlayer();
    return { player };
  }
}
