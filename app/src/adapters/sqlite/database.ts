// SQLite database setup and connection

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL || process.env.BASE_PATH + '/data/blockchess.db';

// Lazy database connection - only created when actually needed
let dbInstance: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (!dbInstance) {
    // Ensure data directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create database connection
    dbInstance = new Database(DB_PATH);

    // Enable foreign keys
    dbInstance.pragma('foreign_keys = ON');
    
    // Initialize database schema
    initializeDatabase(dbInstance);
  }
  
  return dbInstance;
}

// Export getter function instead of direct instance
export const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    return getDatabase()[prop as keyof Database.Database];
  }
});

// Initialize database schema
export function initializeDatabase(database: Database.Database = getDatabase()) {
  // Create players table
  database.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sui_address TEXT UNIQUE,
      created_at INTEGER NOT NULL
    )
  `);

  // Create indexes for players table
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_sui_address ON players(sui_address);
    CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at);
    CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
  `);

  // Create games table
  database.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('solo', 'vs')),
      player1_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      player2_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      object_id TEXT,
      winner TEXT CHECK (winner IN ('player1', 'player2', 'computer', 'draw') OR winner IS NULL),
      result TEXT CHECK (result IN ('1-0', '0-1', '1/2-1/2') OR result IS NULL),
      final_fen TEXT,
      move_count INTEGER DEFAULT 0,
      password TEXT,
      timer_limit INTEGER,
      current_turn TEXT CHECK (current_turn IN ('white', 'black') OR current_turn IS NULL),
      captured_pieces TEXT,
      player1_color TEXT CHECK (player1_color IN ('white', 'black') OR player1_color IS NULL),
      setup_data TEXT,
      difficulty TEXT CHECK (difficulty IN ('easy', 'intermediate', 'hard') OR difficulty IS NULL),
      captured_pieces_white TEXT,
      captured_pieces_black TEXT
    )
  `);

  // Create indexes for games table
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_games_player1_id ON games(player1_id);
    CREATE INDEX IF NOT EXISTS idx_games_player2_id ON games(player2_id);
    CREATE INDEX IF NOT EXISTS idx_games_object_id ON games(object_id);
    CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at);
    CREATE INDEX IF NOT EXISTS idx_games_mode ON games(mode);
    CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner);
  `);

  // Create moves table
  database.exec(`
    CREATE TABLE IF NOT EXISTS moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      move_number INTEGER NOT NULL,
      from_sq TEXT NOT NULL,
      to_sq TEXT NOT NULL,
      san TEXT,
      fen TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      player_color TEXT DEFAULT 'white' CHECK (player_color IN ('white', 'black'))
    )
  `);

  // Create indexes for moves table
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_moves_game ON moves(game_id, move_number);
    CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
    CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves(timestamp);
  `);

  // Create rewards table
  database.exec(`
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      reward_type TEXT NOT NULL,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      object_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Create indexes for rewards table
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_rewards_player_id ON rewards(player_id);
    CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(reward_type);
    CREATE INDEX IF NOT EXISTS idx_rewards_object_id ON rewards(object_id);
    CREATE INDEX IF NOT EXISTS idx_rewards_created_at ON rewards(created_at);
    CREATE INDEX IF NOT EXISTS idx_rewards_player_type ON rewards(player_id, reward_type);
  `);
}

// Export default - will be lazily initialized when accessed
export default db;