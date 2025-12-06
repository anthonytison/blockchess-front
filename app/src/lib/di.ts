// Dependency Injection Container

import {
  getGameRepository,
  getMoveRepository,
  getPlayerRepository,
  getRewardRepository,
} from '@/lib/database/factory';
import { StartGameUseCase } from '@/use-cases/start-game';
import { MakeMoveUseCase } from '@/use-cases/make-move';
import { GetHistoryUseCase } from '@/use-cases/get-history';
import { ReplayGameUseCase } from '@/use-cases/replay-game';
import { VerifyGamePasswordUseCase } from '@/use-cases/verify-game-password';
import { CreatePlayerUseCase } from '@/use-cases/create-player';
import { GetPlayerBySuiAddressUseCase } from '@/use-cases/get-player-by-sui-address';
import { GetOrCreateComputerPlayerUseCase } from '@/use-cases/get-or-create-computer-player';
import { IClock, ILogger } from '@/ports/repositories';
import { GetRewardUseCase } from '@/use-cases/get-reward';
import { DateTime } from 'luxon';
import { ShouldEarnRewardUseCase } from '@/use-cases/should-earn-reward';
import { GetPlayerStatisticsUseCase } from '@/use-cases/get-player-statistics';
import { CreateRewardUseCase } from '@/use-cases/create-reward';

// Simple implementations
class SystemClock implements IClock {
  now(): string {
    return DateTime.local().toString()
  }
  timestamp(): number {
    return DateTime.local().toMillis()
  }
}

class ConsoleLogger implements ILogger {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta || '');
  }

  error(message: string, error?: Error, meta?: any): void {
    console.error(`[ERROR] ${message}`, error || '', meta || '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta || '');
  }

  debug(message: string, meta?: any): void {
    console.debug(`[DEBUG] ${message}`, meta || '');
  }
}

// Create instances using factory pattern
export const gameRepository = getGameRepository();
export const moveRepository = getMoveRepository();
export const playerRepository = getPlayerRepository();
export const rewardRepository = getRewardRepository();
const clock = new SystemClock();
const logger = new ConsoleLogger();

// Create use cases
export const startGameUseCase = new StartGameUseCase(
  gameRepository,
  playerRepository,
  clock
);
export const makeMoveUseCase = new MakeMoveUseCase(
  moveRepository,
  gameRepository,
  clock
);
export const getRewardUseCase = new GetRewardUseCase(rewardRepository);
export const shouldEarnRewardUseCase = new ShouldEarnRewardUseCase(rewardRepository);
export const createRewardUseCase = new CreateRewardUseCase(rewardRepository);
export const getPlayerStatisticsUseCase = new GetPlayerStatisticsUseCase(gameRepository);
export const getHistoryUseCase = new GetHistoryUseCase(gameRepository);
export const replayGameUseCase = new ReplayGameUseCase(
  gameRepository,
  moveRepository
);
export const verifyGamePasswordUseCase = new VerifyGamePasswordUseCase(
  gameRepository
);
export const createPlayerUseCase = new CreatePlayerUseCase(
  playerRepository,
  clock
);
export const getPlayerBySuiAddressUseCase = new GetPlayerBySuiAddressUseCase(
  playerRepository
);
export const getOrCreateComputerPlayerUseCase =
  new GetOrCreateComputerPlayerUseCase(playerRepository);

// Export other instances for direct use if needed
export { clock, logger };