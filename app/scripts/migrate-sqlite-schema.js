#!/usr/bin/env node

/**
 * Migration script to update SQLite database from old schema to new schema
 * 
 * This script:
 * 1. Backs up the existing database
 * 2. Creates players table from existing game data
 * 3. Migrates games table to use player IDs instead of player names
 * 4. Adds missing columns and tables
 * 5. Migrates moves table to include player_color column
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.SQLITE_DB_PATH || './data/blockchess.db';
const BACKUP_PATH = `${DB_PATH}.backup.${Date.now()}`;

function migrateDatabase() {
  console.log('🔄 Starting database migration...');
  
  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.log('✅ Database does not exist. Will be created with new schema on first run.');
    return;
  }

  // Create backup
  console.log(`📦 Creating backup: ${BACKUP_PATH}`);
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log('✅ Backup created');

  const db = new Database(DB_PATH);
  
  try {
    // Enable foreign keys
    db.pragma('foreign_keys = OFF');

    // Check current schema
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    console.log(`📋 Existing tables: ${tableNames.join(', ')}`);

    const gamesSchema = db.prepare("PRAGMA table_info(games)").all();
    const gamesColumns = gamesSchema.map(c => c.name);
    console.log(`📋 Games table columns: ${gamesColumns.join(', ')}`);

    // Check if we need to migrate
    const hasPlayerNameColumns = gamesColumns.includes('player1_name') || gamesColumns.includes('player2_name');
    const hasPlayerIdColumns = gamesColumns.includes('player1_id') && gamesColumns.includes('player2_id');
    const hasPlayersTable = tableNames.includes('players');
    const hasRewardsTable = tableNames.includes('rewards');

    if (!hasPlayerNameColumns && hasPlayerIdColumns && hasPlayersTable) {
      console.log('✅ Database already uses new schema. Migration not needed.');
      
      // Still check if we need to add missing columns
      const needsObjectId = !gamesColumns.includes('object_id');
      const movesSchema = db.prepare("PRAGMA table_info(moves)").all();
      const movesColumns = movesSchema.map(c => c.name);
      const needsPlayerColor = !movesColumns.includes('player_color');

      if (needsObjectId || needsPlayerColor || !hasRewardsTable) {
        console.log('🔧 Adding missing columns and tables...');
        
        if (needsObjectId) {
          db.exec(`ALTER TABLE games ADD COLUMN object_id TEXT`);
          db.exec(`CREATE INDEX IF NOT EXISTS idx_games_object_id ON games(object_id)`);
          console.log('✅ Added object_id column to games table');
        }

        if (needsPlayerColor) {
          db.exec(`ALTER TABLE moves ADD COLUMN player_color TEXT DEFAULT 'white' CHECK (player_color IN ('white', 'black'))`);
          console.log('✅ Added player_color column to moves table');
        }

        if (!hasRewardsTable) {
          db.exec(`
            CREATE TABLE IF NOT EXISTS rewards (
              id TEXT PRIMARY KEY,
              reward_type TEXT NOT NULL,
              player_id TEXT NOT NULL,
              object_id TEXT NOT NULL,
              created_at INTEGER NOT NULL
            )
          `);
          db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_player_id ON rewards(player_id)`);
          db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(reward_type)`);
          db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_object_id ON rewards(object_id)`);
          db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_created_at ON rewards(created_at)`);
          db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_player_type ON rewards(player_id, reward_type)`);
          console.log('✅ Created rewards table');
        }

        // Add missing indexes
        const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
        const indexNames = indexes.map(i => i.name);
        
        if (!indexNames.includes('idx_games_player1_id')) {
          db.exec(`CREATE INDEX IF NOT EXISTS idx_games_player1_id ON games(player1_id)`);
        }
        if (!indexNames.includes('idx_games_player2_id')) {
          db.exec(`CREATE INDEX IF NOT EXISTS idx_games_player2_id ON games(player2_id)`);
        }
        if (!indexNames.includes('idx_games_updated_at')) {
          db.exec(`CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at)`);
        }
        if (!indexNames.includes('idx_games_mode')) {
          db.exec(`CREATE INDEX IF NOT EXISTS idx_games_mode ON games(mode)`);
        }
        if (!indexNames.includes('idx_games_winner')) {
          db.exec(`CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner)`);
        }
        if (!indexNames.includes('idx_moves_game_id')) {
          db.exec(`CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id)`);
        }
        if (!indexNames.includes('idx_moves_timestamp')) {
          db.exec(`CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves(timestamp)`);
        }

        console.log('✅ Migration completed successfully!');
      } else {
        console.log('✅ Database schema is up to date!');
      }
      return;
    }

    if (!hasPlayerNameColumns) {
      console.log('❌ Unexpected schema state. Cannot determine migration path.');
      return;
    }

    console.log('🔄 Migrating from old schema to new schema...');

    // Step 1: Create players table
    console.log('📝 Creating players table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sui_address TEXT UNIQUE,
        created_at INTEGER NOT NULL
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_players_sui_address ON players(sui_address)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_players_name ON players(name)`);

    // Step 2: Extract unique player names and create player records
    console.log('👥 Creating player records from existing games...');
    const uniquePlayers = db.prepare(`
      SELECT DISTINCT player1_name as name FROM games WHERE player1_name IS NOT NULL
      UNION
      SELECT DISTINCT player2_name as name FROM games WHERE player2_name IS NOT NULL
    `).all();

    const insertPlayer = db.prepare(`
      INSERT OR IGNORE INTO players (id, name, sui_address, created_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const player of uniquePlayers) {
      const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = Date.now();
      insertPlayer.run(playerId, player.name, null, createdAt);
      console.log(`  ✓ Created player: ${player.name} (${playerId})`);
    }

    // Step 3: Create games_new table with new structure
    console.log('📝 Creating new games table structure...');
    db.exec(`
      CREATE TABLE games_new (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('solo', 'vs')),
        player1_id TEXT NOT NULL,
        player2_id TEXT NOT NULL,
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

    // Step 4: Migrate data from old games to new games
    console.log('🔄 Migrating games data...');
    const getPlayerId = db.prepare(`SELECT id FROM players WHERE name = ? LIMIT 1`);
    const games = db.prepare(`SELECT * FROM games`).all();
    const insertGame = db.prepare(`
      INSERT INTO games_new (
        id, created_at, updated_at, mode, player1_id, player2_id,
        object_id, winner, result, final_fen, move_count,
        password, timer_limit, current_turn, captured_pieces,
        player1_color, setup_data, difficulty,
        captured_pieces_white, captured_pieces_black
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const game of games) {
      const p1Player = getPlayerId.get(game.player1_name);
      const p2Player = getPlayerId.get(game.player2_name || 'Computer');
      
      if (!p1Player) {
        console.warn(`⚠️  Player not found: ${game.player1_name}, skipping game ${game.id}`);
        continue;
      }

      const player1Id = p1Player.id;
      const player2Id = p2Player ? p2Player.id : (getPlayerId.get('Computer') || { id: 'computer-player' }).id;

      insertGame.run(
        game.id,
        game.created_at,
        game.updated_at || game.created_at,
        game.mode,
        player1Id,
        player2Id,
        game.object_id || null,
        game.winner,
        game.result,
        game.final_fen,
        game.move_count || 0,
        game.password || null,
        game.timer_limit || null,
        game.current_turn || 'white',
        game.captured_pieces || '[]',
        game.player1_color || 'white',
        game.setup_data || '{}',
        game.difficulty || 'easy',
        game.captured_pieces_white || '[]',
        game.captured_pieces_black || '[]'
      );
    }

    console.log(`✅ Migrated ${games.length} games`);

    // Step 5: Update moves table if needed
    const movesSchema = db.prepare("PRAGMA table_info(moves)").all();
    const movesColumns = movesSchema.map(c => c.name);
    
    if (!movesColumns.includes('player_color')) {
      console.log('📝 Adding player_color column to moves table...');
      db.exec(`ALTER TABLE moves ADD COLUMN player_color TEXT DEFAULT 'white' CHECK (player_color IN ('white', 'black'))`);
    }

    // Step 6: Create rewards table
    if (!hasRewardsTable) {
      console.log('📝 Creating rewards table...');
      db.exec(`
        CREATE TABLE rewards (
          id TEXT PRIMARY KEY,
          reward_type TEXT NOT NULL,
          player_id TEXT NOT NULL,
          object_id TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_player_id ON rewards(player_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(reward_type)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_object_id ON rewards(object_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_created_at ON rewards(created_at)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_player_type ON rewards(player_id, reward_type)`);
    }

    // Step 7: Create indexes for games_new
    db.exec(`CREATE INDEX IF NOT EXISTS idx_games_created_at ON games_new(created_at DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_games_player1_id ON games_new(player1_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_games_player2_id ON games_new(player2_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_games_object_id ON games_new(object_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games_new(updated_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_games_mode ON games_new(mode)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_games_winner ON games_new(winner)`);

    // Step 8: Create indexes for moves
    db.exec(`CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves(timestamp)`);

    // Step 9: Replace old tables
    console.log('🔄 Replacing old tables with new ones...');
    db.exec(`DROP TABLE IF EXISTS games`);
    db.exec(`ALTER TABLE games_new RENAME TO games`);
    
    // Step 10: Re-enable foreign keys
    db.pragma('foreign_keys = ON');

    console.log('✅ Migration completed successfully!');
    console.log(`📦 Backup saved at: ${BACKUP_PATH}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log(`💾 Restore backup with: cp ${BACKUP_PATH} ${DB_PATH}`);
    throw error;
  } finally {
    db.close();
  }
}

if (require.main === module) {
  migrateDatabase();
}

module.exports = { migrateDatabase };

