// PostgreSQL implementation of IMoveRepository

import { IMoveRepository } from '@/ports/repositories';
import { Move } from '@/domain/entities';
import { query } from './database';
import { DateTime } from 'luxon';

export class PostgresMoveRepository implements IMoveRepository {
  async addMove(move: Move): Promise<Move> {
    // Ensure timestamp is a proper ISO string for PostgreSQL TIMESTAMP
    // Convert to ISO format if it's not already, or if it's a number (legacy data)
    let timestampValue: string;
    
    // Log the incoming timestamp for debugging
    console.log('[PostgresMoveRepository.addMove] Incoming timestamp:', {
      value: move.timestamp,
      type: typeof move.timestamp,
      isNumericString: typeof move.timestamp === 'string' && /^\d+$/.test(move.timestamp),
    });
    
    // Check if timestamp is a numeric string (like "1764285117870")
    const isNumericString = typeof move.timestamp === 'string' && /^\d+$/.test(move.timestamp);
    
    if (isNumericString) {
      // Convert numeric string to ISO timestamp
      const numericValue = parseInt(move.timestamp, 10);
      console.log('[PostgresMoveRepository.addMove] Converting numeric string to ISO:', numericValue);
      timestampValue = DateTime.fromMillis(numericValue).toISO() || DateTime.local().toISO() || DateTime.local().toString();
    } else if (typeof move.timestamp === 'string') {
      // If it's already a string, try to parse and convert to ISO if needed
      const parsed = DateTime.fromISO(move.timestamp);
      if (parsed.isValid) {
        timestampValue = parsed.toISO() || move.timestamp;
      } else {
        // If it's not a valid ISO string, check if it might be a numeric string that wasn't caught
        if (/^\d+$/.test(move.timestamp.trim())) {
          console.log('[PostgresMoveRepository.addMove] Found numeric string in invalid format, converting:', move.timestamp);
          const numericValue = parseInt(move.timestamp.trim(), 10);
          timestampValue = DateTime.fromMillis(numericValue).toISO() || DateTime.local().toISO() || DateTime.local().toString();
        } else {
          // If it's not a valid ISO string, use current time as fallback
          console.warn('[PostgresMoveRepository.addMove] Invalid timestamp format, using current time:', move.timestamp);
          timestampValue = DateTime.local().toISO() || DateTime.local().toString();
        }
      }
    } else if (typeof move.timestamp === 'number') {
      // Handle legacy numeric timestamps - convert to ISO string
      console.log('[PostgresMoveRepository.addMove] Converting numeric timestamp to ISO:', move.timestamp);
      timestampValue = DateTime.fromMillis(move.timestamp).toISO() || DateTime.local().toISO() || DateTime.local().toString();
    } else {
      // Fallback to current time
      console.warn('[PostgresMoveRepository.addMove] Unknown timestamp type, using current time:', move.timestamp);
      timestampValue = DateTime.local().toISO() || DateTime.local().toString();
    }
    
    // Final validation - ensure we have a valid ISO string
    if (!timestampValue || timestampValue.length < 10 || /^\d+$/.test(timestampValue)) {
      console.warn('[PostgresMoveRepository.addMove] Invalid timestamp value after conversion, using current time:', timestampValue);
      timestampValue = DateTime.local().toISO() || DateTime.local().toString();
    }
    
    console.log('[PostgresMoveRepository.addMove] Final timestamp value:', timestampValue);

    // Ensure timestampValue is a valid ISO string (not numeric)
    // Double-check before inserting
    if (!timestampValue || /^\d+$/.test(timestampValue)) {
      console.error('[PostgresMoveRepository.addMove] CRITICAL: Invalid timestamp before insert:', timestampValue);
      timestampValue = DateTime.local().toISO() || DateTime.local().toString();
    }
    
    // Validate it's a proper ISO format
    const testParse = DateTime.fromISO(timestampValue);
    if (!testParse.isValid) {
      console.error('[PostgresMoveRepository.addMove] CRITICAL: Timestamp is not valid ISO format:', timestampValue);
      timestampValue = DateTime.local().toISO() || DateTime.local().toString();
    }

    const result = await query(`
      INSERT INTO moves (
        game_id, move_number, from_sq, to_sq, san, fen, timestamp, player_color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp, $8)
      RETURNING *
    `, [
      move.gameId,
      move.moveNumber,
      move.from,
      move.to,
      move.san,
      move.fen,
      timestampValue,
      move.playerColor
    ]);

    return this.mapRowToMove(result.rows[0]);
  }

  async listMoves(gameId: string): Promise<Move[]> {
    const result = await query(`
      SELECT * FROM moves 
      WHERE game_id = $1 
      ORDER BY move_number ASC
    `, [gameId]);

    return result.rows.map((row: any) => this.mapRowToMove(row));
  }

  async getMoveByNumber(gameId: string, moveNumber: number): Promise<Move | null> {
    const result = await query(`
      SELECT * FROM moves 
      WHERE game_id = $1 AND move_number = $2
    `, [gameId, moveNumber]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMove(result.rows[0]);
  }

  private mapRowToMove(row: any): Move {
    // Convert timestamp to string format - handle both TIMESTAMP and BIGINT columns
    let timestamp: string;
    
    // Check if it's a numeric string (shouldn't happen from DB, but handle it anyway)
    if (typeof row.timestamp === 'string' && /^\d+$/.test(row.timestamp)) {
      // Numeric string from database - convert to ISO
      const numericValue = parseInt(row.timestamp, 10);
      timestamp = DateTime.fromMillis(numericValue).toISO() || DateTime.local().toISO() || DateTime.local().toString();
    } else if (typeof row.timestamp === 'string') {
      // Already a string - use it directly (should be ISO format from TIMESTAMP column)
      timestamp = row.timestamp;
    } else if (typeof row.timestamp === 'number') {
      // Legacy BIGINT timestamp - convert to ISO string
      timestamp = DateTime.fromMillis(row.timestamp).toISO() || DateTime.local().toISO() || DateTime.local().toString();
    } else if (row.timestamp instanceof Date) {
      // Date object from PostgreSQL
      timestamp = DateTime.fromJSDate(row.timestamp).toISO() || DateTime.local().toISO() || DateTime.local().toString();
    } else {
      // Fallback
      timestamp = DateTime.local().toISO() || DateTime.local().toString();
    }

    return {
      id: row.id,
      gameId: row.game_id,
      moveNumber: row.move_number,
      from: row.from_sq,
      to: row.to_sq,
      san: row.san,
      fen: row.fen,
      timestamp,
      playerColor: row.player_color,
    };
  }
}