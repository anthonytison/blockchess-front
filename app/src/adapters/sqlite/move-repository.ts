// SQLite implementation of IMoveRepository

import { IMoveRepository } from '@/ports/repositories';
import { Move } from '@/domain/entities';
import db from './database';

export class SQLiteMoveRepository implements IMoveRepository {
  async addMove(move: Move): Promise<Move> {
    const stmt = db.prepare(`
      INSERT INTO moves (
        game_id, move_number, from_sq, to_sq, san, fen, timestamp, player_color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      move.gameId,
      move.moveNumber,
      move.from,
      move.to,
      move.san,
      move.fen,
      move.timestamp,
      move.playerColor
    );

    return {
      ...move,
      id: result.lastInsertRowid as number,
    };
  }

  async listMoves(gameId: string): Promise<Move[]> {
    const stmt = db.prepare(`
      SELECT * FROM moves 
      WHERE game_id = ? 
      ORDER BY move_number ASC
    `);

    const rows = stmt.all(gameId) as any[];

    return rows.map(row => ({
      id: row.id,
      gameId: row.game_id,
      moveNumber: row.move_number,
      from: row.from_sq,
      to: row.to_sq,
      san: row.san,
      fen: row.fen,
      timestamp: row.timestamp,
      playerColor: row.player_color,
    }));
  }

  async getMoveByNumber(gameId: string, moveNumber: number): Promise<Move | null> {
    const stmt = db.prepare(`
      SELECT * FROM moves 
      WHERE game_id = ? AND move_number = ?
    `);

    const row = stmt.get(gameId, moveNumber) as any;
    if (!row) return null;

    return {
      id: row.id,
      gameId: row.game_id,
      moveNumber: row.move_number,
      from: row.from_sq,
      to: row.to_sq,
      san: row.san,
      fen: row.fen,
      timestamp: row.timestamp,
      playerColor: row.player_color,
    };
  }
}