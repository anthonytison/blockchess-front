// Should Earn Reward Use Case

import { IRewardRepository } from "@/ports/repositories";

export class ShouldEarnRewardUseCase {
  constructor(private rewardRepository: IRewardRepository) {}

  async execute(suid: string, type: string): Promise<string | null> {
    return await this.rewardRepository.shouldEarnReward(suid, type);
  }
}