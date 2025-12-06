// Database factory - chooses between SQLite and PostgreSQL based on configuration

import { IGameRepository, IMoveRepository, IPlayerRepository, IRewardRepository } from '@/ports/repositories';
import { getDatabaseConfig } from './config';

// SQLite imports
import { SQLiteGameRepository } from '@/adapters/sqlite/game-repository';
import { SQLiteRewardRepository } from '@/adapters/sqlite/reward-repository';
import { SQLitePlayerRepository } from '@/adapters/sqlite/player-repository';

// PostgreSQL imports
import { PostgresGameRepository } from '@/adapters/postgres/game-repository';
import { PostgresMoveRepository } from '@/adapters/postgres/move-repository';
import { PostgresPlayerRepository } from '@/adapters/postgres/player-repository';
import { PostgresRewardRepository } from '@/adapters/postgres/reward-repository';
import { SQLiteMoveRepository } from '@/adapters/sqlite/move-repository';

let gameRepository: IGameRepository | null = null;
let rewardRepository: IRewardRepository | null = null;
let moveRepository: IMoveRepository | null = null;
let playerRepository: IPlayerRepository | null = null;
let cachedDatabaseType: 'sqlite' | 'postgres' | null = null;

function resetRepositoriesIfTypeChanged() {
  const config = getDatabaseConfig();
  if (cachedDatabaseType !== null && cachedDatabaseType !== config.type) {
    // Database type changed, reset all repositories
    gameRepository = null;
    rewardRepository = null;
    moveRepository = null;
    playerRepository = null;
  }
  cachedDatabaseType = config.type;
}

export function getGameRepository(): IGameRepository {
  resetRepositoriesIfTypeChanged();
  
  if (!gameRepository) {
    const config = getDatabaseConfig();
    
    if (config.type === 'postgres') {
      gameRepository = new PostgresGameRepository();
    } else {
      gameRepository = new SQLiteGameRepository();
    }
  }
  
  return gameRepository;
}

export function getRewardRepository(): IRewardRepository {
  resetRepositoriesIfTypeChanged();
  
  if (!rewardRepository) {
    const config = getDatabaseConfig();
    
    if (config.type === 'postgres') {
      rewardRepository = new PostgresRewardRepository();
    } else {
      rewardRepository = new SQLiteRewardRepository();
    }
  }
  
  return rewardRepository;
}

export function getMoveRepository(): IMoveRepository {
  resetRepositoriesIfTypeChanged();
  
  if (!moveRepository) {
    const config = getDatabaseConfig();
    
    if (config.type === 'postgres') {
      moveRepository = new PostgresMoveRepository();
    } else {
      moveRepository = new SQLiteMoveRepository();
    }
  }
  
  return moveRepository;
}

export function getPlayerRepository(): IPlayerRepository {
  resetRepositoriesIfTypeChanged();
  
  if (!playerRepository) {
    const config = getDatabaseConfig();

    if (config.type === 'postgres') {
      playerRepository = new PostgresPlayerRepository();
    } else {
      playerRepository = new SQLitePlayerRepository();
    }
  }

  return playerRepository;
}

export function getDatabaseType(): 'sqlite' | 'postgres' {
  const config = getDatabaseConfig();
  return config.type;
}