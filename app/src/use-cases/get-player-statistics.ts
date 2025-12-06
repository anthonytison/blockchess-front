// Get Player Statistics Use Case

import { PlayerStatistics } from '@/domain/entities';
import { IGameRepository } from '@/ports/repositories';

export interface GetPlayerStatisticsRequest {
  playerId: string;
}

export interface GetPlayerStatisticsResponse {
  statistics: PlayerStatistics;
}

export class GetPlayerStatisticsUseCase {
  constructor(private gameRepository: IGameRepository) {}

  async execute(request: GetPlayerStatisticsRequest): Promise<GetPlayerStatisticsResponse> {
    const statistics = await this.gameRepository.getPlayerStatistics(request.playerId);
    return {
      statistics,
    };
  }
}

