// Create Reward Use Case

import { Reward } from "@/domain/entities";
import { IRewardRepository } from "@/ports/repositories";

export type CreateRewardRequest = Partial<Reward>;

export class CreateRewardUseCase {
  constructor(private rewardRepository: IRewardRepository) {}

  async execute(request: CreateRewardRequest): Promise<Reward> {
    return await this.rewardRepository.create(request);
  }
}