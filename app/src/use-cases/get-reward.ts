// Get History Use Case

import { Reward } from "@/domain/entities";
import { IRewardRepository } from "@/ports/repositories";

export interface GetRewardResponse {
  rewards: Reward[];
  total: number;
}

export class GetRewardUseCase {
  constructor(private rewardRepository: IRewardRepository) {}

  async execute(playerId: string): Promise<GetRewardResponse> {
    const rewards = await this.rewardRepository.list(playerId, "ASC");
    const total = rewards.length;
    return {
      rewards,
      total,
    };
  }
}