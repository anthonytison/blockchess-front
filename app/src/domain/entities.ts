// Domain entities - pure TypeScript models

export type Mode = 'solo' | 'vs';

export type Difficulty = 'easy' | 'intermediate' | 'hard';

// Player entity - represents a user or computer player
export interface PlayerEntity {
  id?: string;                    // UUID
  name: string;                  // Display name (2-50 characters)
  suiAddress: string | null;     // Sui wallet address (null for computer)
  createdAt: string;             // Unix timestamp
}

export interface Game {
  id?: string;
  createdAt: string;
  updatedAt?: string;
  mode: Mode;
  player1Id: string;             // Foreign key to Player
  player2Id: string;             // Foreign key to Player
  player1?: PlayerEntity
  player2?: PlayerEntity
  objectId?: string | null;      // Blockchain object identifier
  winner?: string | null; // 'player1' | 'player2' | 'computer' | 'draw'
  result?: string | null; // '1-0' | '0-1' | '1/2-1/2'
  finalFen?: string | null;
  moveCount: number;
  password?: string | null;
  timerLimit?: number | null; // time in seconds
  currentTurn?: string; // 'white' | 'black'
  capturedPieces?: string; // JSON string of captured pieces
  player1Color?: string; // 'white' | 'black'
  setupData?: string; // JSON string of setup configuration
  difficulty?: Difficulty; // 'easy' | 'intermediate' | 'hard'
  capturedPiecesWhite?: string; // JSON array of captured white pieces
  capturedPiecesBlack?: string; // JSON array of captured black pieces
}

export interface GameTotal {
  suid: string // User SUI address
  total: number
}

export interface PlayerStatistics {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
}

export interface Move {
  id?: number;
  gameId: string;
  moveNumber: number;
  from: string;
  to: string;
  san?: string;
  fen: string;
  timestamp: string;
  playerColor: 'white' | 'black';
}

export interface Player {
  name: string;
  color: 'white' | 'black';
  isComputer: boolean;
  isHuman: boolean; // Clearer than !isComputer
}

export interface Reward {
  id?: string;
  type: string;
  playerId: string;
  objectId: string;
  createdAt: string;
}

export interface BoardState {
  fen: string;
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  legalMoves: string[];
}

export interface GameState {
  game: Game;
  moves: Move[];
  currentPosition: number;
  boardState: BoardState;
  players: Player[]; // Array of 2 players - cleaner structure
  humanPlayer: Player; // Direct reference to human player
  computerPlayer?: Player; // Direct reference to computer player (only in solo mode)
}

// Validation functions

/**
 * Validates player name length
 * @param name - Player name to validate
 * @returns true if name is between 2 and 50 characters
 */
export const validatePlayerName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 50;
};

/**
 * Validates Sui address format
 * @param address - Sui wallet address to validate
 * @returns true if address matches the expected format (0x followed by 64 hex characters)
 */
export const validateSuiAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
};

/**
 * Identifies if a player is a computer player
 * @param player - Player entity to check
 * @returns true if player has no Sui address (computer player)
 */
export const isComputerPlayer = (player: PlayerEntity): boolean => {
  return player.suiAddress === null;
};

/**
 * Validates Sui blockchain object ID format
 * @param objectId - Blockchain object ID to validate
 * @returns true if objectId matches expected hexadecimal format (0x followed by 64 hex characters)
 */
export const validateObjectId = (objectId: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(objectId);
};