// Get History Use Case

import { Reward } from "@/domain/entities";
import { IRewardRepository } from "@/ports/repositories";

export interface GetRewardResponse {
  rewards: Reward[];
  total: number;
}

export class checkRewardsUseCase {
  constructor(private rewardRepository: IRewardRepository) {}

  async execute(type: string): Promise<GetRewardResponse> {
    const rewards = await this.rewardRepository.list(playerId, "ASC");
    const total = rewards.length;
    return {
      rewards,
      total,
    };
  }
}