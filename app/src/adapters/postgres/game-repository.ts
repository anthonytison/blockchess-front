// PostgreSQL implementation of IGameRepository

import { IGameRepository, GameWithPlayers } from '@/ports/repositories';
import { Game, PlayerEntity, PlayerStatistics } from '@/domain/entities';
import { query } from './database';
import { DateTime } from 'luxon';

export class PostgresGameRepository implements IGameRepository {
  async create(gamePartial: Partial<Game>): Promise<Game> {
    const now = DateTime.local().toString();
    const game: Game = {
      createdAt: gamePartial.createdAt || now,
      updatedAt: gamePartial.updatedAt || now,
      mode: gamePartial.mode || 'solo',
      player1Id: gamePartial.player1Id || '',
      player2Id: gamePartial.player2Id || '',
      objectId: gamePartial.objectId || null,
      winner: gamePartial.winner || null,
      result: gamePartial.result || null,
      finalFen: gamePartial.finalFen || null,
      moveCount: gamePartial.moveCount || 0,
      password: gamePartial.password || null,
      timerLimit: gamePartial.timerLimit || null,
      currentTurn: gamePartial.currentTurn || 'white',
      capturedPieces: gamePartial.capturedPieces || '[]',
      player1Color: gamePartial.player1Color || 'white',
      setupData: gamePartial.setupData || '{}',
      difficulty: gamePartial.difficulty || 'easy',
      capturedPiecesWhite: gamePartial.capturedPiecesWhite || '[]',
      capturedPiecesBlack: gamePartial.capturedPiecesBlack || '[]',
    };

    const result = await query(
      `
      INSERT INTO games (
        created_at, updated_at, mode, player1_id, player2_id,
        object_id, winner, result, final_fen, move_count, password, timer_limit,
        current_turn, captured_pieces, player1_color, setup_data,
        difficulty, captured_pieces_white, captured_pieces_black
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `,
      [
        game.createdAt,
        game.updatedAt,
        game.mode,
        game.player1Id,
        game.player2Id,
        game.objectId || null,
        game.winner,
        game.result,
        game.finalFen,
        game.moveCount,
        game.password,
        game.timerLimit,
        game.currentTurn,
        game.capturedPieces,
        game.player1Color,
        game.setupData,
        game.difficulty,
        game.capturedPiecesWhite,
        game.capturedPiecesBlack,
      ]
    );

    return this.mapRowToGame(result.rows[0]);
  }

  async getById(id: string): Promise<Game | null> {
    const result = await query('SELECT * FROM games WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToGame(result.rows[0]);
  }

  async getByIdWithPlayers(id: string): Promise<GameWithPlayers | null> {
    const result = await query(
      `
      SELECT 
        g.*,
        p1.id as p1_id, p1.name as p1_name, p1.sui_address as p1_sui_address, p1.created_at as p1_created_at,
        p2.id as p2_id, p2.name as p2_name, p2.sui_address as p2_sui_address, p2.created_at as p2_created_at
      FROM games g
      INNER JOIN players p1 ON g.player1_id = p1.id
      INNER JOIN players p2 ON g.player2_id = p2.id
      WHERE g.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Debug: Log the raw row data to verify object_id is in the database
    const row = result.rows[0];
    console.log('[PostgresGameRepository] Raw database row for game:', {
      gameId: id,
      hasObjectId: 'object_id' in row,
      object_id: row.object_id,
      object_id_type: typeof row.object_id,
      allColumns: Object.keys(row).filter(key => key.includes('object') || key.includes('id'))
    });

    return this.mapRowToGameWithPlayers(row);
  }

  async list(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Game[]> {
    let query_text = 'SELECT * FROM games';
    const params: any[] = [];
    let paramIndex = 1;

    // Add search filter
    if (options?.search) {
      query_text += ` WHERE (player1_name ILIKE $${paramIndex} OR player2_name ILIKE $${paramIndex})`;
      params.push(`%${options.search}%`);
      paramIndex++;
    }

    // Add sorting
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    // Convert camelCase to snake_case for database column names
    const dbSortBy = sortBy === 'createdAt' ? 'created_at' : 
                     sortBy === 'updatedAt' ? 'updated_at' : sortBy;
    query_text += ` ORDER BY ${dbSortBy} ${sortOrder.toUpperCase()}`;

    // Add pagination
    if (options?.limit) {
      query_text += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options?.offset) {
      query_text += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await query(query_text, params);
    return result.rows.map((row: any) => this.mapRowToGame(row));
  }

  async finishGame(
    id: string,
    update: {
      winner?: string;
      result?: string;
      finalFen?: string;
    }
  ): Promise<void> {
    await query(`
      UPDATE games 
      SET winner = $1, result = $2, final_fen = $3, updated_at = $4::timestamp
      WHERE id = $5
    `, [
      update.winner || null,
      update.result || null,
      update.finalFen || null,
      DateTime.local().toISO() || DateTime.local().toString(),
      id
    ]);
  }

  async updateMoveCount(id: string, count: number): Promise<void> {
    await query(`
      UPDATE games 
      SET move_count = $1, updated_at = $2::timestamp
      WHERE id = $3
    `, [count, DateTime.local().toISO() || DateTime.local().toString(), id]);
  }

  async updateGameState(
    id: string,
    update: {
      objectId?: string;
      finalFen?: string;
      moveCount?: number;
      currentTurn?: string;
      winner?: string | null;
      result?: string | null;
      capturedPiecesWhite?: string;
      capturedPiecesBlack?: string;
    }
  ): Promise<void> {
    const setParts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (update.objectId !== undefined) {
      setParts.push(`object_id = $${paramIndex}`);
      params.push(update.objectId);
      paramIndex++;
    }

    if (update.finalFen !== undefined) {
      setParts.push(`final_fen = $${paramIndex}`);
      params.push(update.finalFen);
      paramIndex++;
    }

    if (update.moveCount !== undefined) {
      setParts.push(`move_count = $${paramIndex}`);
      params.push(update.moveCount);
      paramIndex++;
    }

    if (update.currentTurn !== undefined) {
      setParts.push(`current_turn = $${paramIndex}`);
      params.push(update.currentTurn);
      paramIndex++;
    }

    if (update.winner !== undefined) {
      setParts.push(`winner = $${paramIndex}`);
      params.push(update.winner);
      paramIndex++;
    }

    if (update.result !== undefined) {
      setParts.push(`result = $${paramIndex}`);
      params.push(update.result);
      paramIndex++;
    }

    if (update.capturedPiecesWhite !== undefined) {
      setParts.push(`captured_pieces_white = $${paramIndex}`);
      params.push(update.capturedPiecesWhite);
      paramIndex++;
    }

    if (update.capturedPiecesBlack !== undefined) {
      setParts.push(`captured_pieces_black = $${paramIndex}`);
      params.push(update.capturedPiecesBlack);
      paramIndex++;
    }

    if (setParts.length === 0) return;

    setParts.push(`updated_at = $${paramIndex}::timestamp`);
    params.push(DateTime.local().toISO() || DateTime.local().toString());
    paramIndex++;

    params.push(id);

    await query(`
      UPDATE games 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
    `, params);
  }

  async listWithPlayers(params?: {
    limit?: number;
    offset?: number;
    playerId?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<GameWithPlayers[]> {
    const {
      limit = 50,
      offset = 0,
      playerId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params || {};

    let queryText = `
      SELECT 
        g.*,
        p1.id as p1_id, p1.name as p1_name, p1.sui_address as p1_sui_address, p1.created_at as p1_created_at,
        p2.id as p2_id, p2.name as p2_name, p2.sui_address as p2_sui_address, p2.created_at as p2_created_at
      FROM games g
      INNER JOIN players p1 ON g.player1_id = p1.id
      INNER JOIN players p2 ON g.player2_id = p2.id
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add player filter
    if (playerId) {
      queryText += ` WHERE (g.player1_id = $${paramIndex} OR g.player2_id = $${paramIndex})`;
      queryParams.push(playerId);
      paramIndex++;
    }

    // Add sorting
    const sortColumn =
      sortBy === 'createdAt' ? 'g.created_at' : 'g.updated_at';
    queryText += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

    // Add pagination
    queryText += ` LIMIT $${paramIndex}`;
    queryParams.push(limit);
    paramIndex++;

    queryText += ` OFFSET $${paramIndex}`;
    queryParams.push(offset);

    const result = await query(queryText, queryParams);
    return result.rows.map((row: any) => this.mapRowToGameWithPlayers(row));
  }

  private mapRowToGame(row: any): Game {
    // Debug logging for object_id mapping
    if (row.object_id) {
      console.log('[PostgresGameRepository] Mapping game with object_id:', {
        gameId: row.id,
        object_id: row.object_id,
        object_id_type: typeof row.object_id,
        object_id_length: row.object_id?.length
      });
    } else {
      console.warn('[PostgresGameRepository] Game has no object_id:', {
        gameId: row.id,
        allKeys: Object.keys(row)
      });
    }
    
    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      mode: row.mode,
      player1Id: row.player1_id,
      player2Id: row.player2_id,
      objectId: row.object_id || null,
      winner: row.winner,
      result: row.result,
      finalFen: row.final_fen,
      moveCount: row.move_count,
      password: row.password,
      timerLimit: row.timer_limit,
      currentTurn: row.current_turn,
      capturedPieces: row.captured_pieces,
      player1Color: row.player1_color,
      setupData: row.setup_data,
      difficulty: row.difficulty,
      capturedPiecesWhite: row.captured_pieces_white,
      capturedPiecesBlack: row.captured_pieces_black,
    };
  }

  private mapRowToGameWithPlayers(row: any): GameWithPlayers {
    const game = this.mapRowToGame(row);
    const player1: PlayerEntity = {
      id: row.p1_id,
      name: row.p1_name,
      suiAddress: row.p1_sui_address,
      createdAt: row.p1_created_at,
    };
    const player2: PlayerEntity = {
      id: row.p2_id,
      name: row.p2_name,
      suiAddress: row.p2_sui_address,
      createdAt: row.p2_created_at,
    };

    return {
      ...game,
      player1,
      player2,
    };
  }

  async getPlayerStatistics(playerId: string): Promise<PlayerStatistics> {
    const result = await query(
      `
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE 
          WHEN (g.player1_id = $1 AND g.winner = 'player1') OR 
               (g.player2_id = $1 AND g.winner = 'player2') 
          THEN 1 
        END) as games_won,
        COUNT(CASE 
          WHEN (g.player1_id = $1 AND g.winner = 'player2') OR 
               (g.player2_id = $1 AND g.winner = 'player1') OR
               (g.player1_id = $1 AND g.winner = 'computer') OR
               (g.player2_id = $1 AND g.winner = 'computer')
          THEN 1 
        END) as games_lost,
        COUNT(CASE WHEN g.winner = 'draw' THEN 1 END) as games_draw
      FROM games g
      WHERE (g.player1_id = $1 OR g.player2_id = $1)
      `,
      [playerId]
    );

    const row = result.rows[0];
    return {
      totalGames: parseInt(row.total_games) || 0,
      gamesWon: parseInt(row.games_won) || 0,
      gamesLost: parseInt(row.games_lost) || 0,
      gamesDraw: parseInt(row.games_draw) || 0,
    };
  }
}
