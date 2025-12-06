// PostgreSQL implementation of IPlayerRepository

import { IPlayerRepository } from '@/ports/repositories';
import { PlayerEntity } from '@/domain/entities';
import { query } from './database';
import { DateTime } from 'luxon';

export class PostgresPlayerRepository implements IPlayerRepository {
  async create(playerPartial: Partial<PlayerEntity>): Promise<PlayerEntity> {
    const now = DateTime.local().toString()
    const player: PlayerEntity = {
      name: playerPartial.name || '',
      suiAddress: playerPartial.suiAddress || null,
      createdAt: playerPartial.createdAt || now,
    };

    try {
      const result = await query(
        `
        INSERT INTO players (name, sui_address, created_at)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
        [player.name, player.suiAddress, player.createdAt]
      );

      return this.mapRowToPlayer(result.rows[0]);
    } catch (error: any) {
      // Handle unique constraint violation for sui_address
      if (error.code === '23505' && error.constraint === 'players_sui_address_key') {
        throw new Error('A player with this Sui address already exists');
      }
      throw error;
    }
  }
  async update(player: PlayerEntity): Promise<PlayerEntity> {
    try {
      const result = await query('UPDATE players SET name = $1 WHERE id = $2 RETURNING *',
        [player.name, player.id]
      );

      return this.mapRowToPlayer(result.rows[0]);
    } catch (error: any) {
      throw error;
    }
  }

  async getById(id: string): Promise<PlayerEntity | null> {
    const result = await query('SELECT * FROM players WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPlayer(result.rows[0]);
  }

  async getBySuiAddress(suiAddress: string): Promise<PlayerEntity | null> {
    const result = await query('SELECT * FROM players WHERE sui_address = $1', [
      suiAddress,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPlayer(result.rows[0]);
  }

  async getComputerPlayer(): Promise<PlayerEntity> {
    const now = DateTime.local().toString()
    // Try to get existing computer player
    const result = await query(
      'SELECT * FROM players WHERE sui_address IS NULL LIMIT 1'
    );

    if (result.rows.length > 0) {
      return this.mapRowToPlayer(result.rows[0]);
    }

    // Create computer player if it doesn't exist
    // Use a default ID if NEXT_PUBLIC_HAL_ID is not set
    const computerPlayerId = process.env.NEXT_PUBLIC_HAL_ID || 'computer-player';
    const computerPlayer: PlayerEntity = {
      id: computerPlayerId,
      name: 'Computer',
      suiAddress: null,
      createdAt: now,
    };

    try {
      const insertResult = await query(
        `
        INSERT INTO players (id, name, sui_address, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
        [
          computerPlayer.id,
          computerPlayer.name,
          computerPlayer.suiAddress,
          computerPlayer.createdAt,
        ]
      );

      if (insertResult.rows.length === 0) {
        throw new Error('Failed to create computer player: no rows returned');
      }

      return this.mapRowToPlayer(insertResult.rows[0]);
    } catch (error: any) {
      // If another process created it concurrently, fetch it
      if (error.code === '23505') {
        const retryResult = await query(
          'SELECT * FROM players WHERE sui_address IS NULL LIMIT 1'
        );
        
        if (retryResult.rows.length === 0) {
          throw new Error('Computer player not found after concurrent creation attempt');
        }
        
        return this.mapRowToPlayer(retryResult.rows[0]);
      }
      throw error;
    }
  }

  async list(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<PlayerEntity[]> {
    const { limit = 50, offset = 0, search } = params || {};

    let queryText = 'SELECT * FROM players';
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      queryText += ` WHERE name ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add sorting by created_at descending
    queryText += ' ORDER BY created_at DESC';

    // Add pagination
    queryText += ` LIMIT $${paramIndex}`;
    queryParams.push(limit);
    paramIndex++;

    queryText += ` OFFSET $${paramIndex}`;
    queryParams.push(offset);

    const result = await query(queryText, queryParams);
    return result.rows.map((row: any) => this.mapRowToPlayer(row));
  }

  private mapRowToPlayer(row: any): PlayerEntity {
    return {
      id: row.id,
      name: row.name,
      suiAddress: row.sui_address,
      createdAt: row.created_at,
    };
  }
}
