-- SQLite Database Schema for BlockChess
-- This file contains the complete schema for SQLite database

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- PLAYERS TABLE
-- ============================================
-- Stores player information including human players and computer player
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sui_address TEXT UNIQUE,  -- NULL for computer player, unique for human players
    created_at INTEGER NOT NULL  -- Unix timestamp (milliseconds)
);

-- Indexes for players table
CREATE INDEX IF NOT EXISTS idx_players_sui_address ON players(sui_address);
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);

-- ============================================
-- GAMES TABLE
-- ============================================
-- Stores chess game information
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,  -- Unix timestamp (milliseconds)
    updated_at INTEGER NOT NULL,  -- Unix timestamp (milliseconds)
    mode TEXT NOT NULL CHECK (mode IN ('solo', 'vs')),
    player1_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player2_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    object_id TEXT,  -- Sui blockchain object identifier (nullable)
    winner TEXT CHECK (winner IN ('player1', 'player2', 'computer', 'draw') OR winner IS NULL),
    result TEXT CHECK (result IN ('1-0', '0-1', '1/2-1/2') OR result IS NULL),
    final_fen TEXT,  -- Final board position in FEN notation
    move_count INTEGER DEFAULT 0,
    password TEXT,  -- Optional password for protected games
    timer_limit INTEGER,  -- Timer limit in seconds (nullable)
    current_turn TEXT CHECK (current_turn IN ('white', 'black') OR current_turn IS NULL),
    captured_pieces TEXT,  -- JSON string of captured pieces (legacy)
    player1_color TEXT CHECK (player1_color IN ('white', 'black') OR player1_color IS NULL),
    setup_data TEXT,  -- JSON string of setup configuration
    difficulty TEXT CHECK (difficulty IN ('easy', 'intermediate', 'hard') OR difficulty IS NULL),
    captured_pieces_white TEXT,  -- JSON array of captured white pieces
    captured_pieces_black TEXT   -- JSON array of captured black pieces
);

-- Indexes for games table
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_player1_id ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2_id ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_object_id ON games(object_id);
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at);
CREATE INDEX IF NOT EXISTS idx_games_mode ON games(mode);
CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner);

-- ============================================
-- MOVES TABLE
-- ============================================
-- Stores individual chess moves for games
CREATE TABLE IF NOT EXISTS moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    move_number INTEGER NOT NULL,  -- Sequential move number (1, 2, 3, ...)
    from_sq TEXT NOT NULL,  -- Source square (e.g., 'e2')
    to_sq TEXT NOT NULL,  -- Destination square (e.g., 'e4')
    san TEXT,  -- Standard Algebraic Notation (e.g., 'e4', 'Nf3')
    fen TEXT NOT NULL,  -- Board position in FEN notation after this move
    timestamp INTEGER NOT NULL,  -- Unix timestamp (milliseconds)
    player_color TEXT DEFAULT 'white' CHECK (player_color IN ('white', 'black'))
);

-- Indexes for moves table
CREATE INDEX IF NOT EXISTS idx_moves_game ON moves(game_id, move_number);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves(timestamp);

-- ============================================
-- REWARDS TABLE
-- ============================================
-- Stores player rewards/achievements (badges, NFTs)
CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    reward_type TEXT NOT NULL,  -- Type of reward (e.g., 'first_game', '10_games_won')
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    object_id TEXT NOT NULL,  -- Sui blockchain object identifier for the reward NFT
    created_at INTEGER NOT NULL  -- Unix timestamp (milliseconds)
);

-- Indexes for rewards table
CREATE INDEX IF NOT EXISTS idx_rewards_player_id ON rewards(player_id);
CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(reward_type);
CREATE INDEX IF NOT EXISTS idx_rewards_object_id ON rewards(object_id);
CREATE INDEX IF NOT EXISTS idx_rewards_created_at ON rewards(created_at);
CREATE INDEX IF NOT EXISTS idx_rewards_player_type ON rewards(player_id, reward_type);

