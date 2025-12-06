-- PostgreSQL Database Schema for BlockChess
-- This file contains the complete schema for PostgreSQL database

-- ============================================
-- EXTENSIONS
-- ============================================
-- Enable UUID extension if needed (optional, using TEXT for IDs instead)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PLAYERS TABLE
-- ============================================
-- Stores player information including human players and computer player
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sui_address TEXT UNIQUE,  -- NULL for computer player, unique for human players
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for players table
CREATE INDEX IF NOT EXISTS idx_players_sui_address ON players(sui_address);
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);

-- Comments for documentation
COMMENT ON TABLE players IS 'Stores player information including human players (with Sui address) and computer player';
COMMENT ON COLUMN players.id IS 'Unique player identifier';
COMMENT ON COLUMN players.name IS 'Display name of the player';
COMMENT ON COLUMN players.sui_address IS 'Sui wallet address (NULL for computer player)';
COMMENT ON COLUMN players.created_at IS 'Timestamp when the player was created';

-- ============================================
-- GAMES TABLE
-- ============================================
-- Stores chess game information
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mode TEXT NOT NULL CHECK (mode IN ('solo', 'vs')),
    player1_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player2_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    object_id VARCHAR(255),  -- Sui blockchain object identifier (nullable)
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

-- Comments for documentation
COMMENT ON TABLE games IS 'Stores chess game information including game state and metadata';
COMMENT ON COLUMN games.id IS 'Unique game identifier (format: game-<timestamp>)';
COMMENT ON COLUMN games.mode IS 'Game mode: solo (vs computer) or vs (two players)';
COMMENT ON COLUMN games.object_id IS 'Sui blockchain object identifier (hexadecimal string, nullable)';
COMMENT ON COLUMN games.final_fen IS 'Final board position in Forsyth-Edwards Notation';
COMMENT ON COLUMN games.move_count IS 'Total number of moves made in the game';
COMMENT ON COLUMN games.password IS 'Optional password for password-protected games';
COMMENT ON COLUMN games.timer_limit IS 'Timer limit in seconds for timed games';
COMMENT ON COLUMN games.difficulty IS 'Computer difficulty level (for solo mode)';

-- ============================================
-- MOVES TABLE
-- ============================================
-- Stores individual chess moves for games
CREATE TABLE IF NOT EXISTS moves (
    id SERIAL PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    move_number INTEGER NOT NULL,  -- Sequential move number (1, 2, 3, ...)
    from_sq TEXT NOT NULL,  -- Source square (e.g., 'e2')
    to_sq TEXT NOT NULL,  -- Destination square (e.g., 'e4')
    san TEXT,  -- Standard Algebraic Notation (e.g., 'e4', 'Nf3')
    fen TEXT NOT NULL,  -- Board position in FEN notation after this move
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    player_color TEXT DEFAULT 'white' CHECK (player_color IN ('white', 'black'))
);

-- Indexes for moves table
CREATE INDEX IF NOT EXISTS idx_moves_game ON moves(game_id, move_number);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves(timestamp);

-- Comments for documentation
COMMENT ON TABLE moves IS 'Stores individual chess moves for each game';
COMMENT ON COLUMN moves.move_number IS 'Sequential move number starting from 1';
COMMENT ON COLUMN moves.san IS 'Standard Algebraic Notation representation of the move';
COMMENT ON COLUMN moves.fen IS 'Board position in Forsyth-Edwards Notation after this move';

-- ============================================
-- REWARDS TABLE
-- ============================================
-- Stores player rewards/achievements (badges, NFTs)
CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    reward_type TEXT NOT NULL,  -- Type of reward (e.g., 'first_game', '10_games_won')
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    object_id TEXT NOT NULL,  -- Sui blockchain object identifier for the reward NFT
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rewards table
CREATE INDEX IF NOT EXISTS idx_rewards_player_id ON rewards(player_id);
CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(reward_type);
CREATE INDEX IF NOT EXISTS idx_rewards_object_id ON rewards(object_id);
CREATE INDEX IF NOT EXISTS idx_rewards_created_at ON rewards(created_at);
CREATE INDEX IF NOT EXISTS idx_rewards_player_type ON rewards(player_id, reward_type);

-- Comments for documentation
COMMENT ON TABLE rewards IS 'Stores player rewards and achievements (badges/NFTs)';
COMMENT ON COLUMN rewards.reward_type IS 'Type of reward badge (e.g., first_game, 10_games_won)';
COMMENT ON COLUMN rewards.object_id IS 'Sui blockchain object identifier for the minted reward NFT';

-- ============================================
-- VIEWS FOR REWARD SYSTEM
-- ============================================

-- View: Players who have played a game but don't have the first_game reward
CREATE OR REPLACE VIEW vw_users_no_first_game AS
SELECT DISTINCT
    p.id as player_id,
    p.sui_address as suid,
    p.name,
    p.created_at
FROM players p
INNER JOIN games g ON (g.player1_id = p.id OR g.player2_id = p.id)
WHERE p.sui_address IS NOT NULL  -- Only human players
  AND NOT EXISTS (
    SELECT 1
    FROM rewards r
    WHERE r.player_id = p.id
      AND r.reward_type = 'first_game'
  );

COMMENT ON VIEW vw_users_no_first_game IS 'Players who have participated in at least one game but have not yet earned the first_game reward';

-- View: Players who have created a game but don't have the first_game_created reward
CREATE OR REPLACE VIEW vw_users_no_first_game_created AS
SELECT DISTINCT
    p.id as player_id,
    p.sui_address as suid,
    p.name,
    p.created_at
FROM players p
INNER JOIN games g ON g.player1_id = p.id  -- Only games where player is player1 (creator)
WHERE p.sui_address IS NOT NULL  -- Only human players
  AND NOT EXISTS (
    SELECT 1
    FROM rewards r
    WHERE r.player_id = p.id
      AND r.reward_type = 'first_game_created'
  );

COMMENT ON VIEW vw_users_no_first_game_created IS 'Players who have created at least one game but have not yet earned the first_game_created reward';

-- View: Players with their victory counts
CREATE OR REPLACE VIEW vw_users_victories AS
SELECT
    p.id as player_id,
    p.sui_address as suid,
    p.name,
    COUNT(CASE 
        WHEN (g.player1_id = p.id AND g.winner = 'player1') OR 
             (g.player2_id = p.id AND g.winner = 'player2') 
        THEN 1 
    END) as total
FROM players p
LEFT JOIN games g ON (g.player1_id = p.id OR g.player2_id = p.id)
WHERE p.sui_address IS NOT NULL  -- Only human players
GROUP BY p.id, p.sui_address, p.name
HAVING COUNT(CASE 
        WHEN (g.player1_id = p.id AND g.winner = 'player1') OR 
             (g.player2_id = p.id AND g.winner = 'player2') 
        THEN 1 
    END) > 0;

COMMENT ON VIEW vw_users_victories IS 'Players with their total number of victories (wins)';

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to automatically update updated_at timestamp on games table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_games_updated_at ON games IS 'Automatically updates updated_at timestamp when a game is updated';

