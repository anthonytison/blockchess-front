export interface CreateGameTransactionData {
  transactionId: string;
  gameId: string;
  playerAddress: string;
  data: {
    mode: number;
    difficulty: number;
  };
}

export interface MakeMoveTransactionData {
  transactionId: string;
  playerAddress: string;
  data: {
    gameObjectId: string;
    isComputer: boolean;
    moveSan: string;
    fen: string;
    moveHash: string;
  };
}

export interface EndGameTransactionData {
  transactionId: string;
  playerAddress: string;
  data: {
    gameObjectId: string;
    winner: string | null;
    result: '1-0' | '0-1' | '1/2-1/2';
    finalFen: string;
  };
}

export interface MintNftTransactionData {
  transactionId: string;
  playerAddress: string;
  playerId: string;
  data: {
    recipientAddress: string;
    badgeType: string;
    name: string;
    description: string;
    sourceUrl: string;
    registryObjectId?: string;
  };
}

export interface TransactionResult {
  transactionId: string;
  status: 'success' | 'error';
  digest?: string;
  objectId?: string;
  error?: string;
  timestamp: string;
}

