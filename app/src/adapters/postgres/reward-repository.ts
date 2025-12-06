// PostgreSQL implementation of IRewardRepository
// 
// Note: The rewards table has a foreign key constraint to players table with ON DELETE CASCADE.
// When a player is deleted, all associated rewards are automatically deleted by the database.

import { IRewardRepository } from '@/ports/repositories';
import { Reward } from '@/domain/entities';
import { query } from './database';
import { DateTime } from 'luxon';
import { rewardsList } from '@/lib/blockchain/rewards';

export class PostgresRewardRepository implements IRewardRepository {
  async create(rewardPartial: Partial<Reward>): Promise<Reward> {
    const now = DateTime.local().toString()
    const reward: Reward = {
      type: rewardPartial.type || "",
      playerId: rewardPartial.playerId || "",
      objectId: rewardPartial.objectId || "",
      createdAt: now
    };

    const result = await query(
      `
      INSERT INTO rewards (
        reward_type, player_id, object_id, created_at
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [reward.type, reward.playerId, reward.objectId, reward.createdAt]
    );

    return this.mapRowToReward(result.rows[0]);
  }

  async list(playerId: string, orderBy: 'ASC' | 'DESC'): Promise<Reward[]> {
    const orderByValue = orderBy === 'ASC' ? 'ASC' : 'DESC';
    const query_text = `SELECT * 
                      FROM rewards
                      WHERE player_id = $1
                      ORDER BY created_at ${orderByValue}`;

    const result = await query(query_text, [playerId]);
    return result.rows.map((row: any) => this.mapRowToReward(row));
  }

  async shouldEarnReward(suid: string, type: string): Promise<string | null>{

    let table: string = "";
    let badgeType: string = "";
    switch(type){
      case 'first_game':
        table = "vw_users_no_first_game"; // Check if user has started a game but still doesn't have the reward
        badgeType = "first_game";
      break;
      case 'first_game_created':
        table = "vw_users_no_first_game_created"; // Check if user has created a game but still doesn't have the reward
        badgeType = "first_game_created";
      break;
      case 'wins':
        table = "vw_users_victories" // Get how many wins the user has
      break;
    }

    // First, check if the reward already exists in the rewards table
    // This helps distinguish between "not eligible" vs "already earned"
    const playerResult = await query(
      `SELECT id FROM players WHERE sui_address = $1 LIMIT 1`,
      [suid]
    );
    
    if (playerResult.rows.length === 0) {
      console.log(`[shouldEarnReward] Player not found for suid ${suid}`);
      return null;
    }
    
    const playerId = playerResult.rows[0].id;
    
    // Check if reward already exists
    const existingRewardResult = await query(
      `SELECT id FROM rewards WHERE player_id = $1 AND reward_type = $2 LIMIT 1`,
      [playerId, badgeType || type]
    );
    
    if (existingRewardResult.rows.length > 0) {
      console.log(`[shouldEarnReward] Reward ${badgeType || type} already exists for player ${playerId}`);
      return null; // Already earned
    }

    let query_text = `SELECT * 
                      FROM ${table}
                      WHERE suid = $1
                      LIMIT 1`
    const result = await query(query_text, [suid]);
    
    console.log(`[shouldEarnReward] Checking ${type} for suid ${suid}, table: ${table}, rows: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.log(`[shouldEarnReward] View result:`, result.rows[0]);
    }
    
    const rowsLength: number = result.rows.length;
    
    if(type !== "wins"){
      // If view returns rows, player is eligible and hasn't earned the reward yet
      const shouldEarn = rowsLength > 0 ? badgeType : null;
      if (!shouldEarn) {
        console.log(`[shouldEarnReward] View returned 0 rows - player may not have games yet or view not updated`);
      }
      console.log(`[shouldEarnReward] Should earn ${type}? ${shouldEarn ? 'YES' : 'NO'}`);
      return shouldEarn;
    }else{
      if (rowsLength === 0) {
        return null;
      }

      const victoryRow = result.rows[0];
      console.log(`[shouldEarnReward] Victory row for ${suid}:`, victoryRow);
      // Calculate total wins from the view columns (fallback if total column doesn't exist)
      const totalWins = victoryRow.total || 0;
      console.log(`[shouldEarnReward] Total wins: ${totalWins}`);

      const earnedRewards = await this.list(victoryRow.player_id, 'ASC');
      const earnedRewardTypes = new Set(earnedRewards.map(r => r.type));
      console.log(`[shouldEarnReward] Earned reward types:`, Array.from(earnedRewardTypes));
      
      const winsRewards = rewardsList.filter(
        reward => reward.conditions.check === "wins"
      );
      console.log(`[shouldEarnReward] Available wins rewards:`, winsRewards.map(r => ({ badge_type: r.nft.badge_type, value: r.conditions.value })));

      const nextReward = winsRewards.find(
        reward => !earnedRewardTypes.has(reward.nft.badge_type)
      );
      console.log(`[shouldEarnReward] Next reward to earn:`, nextReward ? { badge_type: nextReward.nft.badge_type, required_wins: nextReward.conditions.value } : 'None (all earned)');

      if (!nextReward) {
        console.log(`[shouldEarnReward] No next reward found - all wins rewards already earned`);
        return null;
      }

      const shouldEarn = Number(totalWins) >= Number(nextReward.conditions.value);
      console.log(`[shouldEarnReward] Should earn ${nextReward.nft.badge_type}? ${shouldEarn} (${totalWins} wins >= ${nextReward.conditions.value} required)`);

      return shouldEarn ? nextReward.nft.badge_type : null;
    }
  }

  private mapRowToReward(row: any): Reward {
    return {
      id: row.id,
      createdAt: row.created_at,
      type: row.reward_type,
      playerId: row.player_id,
      objectId: row.object_id
    };
  }
}
