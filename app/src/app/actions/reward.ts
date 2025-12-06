'use server'

import { Reward } from '@/domain/entities';
import {
  shouldEarnRewardUseCase,
  createRewardUseCase,
  getRewardUseCase,
  getPlayerStatisticsUseCase,
  getPlayerBySuiAddressUseCase,
} from '@/lib/di';
import { rewardsList } from '@/lib/blockchain/rewards';

export const shouldEarnReward = async (
  suid: string,
  type: string
): Promise<string | null> => {
  return await shouldEarnRewardUseCase.execute(suid, type);
};

export const saveReward = async (reward: Partial<Reward>): Promise<Reward> => {
  return await createRewardUseCase.execute(reward);
};

export interface GetRewardsParams {
  suiAddress: string;
}

export interface GetRewardsResponse {
  statistics: any;
  rewards: any[];
  earnedCount: number;
}

export const getRewards = async (params: GetRewardsParams): Promise<GetRewardsResponse> => {
  if (!params.suiAddress) {
    throw new Error('suiAddress is required');
  }

  try {
    const playerResult = await getPlayerBySuiAddressUseCase.execute({
      suiAddress: params.suiAddress,
    });
    
    if (!playerResult.player || !playerResult.player.id) {
      throw new Error('Player not found');
    }

    const playerId = playerResult.player.id;

    const statisticsResult = await getPlayerStatisticsUseCase.execute({ playerId });

    const rewardsResult = await getRewardUseCase.execute(playerId);
    const earnedRewardTypes = new Set(rewardsResult.rewards.map(r => r.type));

    const allRewards = rewardsList.map(reward => {
      const badgeType = reward.nft.badge_type;
      const isEarned = earnedRewardTypes.has(badgeType);
      const earnedReward = rewardsResult.rewards.find(r => r.type === badgeType);
      
      return {
        ...reward.nft,
        isEarned,
        earnedAt: isEarned && earnedReward ? earnedReward.createdAt : null,
        objectId: isEarned && earnedReward ? earnedReward.objectId : null,
      };
    });

    return {
      statistics: statisticsResult.statistics,
      rewards: allRewards,
      earnedCount: rewardsResult.total,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch rewards');
  }
};

export interface CheckRewardExistsParams {
  playerId: string;
  rewardType: string;
}

export interface CheckRewardExistsResponse {
  exists: boolean;
  earnedRewardTypes: string[];
}

/**
 * Check if a specific reward exists for a player
 * Used by client-side mint queue to avoid importing database code
 */
export const checkRewardExists = async (
  params: CheckRewardExistsParams
): Promise<CheckRewardExistsResponse> => {
  try {
    const rewardsResult = await getRewardUseCase.execute(params.playerId);
    const earnedRewardTypes = rewardsResult.rewards.map(r => r.type);
    
    // Map reward types to badge types
    const badgeTypeMap: Record<string, string> = {
      'first_game': 'first_game',
      'first_game_created': 'first_game_created',
      'wins': 'first_game_won' // This is checked dynamically, but we return all wins rewards
    };
    
    const targetBadgeType = badgeTypeMap[params.rewardType];
    
    // For wins, check if any wins-related reward exists
    if (params.rewardType === "wins") {
      const winsRewards = ['first_game_won', '10_games_won', '50_games_won', '100_games_won'];
      const hasAnyWinsReward = winsRewards.some(rt => earnedRewardTypes.includes(rt));
      return {
        exists: hasAnyWinsReward,
        earnedRewardTypes,
      };
    }
    
    // For other types, check if the specific reward exists
    const exists = targetBadgeType ? earnedRewardTypes.includes(targetBadgeType) : false;
    
    return {
      exists,
      earnedRewardTypes,
    };
  } catch (error) {
    console.error('Error checking reward exists:', error);
    // On error, return false to allow enqueueing (fail-safe)
    return {
      exists: false,
      earnedRewardTypes: [],
    };
  }
};

