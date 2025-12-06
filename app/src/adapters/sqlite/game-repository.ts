// SQLite implementation of IGameRepository

import { IGameRepository, GameWithPlayers } from '@/ports/repositories';
import { Game, PlayerEntity, PlayerStatistics } from '@/domain/entities';
import db from './database';
import { DateTime } from 'luxon';

export class SQLiteGameRepository implements IGameRepository {
  async create(gamePartial: Partial<Game>): Promise<Game> {
    const now = DateTime.local().toString();
    const game: Game = {
      createdAt: gamePartial.createdAt || now,
      updatedAt: now,
      mode: gamePartial.mode || 'vs',
      player1Id: gamePartial.player1Id || '',
      player2Id: gamePartial.player2Id || '',
      objectId: gamePartial.objectId || null,
      winner: null,
      result: null,
      finalFen: null,
      moveCount: 0,
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

    const stmt = db.prepare(`
      INSERT INTO games (
        created_at, updated_at, mode, player1_id, player2_id,
        object_id, winner, result, final_fen, move_count, password, timer_limit,
        current_turn, captured_pieces, player1_color, setup_data,
        difficulty, captured_pieces_white, captured_pieces_black
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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
      game.capturedPiecesBlack
    );

    return game;
  }

  async getById(id: string): Promise<Game | null> {
    const stmt = db.prepare(`
      SELECT * FROM games WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.mapRowToGame(row);
  }

  async getByIdWithPlayers(id: string): Promise<GameWithPlayers | null> {
    const stmt = db.prepare(`
      SELECT 
        g.*,
        p1.id as p1_id, p1.name as p1_name, p1.sui_address as p1_sui_address, p1.created_at as p1_created_at,
        p2.id as p2_id, p2.name as p2_name, p2.sui_address as p2_sui_address, p2.created_at as p2_created_at
      FROM games g
      INNER JOIN players p1 ON g.player1_id = p1.id
      INNER JOIN players p2 ON g.player2_id = p2.id
      WHERE g.id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.mapRowToGameWithPlayers(row);
  }

  async list(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Game[]> {
    const {
      limit = 50,
      offset = 0,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params || {};

    let query = 'SELECT * FROM games';
    const queryParams: any[] = [];

    // Add search filter - search by player IDs for now
    if (search) {
      query += ' WHERE (player1_id LIKE ? OR player2_id LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Add sorting
    const sortColumn = sortBy === 'createdAt' ? 'created_at' : 'updated_at';
    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const stmt = db.prepare(query);
    const rows = stmt.all(...queryParams) as any[];

    return rows.map(row => this.mapRowToGame(row));
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

    let query = `
      SELECT 
        g.*,
        p1.id as p1_id, p1.name as p1_name, p1.sui_address as p1_sui_address, p1.created_at as p1_created_at,
        p2.id as p2_id, p2.name as p2_name, p2.sui_address as p2_sui_address, p2.created_at as p2_created_at
      FROM games g
      INNER JOIN players p1 ON g.player1_id = p1.id
      INNER JOIN players p2 ON g.player2_id = p2.id
    `;
    const queryParams: any[] = [];

    // Add player filter
    if (playerId) {
      query += ' WHERE (g.player1_id = ? OR g.player2_id = ?)';
      queryParams.push(playerId, playerId);
    }

    // Add sorting
    const sortColumn = sortBy === 'createdAt' ? 'g.created_at' : 'g.updated_at';
    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const stmt = db.prepare(query);
    const rows = stmt.all(...queryParams) as any[];

    return rows.map(row => this.mapRowToGameWithPlayers(row));
  }

  async finishGame(
    id: string,
    update: {
      winner?: string;
      result?: string;
      finalFen?: string;
    }
  ): Promise<void> {
    const stmt = db.prepare(`
      UPDATE games 
      SET winner = ?, result = ?, final_fen = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      update.winner || null,
      update.result || null,
      update.finalFen || null,
      Date.now(),
      id
    );
  }

  async updateMoveCount(id: string, count: number): Promise<void> {
    const stmt = db.prepare(`
      UPDATE games 
      SET move_count = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(count, Date.now(), id);
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
    const stmt = db.prepare(`
      UPDATE games 
      SET object_id = COALESCE(?, object_id),
          final_fen = COALESCE(?, final_fen),
          move_count = COALESCE(?, move_count),
          current_turn = COALESCE(?, current_turn),
          winner = COALESCE(?, winner),
          result = COALESCE(?, result),
          captured_pieces_white = COALESCE(?, captured_pieces_white),
          captured_pieces_black = COALESCE(?, captured_pieces_black),
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      update.objectId || null,
      update.finalFen || null,
      update.moveCount || null,
      update.currentTurn || null,
      update.winner || null,
      update.result || null,
      update.capturedPiecesWhite || null,
      update.capturedPiecesBlack || null,
      Date.now(),
      id
    );
  }

  private mapRowToGame(row: any): Game {
    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      mode: row.mode,
      player1Id: row.player1_id,
      player2Id: row.player2_id,
      objectId: row.object_id,
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
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE 
          WHEN (g.player1_id = ? AND g.winner = 'player1') OR 
               (g.player2_id = ? AND g.winner = 'player2') 
          THEN 1 
        END) as games_won,
        COUNT(CASE 
          WHEN (g.player1_id = ? AND g.winner = 'player2') OR 
               (g.player2_id = ? AND g.winner = 'player1') OR
               (g.player1_id = ? AND g.winner = 'computer') OR
               (g.player2_id = ? AND g.winner = 'computer')
          THEN 1 
        END) as games_lost,
        COUNT(CASE 
          WHEN (g.player1_id = ? OR g.player2_id = ?) AND g.winner = 'draw' 
          THEN 1 
        END) as games_draw
      FROM games g
      WHERE (g.player1_id = ? OR g.player2_id = ?)
    `);

    const row = stmt.get(
      playerId, playerId, // for games_won
      playerId, playerId, playerId, playerId, // for games_lost
      playerId, playerId, // for games_draw
      playerId, playerId // for WHERE clause
    ) as any;

    return {
      totalGames: row.total_games || 0,
      gamesWon: row.games_won || 0,
      gamesLost: row.games_lost || 0,
      gamesDraw: row.games_draw || 0,
    };
  }
}