// Get History Use Case

import { IGameRepository, GameWithPlayers } from '@/ports/repositories';

export interface GetHistoryRequest {
  limit?: number;
  offset?: number;
  playerId?: string;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GetHistoryResponse {
  games: GameWithPlayers[];
  total: number;
}

export class GetHistoryUseCase {
  constructor(private gameRepository: IGameRepository) {}

  async execute(request: GetHistoryRequest = {}): Promise<GetHistoryResponse> {
    const games = await this.gameRepository.listWithPlayers(request);

    // For simplicity, we'll return the games count as total
    // In a real app, you'd want a separate count query
    const total = games.length;

    return {
      games,
      total,
    };
  }
}