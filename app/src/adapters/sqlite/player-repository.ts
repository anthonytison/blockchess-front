// SQLite implementation of IPlayerRepository

import { IPlayerRepository } from '@/ports/repositories';
import { PlayerEntity } from '@/domain/entities';
import db from './database';
import { randomBytes } from 'crypto';

export class SQLitePlayerRepository implements IPlayerRepository {
  async create(playerPartial: Partial<PlayerEntity>): Promise<PlayerEntity> {
    const now = Date.now().toString();
    const player: PlayerEntity = {
      id: playerPartial.id || `player-${now}-${randomBytes(4).toString('hex')}`,
      name: playerPartial.name || '',
      suiAddress: playerPartial.suiAddress || null,
      createdAt: playerPartial.createdAt || now,
    };

    const stmt = db.prepare(`
      INSERT INTO players (id, name, sui_address, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(player.id, player.name, player.suiAddress, player.createdAt);

    return player;
  }
  
  async update(player: PlayerEntity): Promise<PlayerEntity> {
    
    const stmt = db.prepare('UPDATE players SET name = $1 WHERE id = $2 RETURNING *');

    stmt.run(player.name, player.id);

    return player;
  }

  async getById(id: string): Promise<PlayerEntity | null> {
    const stmt = db.prepare(`
      SELECT * FROM players WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      suiAddress: row.sui_address,
      createdAt: row.created_at,
    };
  }

  async getBySuiAddress(suiAddress: string): Promise<PlayerEntity | null> {
    const stmt = db.prepare(`
      SELECT * FROM players WHERE sui_address = ?
    `);

    const row = stmt.get(suiAddress) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      suiAddress: row.sui_address,
      createdAt: row.created_at,
    };
  }

  async getComputerPlayer(): Promise<PlayerEntity> {
    // Try to get existing computer player
    const stmt = db.prepare(`
      SELECT * FROM players WHERE sui_address IS NULL LIMIT 1
    `);

    const row = stmt.get() as any;

    if (row) {
      return {
        id: row.id,
        name: row.name,
        suiAddress: row.sui_address,
        createdAt: row.created_at,
      };
    }

    // Create computer player if it doesn't exist
    const computerPlayer: PlayerEntity = {
      id: process.env.NEXT_PUBLIC_HAL_ID as string,
      name: 'Computer',
      suiAddress: null,
      createdAt: Date.now().toString(),
    };

    const insertStmt = db.prepare(`
      INSERT INTO players (id, name, sui_address, created_at)
      VALUES (?, ?, ?, ?)
    `);

    insertStmt.run(
      computerPlayer.id,
      computerPlayer.name,
      computerPlayer.suiAddress,
      computerPlayer.createdAt
    );

    return computerPlayer;
  }

  async list(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<PlayerEntity[]> {
    const { limit = 50, offset = 0, search } = params || {};

    let query = 'SELECT * FROM players';
    const queryParams: any[] = [];

    // Add search filter
    if (search) {
      query += ' WHERE name LIKE ?';
      queryParams.push(`%${search}%`);
    }

    // Add sorting by created_at descending
    query += ' ORDER BY created_at DESC';

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const stmt = db.prepare(query);
    const rows = stmt.all(...queryParams) as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      suiAddress: row.sui_address,
      createdAt: row.created_at,
    }));
  }
}
