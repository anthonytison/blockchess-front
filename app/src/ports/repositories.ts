// Port interfaces - define contracts for external dependencies

import { Game, Move, PlayerEntity, Reward, GameTotal, PlayerStatistics } from '@/domain/entities';

// Helper type for games with player information
export interface GameWithPlayers extends Game {
  player1: PlayerEntity;
  player2: PlayerEntity;
}

export interface IPlayerRepository {
  create(player: Partial<PlayerEntity>): Promise<PlayerEntity>;
  update(player: Partial<PlayerEntity>): Promise<PlayerEntity>;
  getById(id: string): Promise<PlayerEntity | null>;
  getBySuiAddress(suiAddress: string): Promise<PlayerEntity | null>;
  getComputerPlayer(): Promise<PlayerEntity>;
  list(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<PlayerEntity[]>;
}

export interface IGameRepository {
  create(game: Partial<Game>): Promise<Game>;
  getById(id: string): Promise<Game | null>;
  getByIdWithPlayers(id: string): Promise<GameWithPlayers | null>;
  list(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Game[]>;
  listWithPlayers(params?: {
    limit?: number;
    offset?: number;
    playerId?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<GameWithPlayers[]>;
  finishGame(
    id: string,
    update: {
      winner?: string;
      result?: string;
      finalFen?: string;
    }
  ): Promise<void>;
  updateMoveCount(id: string, count: number): Promise<void>;
  updateGameState(
    id: string,
    update: {
      finalFen?: string;
      moveCount?: number;
      currentTurn?: string;
      winner?: string | null;
      result?: string | null;
      capturedPiecesWhite?: string;
      capturedPiecesBlack?: string;
    }
  ): Promise<void>;
  getPlayerStatistics(playerId: string): Promise<PlayerStatistics>;
}

export interface IMoveRepository {
  addMove(move: Move): Promise<Move>;
  listMoves(gameId: string): Promise<Move[]>;
  getMoveByNumber(gameId: string, moveNumber: number): Promise<Move | null>;
}

export interface IRewardRepository {
  create(reward: Partial<Reward>): Promise<Reward>;
  list(playerId: string, orderBy: 'ASC' | 'DESC'): Promise<Reward[]>;
  shouldEarnReward(suid: string, type: string, total?: number): Promise<string | null>;
}

export interface IClock {
  now(): string;
  timestamp(): number;
}

export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}