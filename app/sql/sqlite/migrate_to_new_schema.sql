-- Migration script to update existing SQLite database to new schema
-- This script migrates from the old schema (with player1_name/player2_name)
-- to the new schema (with players table and player1_id/player2_id)

-- Enable foreign keys
PRAGMA foreign_keys = OFF;

-- Step 1: Create players table if it doesn't exist
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sui_address TEXT UNIQUE,
    created_at INTEGER NOT NULL
);

-- Step 2: Create indexes for players table
CREATE INDEX IF NOT EXISTS idx_players_sui_address ON players(sui_address);
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);

-- Step 3: Check if games table needs migration
-- Check if player1_name column exists (old schema indicator)
-- SQLite doesn't support IF EXISTS for columns, so we need to check differently

-- Step 4: Create a backup of games table
CREATE TABLE IF NOT EXISTS games_backup AS SELECT * FROM games;

-- Step 5: Drop and recreate games table with new schema
-- WARNING: This will lose data if not handled properly
-- Only run this if you're sure the data has been migrated

-- Create new games table structure
CREATE TABLE IF NOT EXISTS games_new (
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
);

-- Step 6: Migrate player names to players table and get IDs
-- This assumes player names can be used as IDs temporarily
-- You'll need to create proper player records

-- Step 7: Add player_color column to moves table if it doesn't exist
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS
-- We'll use a different approach
CREATE TABLE IF NOT EXISTS moves_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    move_number INTEGER NOT NULL,
    from_sq TEXT NOT NULL,
    to_sq TEXT NOT NULL,
    san TEXT,
    fen TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    player_color TEXT DEFAULT 'white' CHECK (player_color IN ('white', 'black'))
);

-- Step 8: Copy data from old moves table to new one
INSERT INTO moves_new (id, game_id, move_number, from_sq, to_sq, san, fen, timestamp, player_color)
SELECT 
    id, 
    game_id, 
    move_number, 
    from_sq, 
    to_sq, 
    san, 
    fen, 
    timestamp,
    'white' as player_color  -- Default value for existing moves
FROM moves;

-- Step 9: Add object_id column to games if it doesn't exist
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS
-- We'll check if it exists first by attempting to query it

-- Step 10: Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    reward_type TEXT NOT NULL,
    player_id TEXT NOT NULL,
    object_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Step 11: Create indexes for rewards table
CREATE INDEX IF NOT EXISTS idx_rewards_player_id ON rewards(player_id);
CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(reward_type);
CREATE INDEX IF NOT EXISTS idx_rewards_object_id ON rewards(object_id);
CREATE INDEX IF NOT EXISTS idx_rewards_created_at ON rewards(created_at);
CREATE INDEX IF NOT EXISTS idx_rewards_player_type ON rewards(player_id, reward_type);

-- Step 12: Create additional indexes for games table
CREATE INDEX IF NOT EXISTS idx_games_player1_id ON games_new(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2_id ON games_new(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_object_id ON games_new(object_id);
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games_new(updated_at);
CREATE INDEX IF NOT EXISTS idx_games_mode ON games_new(mode);
CREATE INDEX IF NOT EXISTS idx_games_winner ON games_new(winner);

-- Step 13: Create additional indexes for moves table
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves_new(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves_new(timestamp);

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;

-- IMPORTANT NOTES:
-- 1. This migration script creates new tables but doesn't automatically migrate data
-- 2. You'll need to manually migrate data from games_backup to games_new
-- 3. Create player records in the players table first
-- 4. Then update games_new with the correct player IDs
-- 5. Finally, drop old tables and rename new ones:
--    DROP TABLE games;
--    DROP TABLE moves;
--    ALTER TABLE games_new RENAME TO games;
--    ALTER TABLE moves_new RENAME TO moves;
--    DROP TABLE games_backup;

