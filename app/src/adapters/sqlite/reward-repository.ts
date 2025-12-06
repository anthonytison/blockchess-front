// SQLite implementation of IRewardRepository

import { IRewardRepository } from '@/ports/repositories';
import { Reward } from '@/domain/entities';
import db from './database';
import { DateTime } from 'luxon';
import { rewardsList } from '@/lib/blockchain/rewards';

export class SQLiteRewardRepository implements IRewardRepository {
  async create(rewardPartial: Partial<Reward>): Promise<Reward> {
     const now = DateTime.local().toString()
    const reward: Reward = {
      type: rewardPartial.type || "",
      playerId: rewardPartial.playerId || "",
      objectId: rewardPartial.objectId || "",
      createdAt: now
    };
    const stmt = db.prepare(`
      INSERT INTO rewards (
        reward_type, player_id, object_id, created_at
      ) VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      reward.type, reward.playerId, reward.objectId, reward.createdAt
    );

    return {
      ...reward,
      id: result.lastInsertRowid as unknown as string
    };
  }

  async list(playerId: string, orderBy: 'ASC' | 'DESC'): Promise<Reward[]> {
    const orderByValue = orderBy === 'ASC' ? 'ASC' : 'DESC';
    const query_text = `SELECT * 
                      FROM rewards
                      WHERE player_id = ?
                      ORDER BY created_at ${orderByValue}`
    
    const stmt = db.prepare(query_text);
    const rows = stmt.all(playerId) as any[];
    return rows.map((row: any) => this.mapRowToReward(row));
  }

  async shouldEarnReward(suid: string, type: string): Promise<string | null> {
    let badgeType: string = "";
    switch(type){
      case 'first_game':
        badgeType = "first_game";
        break;
      case 'first_game_created':
        badgeType = "first_game_created";
        break;
      case 'wins':
        badgeType = "";
        break;
    }

    // First, check if the player exists
    const playerStmt = db.prepare(`SELECT id FROM players WHERE sui_address = ? LIMIT 1`);
    const playerRow = playerStmt.get(suid) as any;
    
    if (!playerRow) {
      console.log(`[shouldEarnReward] Player not found for suid ${suid}`);
      return null;
    }
    
    const playerId = playerRow.id;
    
    // Check if reward already exists
    if (badgeType) {
      const existingRewardStmt = db.prepare(
        `SELECT id FROM rewards WHERE player_id = ? AND reward_type = ? LIMIT 1`
      );
      const existingReward = existingRewardStmt.get(playerId, badgeType) as any;
      
      if (existingReward) {
        console.log(`[shouldEarnReward] Reward ${badgeType} already exists for player ${playerId}`);
        return null; // Already earned
      }
    }

    if(type !== "wins"){
      // For first_game: Check if player has participated in a game
      if (type === 'first_game') {
        const gameStmt = db.prepare(`
          SELECT COUNT(*) as count
          FROM games
          WHERE (player1_id = ? OR player2_id = ?)
          LIMIT 1
        `);
        const gameRow = gameStmt.get(playerId, playerId) as any;
        const hasPlayed = (gameRow?.count || 0) > 0;
        
        if (hasPlayed) {
          console.log(`[shouldEarnReward] Should earn ${type}? YES`);
          return badgeType;
        } else {
          console.log(`[shouldEarnReward] Player has not played any games yet`);
          return null;
        }
      }
      
      // For first_game_created: Check if player has created a game (as player1)
      if (type === 'first_game_created') {
        const gameStmt = db.prepare(`
          SELECT COUNT(*) as count
          FROM games
          WHERE player1_id = ?
          LIMIT 1
        `);
        const gameRow = gameStmt.get(playerId) as any;
        const hasCreated = (gameRow?.count || 0) > 0;
        
        if (hasCreated) {
          console.log(`[shouldEarnReward] Should earn ${type}? YES`);
          return badgeType;
        } else {
          console.log(`[shouldEarnReward] Player has not created any games yet`);
          return null;
        }
      }
      
      return null;
    } else {
      // For wins: Count victories and check against rewards list
      const victoryStmt = db.prepare(`
        SELECT COUNT(*) as total
        FROM games
        WHERE ((player1_id = ? AND winner = 'player1') OR 
               (player2_id = ? AND winner = 'player2'))
      `);
      const victoryRow = victoryStmt.get(playerId, playerId) as any;
      const totalWins = victoryRow?.total || 0;
      
      if (totalWins === 0) {
        console.log(`[shouldEarnReward] Player has no wins`);
        return null;
      }

      console.log(`[shouldEarnReward] Total wins: ${totalWins}`);

      const earnedRewards = await this.list(playerId, 'ASC');
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