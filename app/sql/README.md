# BlockChess Database Schema Documentation

This directory contains SQL schema files for the BlockChess database, supporting both SQLite (for development/local) and PostgreSQL (for production).

## Directory Structure

```
sql/
├── sqlite/
│   └── schema.sql          # Complete SQLite schema
├── postgres/
│   └── schema.sql          # Complete PostgreSQL schema with views and triggers
└── README.md               # This file
```

## Database Overview

The BlockChess database consists of four main tables:

1. **players** - Stores player information (human players and computer player)
2. **games** - Stores chess game information and state
3. **moves** - Stores individual chess moves for each game
4. **rewards** - Stores player achievements and reward NFTs

## Installation

### SQLite (Development/Local)

SQLite is used for local development and testing. The database file is created automatically when the application starts.

**Option 1: Automatic (Recommended)**
The database schema is automatically initialized when the application connects to the database via `src/adapters/sqlite/database.ts`. The schema includes all required tables (players, games, moves, rewards) and indexes.

**Option 2: Manual Initialization**
To manually create the database:

```bash
cd front/app
sqlite3 data/blockchess.db < sql/sqlite/schema.sql
```

### PostgreSQL (Production)

For production environments, use PostgreSQL. Follow these steps:

1. **Create the database:**
```bash
createdb blockchess
```

2. **Run the schema:**
```bash
psql -d blockchess -f sql/postgres/schema.sql
```

Or using environment variables:
```bash
psql $DATABASE_URL -f sql/postgres/schema.sql
```

## Schema Details

### Players Table

Stores player information including human players (with Sui blockchain addresses) and the computer player.

**Columns:**
- `id` (TEXT PRIMARY KEY) - Unique player identifier
- `name` (TEXT NOT NULL) - Display name (2-50 characters)
- `sui_address` (TEXT UNIQUE, nullable) - Sui wallet address (NULL for computer player)
- `created_at` (INTEGER/TIMESTAMP) - Creation timestamp

**Indexes:**
- `idx_players_sui_address` - Fast lookup by Sui address
- `idx_players_created_at` - Sorting by creation date
- `idx_players_name` - Name-based searches

**Constraints:**
- `sui_address` is unique for human players
- Computer player has `sui_address = NULL`

### Games Table

Stores chess game information, including game state, metadata, and blockchain integration.

**Columns:**
- `id` (TEXT PRIMARY KEY) - Unique game identifier (format: `game-<timestamp>`)
- `created_at` (INTEGER/TIMESTAMP) - Game creation timestamp
- `updated_at` (INTEGER/TIMESTAMP) - Last update timestamp
- `mode` (TEXT) - Game mode: `'solo'` (vs computer) or `'vs'` (two players)
- `player1_id` (TEXT) - Foreign key to players table
- `player2_id` (TEXT) - Foreign key to players table
- `object_id` (TEXT/VARCHAR(255), nullable) - Sui blockchain object identifier
- `winner` (TEXT, nullable) - Winner: `'player1'`, `'player2'`, `'computer'`, `'draw'`, or NULL
- `result` (TEXT, nullable) - Game result: `'1-0'`, `'0-1'`, `'1/2-1/2'`, or NULL
- `final_fen` (TEXT, nullable) - Final board position in FEN notation
- `move_count` (INTEGER) - Total number of moves made
- `password` (TEXT, nullable) - Optional password for protected games
- `timer_limit` (INTEGER, nullable) - Timer limit in seconds
- `current_turn` (TEXT, nullable) - Current player's turn: `'white'` or `'black'`
- `captured_pieces` (TEXT, nullable) - JSON string of captured pieces (legacy)
- `player1_color` (TEXT, nullable) - Color assigned to player1: `'white'` or `'black'`
- `setup_data` (TEXT, nullable) - JSON string of setup configuration
- `difficulty` (TEXT, nullable) - Computer difficulty: `'easy'`, `'intermediate'`, `'hard'`
- `captured_pieces_white` (TEXT, nullable) - JSON array of captured white pieces
- `captured_pieces_black` (TEXT, nullable) - JSON array of captured black pieces

**Indexes:**
- `idx_games_created_at` - Sorting games by creation date
- `idx_games_player1_id` - Finding games by player1
- `idx_games_player2_id` - Finding games by player2
- `idx_games_object_id` - Blockchain object lookups
- `idx_games_updated_at` - Sorting by last update
- `idx_games_mode` - Filtering by game mode
- `idx_games_winner` - Finding games by winner

**Foreign Keys:**
- `player1_id` → `players(id) ON DELETE CASCADE`
- `player2_id` → `players(id) ON DELETE CASCADE`

### Moves Table

Stores individual chess moves for each game, enabling game replay and history.

**Columns:**
- `id` (INTEGER PRIMARY KEY / SERIAL) - Auto-incrementing move ID
- `game_id` (TEXT) - Foreign key to games table
- `move_number` (INTEGER) - Sequential move number (1, 2, 3, ...)
- `from_sq` (TEXT) - Source square (e.g., `'e2'`)
- `to_sq` (TEXT) - Destination square (e.g., `'e4'`)
- `san` (TEXT, nullable) - Standard Algebraic Notation (e.g., `'e4'`, `'Nf3'`)
- `fen` (TEXT) - Board position in FEN notation after this move
- `timestamp` (INTEGER/TIMESTAMP) - When the move was made
- `player_color` (TEXT) - Color of the player who made the move: `'white'` or `'black'`

**Indexes:**
- `idx_moves_game` - Composite index on `(game_id, move_number)` for efficient move retrieval
- `idx_moves_game_id` - Finding all moves for a game
- `idx_moves_timestamp` - Sorting moves by time

**Foreign Keys:**
- `game_id` → `games(id) ON DELETE CASCADE`

### Rewards Table

Stores player achievements and reward NFTs minted on the Sui blockchain.

**Columns:**
- `id` (TEXT PRIMARY KEY) - Unique reward identifier
- `reward_type` (TEXT) - Type of reward (e.g., `'first_game'`, `'10_games_won'`)
- `player_id` (TEXT) - Foreign key to players table
- `object_id` (TEXT) - Sui blockchain object identifier for the minted reward NFT
- `created_at` (INTEGER/TIMESTAMP) - When the reward was earned

**Indexes:**
- `idx_rewards_player_id` - Finding all rewards for a player
- `idx_rewards_type` - Filtering by reward type
- `idx_rewards_object_id` - Blockchain object lookups
- `idx_rewards_created_at` - Sorting by creation date
- `idx_rewards_player_type` - Composite index for checking if a player has a specific reward

**Foreign Keys:**
- `player_id` → `players(id) ON DELETE CASCADE`

**Common Reward Types:**
- `first_game` - Earned after playing first game
- `first_game_created` - Earned after creating first game
- `first_game_won` - Earned after winning first game
- `10_games_won` - Earned after winning 10 games
- `50_games_won` - Earned after winning 50 games
- `100_games_won` - Earned after winning 100 games

## PostgreSQL-Specific Features

### Views

PostgreSQL includes three views for efficient reward checking:

#### `vw_users_no_first_game`
Players who have played at least one game but have not yet earned the `first_game` reward.

**Use Case:** Determining eligibility for the first game reward.

#### `vw_users_no_first_game_created`
Players who have created at least one game (as player1) but have not yet earned the `first_game_created` reward.

**Use Case:** Determining eligibility for the first game created reward.

#### `vw_users_victories`
Players with their total number of victories (wins). Only includes players who have at least one win.

**Columns:**
- `player_id` - Player identifier
- `suid` - Sui address
- `name` - Player name
- `total` - Total number of victories

**Use Case:** Determining eligibility for win-based rewards (e.g., 10_games_won, 50_games_won).

### Triggers

#### `update_games_updated_at`
Automatically updates the `updated_at` column whenever a game row is updated.

**Function:** `update_updated_at_column()`

## Data Types Differences

| Column Type | SQLite | PostgreSQL |
|------------|--------|------------|
| Timestamps | `INTEGER` (Unix milliseconds) | `TIMESTAMP` (ISO format) |
| Auto-increment IDs | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL` |
| Text with length limit | `TEXT` | `VARCHAR(n)` or `TEXT` |
| Nullable constraints | Implicit | Explicit with `NULL` |

**Note:** The application layer handles timestamp conversion between formats.

## Common Queries

### Get all games for a player
```sql
SELECT * FROM games 
WHERE player1_id = ? OR player2_id = ?
ORDER BY created_at DESC;
```

### Get all moves for a game (in order)
```sql
SELECT * FROM moves 
WHERE game_id = ? 
ORDER BY move_number ASC;
```

### Get player statistics
```sql
SELECT 
    COUNT(*) as total_games,
    COUNT(CASE WHEN (player1_id = ? AND winner = 'player1') OR 
                     (player2_id = ? AND winner = 'player2') 
               THEN 1 END) as games_won,
    COUNT(CASE WHEN winner = 'draw' THEN 1 END) as games_draw
FROM games
WHERE player1_id = ? OR player2_id = ?;
```

### Check if player has a specific reward (PostgreSQL)
```sql
SELECT EXISTS(
    SELECT 1 FROM rewards 
    WHERE player_id = ? AND reward_type = ?
);
```

### Find players eligible for first_game reward (PostgreSQL)
```sql
SELECT * FROM vw_users_no_first_game 
WHERE suid = ?;
```

## Maintenance

### Backup

**SQLite:**
```bash
sqlite3 data/blockchess.db ".backup backup.db"
```

**PostgreSQL:**
```bash
pg_dump blockchess > backup.sql
```

### Restore

**SQLite:**
```bash
sqlite3 data/blockchess.db < backup.db
```

**PostgreSQL:**
```bash
psql blockchess < backup.sql
```

### Vacuum (SQLite)

To optimize SQLite database file size:
```sql
VACUUM;
```

### Analyze (PostgreSQL)

To update query planner statistics:
```sql
ANALYZE;
```

## Migration Notes

### Migrating Existing SQLite Database

If you have an existing SQLite database with the old schema (using `player1_name` and `player2_name` instead of `player1_id` and `player2_id`), you need to migrate it to the new schema.

**Automatic Migration (Recommended):**

Run the migration script:
```bash
cd front/app
pnpm run db:migrate
```

This script will:
1. Create a backup of your existing database
2. Create the `players` table
3. Extract player names from existing games and create player records
4. Migrate the `games` table to use player IDs
5. Add missing columns (`object_id`, etc.)
6. Create the `rewards` table if it doesn't exist
7. Add missing indexes

**Manual Migration:**

If you prefer to migrate manually:

1. **Backup your database**
2. **Create players from existing game data:**
```sql
-- SQLite migration example
INSERT INTO players (id, name, sui_address, created_at)
SELECT DISTINCT player1_name, player1_name, NULL, MIN(created_at)
FROM games
WHERE player1_name NOT IN (SELECT id FROM players)
GROUP BY player1_name;
```

3. **Update games table to use player IDs:**
```sql
UPDATE games SET player1_id = (
    SELECT id FROM players WHERE name = games.player1_name LIMIT 1
);
```

4. **Remove old columns:**
```sql
-- Note: SQLite doesn't support DROP COLUMN directly
-- You'll need to recreate the table
```

For PostgreSQL, you can use `ALTER TABLE`:
```sql
ALTER TABLE games DROP COLUMN player1_name;
ALTER TABLE games DROP COLUMN player2_name;
```

## Troubleshooting

### Foreign Key Constraints

**SQLite:** Ensure foreign keys are enabled:
```sql
PRAGMA foreign_keys = ON;
```

**PostgreSQL:** Foreign keys are always enforced.

### Timestamp Format Issues

If you encounter timestamp format issues, check:
- SQLite uses integer milliseconds
- PostgreSQL uses TIMESTAMP format
- The application layer handles conversion automatically

### Index Performance

If queries are slow:
1. Check that indexes exist: `SELECT * FROM sqlite_master WHERE type='index';` (SQLite)
2. Run `ANALYZE` (PostgreSQL) or `ANALYZE games;` (SQLite) to update statistics
3. Use `EXPLAIN` or `EXPLAIN ANALYZE` to check query plans

## Related Files

- `src/adapters/sqlite/database.ts` - SQLite database initialization
- `src/adapters/postgres/database.ts` - PostgreSQL connection setup
- `src/domain/entities.ts` - TypeScript domain models
- `src/adapters/*/game-repository.ts` - Game repository implementations
- `src/adapters/*/move-repository.ts` - Move repository implementations
- `src/adapters/*/player-repository.ts` - Player repository implementations
- `src/adapters/*/reward-repository.ts` - Reward repository implementations

## Support

For issues or questions about the database schema, please refer to:
- Application code in `src/adapters/` for usage examples
- Domain models in `src/domain/entities.ts` for TypeScript interfaces
- Repository interfaces in `src/ports/repositories.ts` for API contracts

