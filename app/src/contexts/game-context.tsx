"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { GameState } from '@/domain/entities';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Chess, Square } from 'chess.js';
import { useToast } from '@/app/context/toast-provider';
import { getPlayer } from '@/app/actions/account';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { useSocketRxJS } from '@/hooks/use-socket-rxjs';
import { useMintQueue } from '@/hooks/use-mint-queue';
import { MakeMoveTransactionData, EndGameTransactionData, TransactionResult } from '@/types/transactions';
import { filter, take } from 'rxjs/operators';

// Browser-compatible hash function
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Game Context Types
interface GameContextState {
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  isReplayMode: boolean;
  currentMoveIndex: number;
  isAiThinking: boolean;
  capturedWhite: string[];
  capturedBlack: string[];
}

interface GameContextActions {
  loadGame: (gameId: string) => Promise<void>;
  makeMove: (from: string, to: string, promotion?: string) => Promise<void>;
  makeAiMove: () => Promise<void>;
  forfeitGame: () => Promise<void>;
  goToMove: (moveIndex: number) => void;
  goToCurrentPosition: () => void;
  setError: (error: string | null) => void;
}

type GameContextType = GameContextState & GameContextActions;

// Action Types
type GameAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'SET_REPLAY_MODE'; payload: boolean }
  | { type: 'SET_CURRENT_MOVE_INDEX'; payload: number }
  | { type: 'SET_AI_THINKING'; payload: boolean }
  | { type: 'SET_CAPTURED_PIECES'; payload: { white: string[]; black: string[] } }
  | { type: 'UPDATE_BOARD_STATE'; payload: { fen: string; turn: 'w' | 'b'; isCheck: boolean; isCheckmate: boolean; isDraw?: boolean } }
  | { type: 'ADD_MOVE'; payload: { move: any; newFen: string; newTurn: 'w' | 'b' } }
  | { type: 'UPDATE_GAME_OBJECT_ID'; payload: string };

// Initial State
const initialState: GameContextState = {
  gameState: null,
  isLoading: true,
  error: null,
  isReplayMode: false,
  currentMoveIndex: 0,
  isAiThinking: false,
  capturedWhite: [],
  capturedBlack: [],
};

// Reducer
function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_GAME_STATE':
      return {
        ...state,
        gameState: action.payload,
        currentMoveIndex: action.payload.moves.length,
        isLoading: false,
        error: null,
      };

    case 'SET_REPLAY_MODE':
      return { ...state, isReplayMode: action.payload };

    case 'SET_CURRENT_MOVE_INDEX':
      return { ...state, currentMoveIndex: action.payload };

    case 'SET_AI_THINKING':
      return { ...state, isAiThinking: action.payload };

    case 'SET_CAPTURED_PIECES':
      return {
        ...state,
        capturedWhite: action.payload.white,
        capturedBlack: action.payload.black,
      };

    case 'UPDATE_BOARD_STATE':
      if (!state.gameState) return state;

      // Determine winner if game is over
      let winner = state.gameState.game.winner;
      let result = state.gameState.game.result;

      if (action.payload.isCheckmate && !winner) {
        // The player whose turn it is has been checkmated, so they lose
        const losingColor = action.payload.turn === 'w' ? 'white' : 'black';
        const winningColor = losingColor === 'white' ? 'black' : 'white';
        const player1Color = state.gameState.game.player1Color || 'white';

        if (state.gameState.game.mode === 'solo') {
          // Solo game: determine if human or computer won
          if (winningColor === player1Color) {
            winner = 'player1'; // Human player won
            result = winningColor === 'white' ? '1-0' : '0-1';
          } else {
            winner = 'computer'; // Computer won
            result = winningColor === 'white' ? '1-0' : '0-1';
          }
        } else {
          // VS game: determine which player won
          if (winningColor === player1Color) {
            winner = 'player1';
            result = winningColor === 'white' ? '1-0' : '0-1';
          } else {
            winner = 'player2';
            result = winningColor === 'white' ? '1-0' : '0-1';
          }
        }
      } else if (action.payload.isDraw && !winner) {
        winner = 'draw';
        result = '1/2-1/2';
      }

      return {
        ...state,
        gameState: {
          ...state.gameState,
          game: {
            ...state.gameState.game,
            winner,
            result,
          },
          boardState: {
            ...state.gameState.boardState,
            fen: action.payload.fen,
            turn: action.payload.turn,
            isCheck: action.payload.isCheck,
            isCheckmate: action.payload.isCheckmate,
          },
        },
      };

    case 'ADD_MOVE':
      if (!state.gameState) return state;
      return {
        ...state,
        gameState: {
          ...state.gameState,
          moves: [...state.gameState.moves, action.payload.move],
          boardState: {
            ...state.gameState.boardState,
            fen: action.payload.newFen,
            turn: action.payload.newTurn,
          },
        },
        currentMoveIndex: state.gameState.moves.length + 1,
      };

    case 'UPDATE_GAME_OBJECT_ID':
      if (!state.gameState) return state;
      return {
        ...state,
        gameState: {
          ...state.gameState,
          game: {
            ...state.gameState.game,
            objectId: action.payload,
          },
        },
      };

    default:
      return state;
  }
}

// Context
const GameContext = createContext<GameContextType | null>(null);

// Provider Component
interface GameProviderProps {
  children: React.ReactNode;
  gameId: string;
}

export function GameProvider({ children, gameId }: GameProviderProps) {

  const currentAccount = useCurrentAccount();
  const { emit, transactionResult$ } = useSocketRxJS();
  const { enqueueMint: enqueueMintSocket } = useMintQueue();

  // Use socket-based minting (emits nftMint event to server)
  const enqueueMint = useCallback(async (rewardType: string, player: { id: string; suiAddress: string }) => {
    if (!player?.id || !player?.suiAddress) {
      return;
    }
    try {
      await enqueueMintSocket(rewardType, player);
    } catch (error) {
      console.error('Error enqueuing mint:', error);
    }
  }, [enqueueMintSocket]);
  
  const { showSuccess, showError } = useToast();
  
  const t = useTranslations();

  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Load game data
  const loadGame = useCallback(async (gameId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { getGame } = await import('@/app/actions/game');
      const result = await getGame(gameId);
      const { gameState } = result;
      
      // Debug logging for objectId
      console.log('[GameContext] Loaded game:', {
        gameId,
        objectId: gameState.game.objectId,
        game: gameState.game
      });
      
      dispatch({ type: 'SET_GAME_STATE', payload: gameState });

      // Load captured pieces
      if (gameState.game.capturedPiecesWhite || gameState.game.capturedPiecesBlack) {
        dispatch({
          type: 'SET_CAPTURED_PIECES',
          payload: {
            white: gameState.game.capturedPiecesWhite ? JSON.parse(gameState.game.capturedPiecesWhite) : [],
            black: gameState.game.capturedPiecesBlack ? JSON.parse(gameState.game.capturedPiecesBlack) : [],
          },
        });
      }
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to load game' });
    }
  }, []);

  // Shared function to process and save a move (database-first, then blockchain via Socket.IO)
  const processMoveToBlockchainAndDatabase = useCallback((
    moveSan: string,
    newFen: string,
    moveDetails: { from: string; to: string; promotion?: string },
    isAiMove: boolean = false,
    gameEndInfo?: { isGameOver: boolean; winner: string | null; result: string; winnerAddress: string | null }
  ): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      if (!state.gameState) {
        reject(new Error('No game state'));
        return;
      }

      if (!currentAccount?.address) {
        const errorMsg = isAiMove 
          ? 'Please connect your wallet to record AI moves on the blockchain'
          : 'Please connect your wallet to make moves';
        dispatch({ 
          type: 'SET_ERROR', 
          payload: errorMsg
        });
        reject(new Error(errorMsg));
        return;
      }

      // Socket connection is handled by useSocketRxJS hook

      try {
        // 1. Save move to database FIRST
        const { makeMove: makeMoveAction, makeAiMove: makeAiMoveAction } = await import('@/app/actions/game');
        
        let moveData;
        try {
          if (isAiMove) {
            moveData = await makeAiMoveAction({
              gameId,
              from: moveDetails.from,
              to: moveDetails.to,
              san: moveSan,
              fen: newFen,
              promotion: moveDetails.promotion,
            });
          } else {
            moveData = await makeMoveAction({
              gameId,
              from: moveDetails.from,
              to: moveDetails.to,
              san: moveSan,
              fen: newFen,
              promotion: moveDetails.promotion,
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to save move to database';
          dispatch({ 
            type: 'SET_ERROR', 
            payload: errorMessage
          });
          reject(new Error(errorMessage));
          return;
        }

        // 2. Generate move hash
        const moveHash = await hashString(`${moveSan}${newFen}`);

        // 3. Generate transaction ID
        const transactionId = `make_move-${gameId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // 4. Check if objectId is available
        const gameObjectId = state.gameState.game.objectId;
        
        if (!gameObjectId) {
          // Queue move with waiting status - it will be processed when object_id is available
          const transactionData: MakeMoveTransactionData = {
            transactionId,
            playerAddress: currentAccount.address,
            data: {
              gameObjectId: '', // Will be filled when object_id is available
              isComputer: isAiMove,
              moveSan,
              fen: newFen,
              moveHash,
              gameId, // Add gameId so server can identify the game
            }
          };
          
          emit('transaction:make_move', {
            ...transactionData,
            status: 'waiting_for_object_id', // Special status
          });
          
          // Move is saved to DB, just waiting for object_id
          resolve();
          return;
        }

        // 5. Emit transaction event to Socket.IO server (objectId is available)
        const transactionData: MakeMoveTransactionData = {
          transactionId,
          playerAddress: currentAccount.address,
          data: {
            gameObjectId,
            isComputer: isAiMove,
            moveSan,
            fen: newFen,
            moveHash,
          }
        };
        
        emit('transaction:make_move', transactionData);

        // If game is ending, also emit end_game transaction
        if (gameEndInfo?.isGameOver) {
          const endGameTransactionId = `end_game-${gameId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const endGameData: EndGameTransactionData = {
            transactionId: endGameTransactionId,
            playerAddress: currentAccount.address,
            data: {
              gameObjectId: state.gameState.game.objectId,
              winner: gameEndInfo.winnerAddress,
              result: gameEndInfo.result as '1-0' | '0-1' | '1/2-1/2',
              finalFen: newFen,
            }
          };
          emit('transaction:end_game', endGameData);
        }

        // 5. Update UI optimistically
        const boardState = 'boardState' in moveData ? moveData.boardState : undefined;
        const isDraw = boardState && 'isDraw' in boardState ? (boardState.isDraw as boolean) : false;
        dispatch({
          type: 'UPDATE_BOARD_STATE',
          payload: {
            fen: boardState?.fen || newFen,
            turn: boardState?.turn || (newFen.split(' ')[1] as 'w' | 'b'),
            isCheck: boardState?.isCheck || false,
            isCheckmate: boardState?.isCheckmate || false,
            isDraw,
          },
        });

        // Add move to history
        if (!state.gameState) {
          reject(new Error('Game state not available'));
          return;
        }
        
        const moveToAdd = moveData.move || {
          gameId,
          moveNumber: state.gameState.moves.length + 1,
          from: moveDetails.from,
          to: moveDetails.to,
          san: moveSan,
          fen: newFen,
          timestamp: new Date().toISOString(),
          playerColor: (newFen.split(' ')[1] === 'w' ? 'black' : 'white') as 'white' | 'black',
        };
        
        dispatch({
          type: 'ADD_MOVE',
          payload: {
            move: moveToAdd,
            newFen,
            newTurn: newFen.split(' ')[1] as 'w' | 'b',
          },
        });

        // Update captured pieces if provided
        if (moveData.capturedPieces) {
          dispatch({
            type: 'SET_CAPTURED_PIECES',
            payload: moveData.capturedPieces,
          });
        }

        // 6. Set up listener for transaction result (one-time)
        transactionResult$
          .pipe(
            filter((result) => 
              result.transactionId === transactionId || 
              (gameEndInfo?.isGameOver && result.transactionId?.startsWith('end_game'))
            ),
            take(1)
          )
          .subscribe((result) => {
            if (result.status === 'success') {
              // Move already saved, just confirm
              if (gameEndInfo?.isGameOver && gameEndInfo?.winnerAddress) {
                showSuccess(t('toast.gameEnded'));
                
                // Wait for database view to refresh and retry if needed
                const attemptEnqueueMint = async (retries = 3, delay = 3000) => {
                  try {
                    const player = await getPlayer(gameEndInfo.winnerAddress);
                    if (player) {
                      console.log(`[GameContext] Enqueuing wins reward mint for player ${player.id} after game end (attempt ${4 - retries}/3)`);
                      await enqueueMint("wins", player);
                    }
                  } catch (error) {
                    console.error(`[GameContext] Error enqueuing mint (${retries} retries left):`, error);
                    if (retries > 0) {
                      setTimeout(() => attemptEnqueueMint(retries - 1, delay), delay);
                    }
                  }
                };
                
                setTimeout(() => attemptEnqueueMint(), 3000);
              }
              resolve();
            } else {
              // Revert move in UI by reloading game state
              console.log('Transaction failed, reverting move...');
              loadGame(gameId).catch((reloadError) => {
                console.warn('Failed to reload game state after error:', reloadError);
              });
              showError(result.error || t('toast.transactionFailed'));
              dispatch({ 
                type: 'SET_ERROR', 
                payload: result.error || t('toast.transactionFailed')
              });
              reject(new Error(result.error || t('toast.transactionFailed')));
            }
          });

        // Resolve immediately (optimistic update)
        // Transaction result will be handled by the listener
        resolve();
      } catch (err) {
        console.error('Error processing move:', err);
        const error = err instanceof Error ? err.message : 'Failed to process move';
        dispatch({ 
          type: 'SET_ERROR', 
          payload: error
        });
        reject(err);
      }
    });
  }, [state.gameState, gameId, transactionResult$, currentAccount, enqueueMint, loadGame, showSuccess, showError, t]);

  // Make a move
  const makeMove = useCallback(async (from: string, to: string, promotion?: string) => {
    if (!state.gameState || state.isReplayMode || state.isAiThinking) return;

    // Check if it's computer's turn in solo mode
    if (state.gameState.game.mode === 'solo' && state.gameState.computerPlayer) {
      const currentTurnColor = state.gameState.boardState.turn === 'w' ? 'white' : 'black';
      const isComputerTurn = state.gameState.computerPlayer.color === currentTurnColor;

      if (isComputerTurn) {
        return; // Don't allow human moves during computer's turn
      }
    }

    try {
      // Process move client-side with chess.js
      const chess = new Chess(state.gameState.boardState.fen);
      
      // Check if promotion is required (pawn reaching 8th rank for white or 1st rank for black)
      const fromPiece = chess.get(from as Square);
      const targetRank = parseInt(to[1]);
      const isPawn = fromPiece?.type === 'p';
      const requiresPromotion = isPawn && (
        (fromPiece?.color === 'w' && targetRank === 8) ||
        (fromPiece?.color === 'b' && targetRank === 1)
      );
      
      // If promotion is required but not provided, default to queen
      const promotionPiece = requiresPromotion ? (promotion || 'q') : promotion;
      
      const move = chess.move({ from, to, promotion: promotionPiece as any });

      if (!move) {
        // Reload game state to ensure we have the latest position
        console.warn('Invalid move detected, reloading game state to resync...');
        try {
          await loadGame(gameId);
        } catch (reloadError) {
          console.warn('Failed to reload game state:', reloadError);
        }
        dispatch({ type: 'SET_ERROR', payload: `Invalid move: ${from} to ${to}. Game state reloaded - please try again.` });
        return;
      }

      // Get move notation and new FEN
      const moveSan = move.san;
      const newFen = chess.fen();

      // Check if game is over
      const isGameOver = chess.isGameOver();
      let gameEndInfo = undefined;
      
      if (isGameOver) {
        const isCheckmate = chess.isCheckmate();
        const isDraw = chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial();
        
        let winner: string | null = null;
        let result: string;
        let winnerAddress: string | null = null;
        
        if (isCheckmate) {
          // The side that just moved won (because the other side is now in checkmate)
          const winningColor = chess.turn() === 'w' ? 'black' : 'white';
          const player1Color = state.gameState.game.player1Color || 'white';
          
          if (state.gameState.game.mode === 'solo') {
            winner = winningColor === player1Color ? 'player1' : 'computer';
            winnerAddress = winningColor === player1Color ? (state.gameState.game.player1?.suiAddress || currentAccount?.address || null) : null;
          } else {
            winner = winningColor === player1Color ? 'player1' : 'player2';
            // Get the correct winner's address based on which player won
            if (winner === 'player1') {
              winnerAddress = state.gameState.game.player1?.suiAddress || null;
            } else {
              winnerAddress = state.gameState.game.player2?.suiAddress || null;
            }
          }
          
          result = winningColor === 'white' ? '1-0' : '0-1';
        } else {
          winner = 'draw';
          result = '1/2-1/2';
          winnerAddress = null;
        }
        
        gameEndInfo = { isGameOver: true, winner, result, winnerAddress };
      }

      // Process move: blockchain first, then database
      await processMoveToBlockchainAndDatabase(
        moveSan,
        newFen,
        { from, to, promotion },
        false,
        gameEndInfo
      );
    } catch (err) {
      console.error('Error making move:', err);
      
      // Reload game state to resync after error
      console.log('Move error occurred, reloading game state to resync...');
      try {
        await loadGame(gameId);
      } catch (reloadError) {
        console.warn('Failed to reload game state after move error:', reloadError);
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to make move';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.gameState, state.isReplayMode, state.isAiThinking, processMoveToBlockchainAndDatabase, currentAccount, loadGame, gameId]);

  // Make AI move
  const makeAiMove = useCallback(async () => {
    if (!state.gameState || state.isReplayMode || state.isAiThinking) return;

    try {
      dispatch({ type: 'SET_AI_THINKING', payload: true });

      // First, get the AI move calculation from the server
      const { calculateAiMove } = await import('@/app/actions/game');
      
      let aiMoveResult;
      try {
        aiMoveResult = await calculateAiMove({
          gameId,
          fen: state.gameState.boardState.fen,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'AI move calculation failed';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        return;
      }

      const { move: aiMoveData } = aiMoveResult;

      // Process the AI move client-side with chess.js
      const chess = new Chess(state.gameState.boardState.fen);
      
      // Check if promotion is required (pawn reaching 8th rank for white or 1st rank for black)
      const fromPiece = chess.get(aiMoveData.from as Square);
      const targetRank = parseInt(aiMoveData.to[1]);
      const isPawn = fromPiece?.type === 'p';
      const requiresPromotion = isPawn && (
        (fromPiece?.color === 'w' && targetRank === 8) ||
        (fromPiece?.color === 'b' && targetRank === 1)
      );
      
      // If promotion is required but not provided, default to queen
      const promotionPiece = requiresPromotion ? (aiMoveData.promotion || 'q') : aiMoveData.promotion;
      
      const move = chess.move({
        from: aiMoveData.from,
        to: aiMoveData.to,
        promotion: promotionPiece as any,
      });

      if (!move) {
        dispatch({ type: 'SET_ERROR', payload: 'Invalid AI move' });
        return;
      }

      // Get move notation and new FEN
      const moveSan = move.san;
      const newFen = chess.fen();

      // Check if game is over
      const isGameOver = chess.isGameOver();
      let gameEndInfo = undefined;
      
      if (isGameOver) {
        console.log(`%c☠️ Goonies Never Say Die!`, 'background-color:black;color:white;font-weight:bold;padding:15px;')
        const isCheckmate = chess.isCheckmate();
        // const isDraw = chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial();
        
        let winner: string | null = null;
        let result: string;
        let winnerAddress: string | null = null;
        
        if (isCheckmate) {
          // The side that just moved won (because the other side is now in checkmate)
          const winningColor = chess.turn() === 'w' ? 'black' : 'white';
          const player1Color = state.gameState.game.player1Color || 'white';
          
          if (state.gameState.game.mode === 'solo') {
            winner = winningColor === player1Color ? 'player1' : 'computer';
            winnerAddress = winningColor === player1Color ? (currentAccount?.address || null) : null;
          } else {
            winner = winningColor === player1Color ? 'player1' : 'player2';
            winnerAddress = currentAccount?.address || null;
          }
          
          result = winningColor === 'white' ? '1-0' : '0-1';
        } else {
          winner = 'draw';
          result = '1/2-1/2';
          winnerAddress = null;
        }
        
        gameEndInfo = { isGameOver: true, winner, result, winnerAddress };
      }

      // Process move: blockchain first, then database
      await processMoveToBlockchainAndDatabase(
        moveSan,
        newFen,
        {
          from: aiMoveData.from,
          to: aiMoveData.to,
          promotion: aiMoveData.promotion,
        },
        true,
        gameEndInfo
      );
    } catch (err) {
      console.error('Error making AI move:', err);
      const errorMessage = err instanceof Error ? err.message : 'AI move failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      // Always reset AI thinking state, even on error
      dispatch({ type: 'SET_AI_THINKING', payload: false });
    }
  }, [state.gameState, state.isReplayMode, state.isAiThinking, gameId, processMoveToBlockchainAndDatabase, currentAccount]);

  // Navigation functions
  const goToMove = useCallback((moveIndex: number) => {
    dispatch({ type: 'SET_CURRENT_MOVE_INDEX', payload: moveIndex });
    dispatch({ type: 'SET_REPLAY_MODE', payload: true });
  }, []);

  const goToCurrentPosition = useCallback(() => {
    if (!state.gameState) return;
    dispatch({ type: 'SET_CURRENT_MOVE_INDEX', payload: state.gameState.moves.length });
    dispatch({ type: 'SET_REPLAY_MODE', payload: false });
  }, [state.gameState]);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  // Forfeit game - called when timer expires or player leaves
  const forfeitGame = useCallback(async () => {
    if (!state.gameState || state.isReplayMode || state.isAiThinking) return;

    const isGameFinished = state.gameState.game.winner !== null;
    if (isGameFinished) return;

    // Check if wallet is connected
    if (!currentAccount) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: 'Please connect your wallet to forfeit the game'
      });
      return;
    }

    try {
      // Determine the current player (who is forfeiting/losing)
      const currentTurnColor = state.gameState.boardState.turn === 'w' ? 'white' : 'black';
      const player1Color = state.gameState.game.player1Color || 'white';
      
      // The player whose turn it is is forfeiting, so the opponent wins
      const losingColor = currentTurnColor;
      const winningColor = losingColor === 'white' ? 'black' : 'white';
      
      console.log('Forfeiting game:', {
        losingColor,
        winningColor,
        player1Color,
        mode: state.gameState.game.mode,
        currentTurn: currentTurnColor
      });
      
      let winner: string | null = null;
      let winnerAddress: string | null = null;
      
      if (state.gameState.game.mode === 'solo') {
        // Solo game: if human is losing, computer wins; if computer is losing, human wins
        if (winningColor === player1Color) {
          winner = 'player1'; // Human player wins
          winnerAddress = currentAccount?.address || null;
        } else {
          winner = 'computer'; // Computer wins (no address)
          winnerAddress = null;
        }
      } else {
        // VS game: determine which player won
        if (winningColor === player1Color) {
          winner = 'player1';
          // For player1, we need their address - get from players
          const player1 = state.gameState.players?.find(p => p.color === player1Color);
          // Try to get from game data if available
          winnerAddress = currentAccount?.address || null;
        } else {
          winner = 'player2';
          // For player2, we need their address - this is tricky since we might not have it
          // In VS mode, we'd need to get the opponent's address
          // For now, we'll leave it as null and let the blockchain handle it
          winnerAddress = null;
        }
      }
      
      // Set result based on winning color - always set before use
      const result: string = winningColor === 'white' ? '1-0' : '0-1';
      
      console.log('Forfeit game winner determination:', {
        winner,
        result,
        winnerAddress,
        gameId
      });
      
      // Ensure winner is set - this should never be null at this point
      if (!winner) {
        console.error('Winner is null in forfeitGame - this should not happen!');
        dispatch({ 
          type: 'SET_ERROR', 
          payload: 'Error: Could not determine winner'
        });
        return;
      }
      
      const currentFen = state.gameState.boardState.fen;
      
      // Socket connection is handled by useSocketRxJS hook

      if (!state.gameState.game.objectId) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: 'Game objectId not available'
        });
        return;
      }

      try {
        // 1. Update database to mark game as finished FIRST
        const { forfeitGame: forfeitGameAction } = await import('@/app/actions/game');
        
        try {
          console.log('Updating database with forfeit:', { gameId, winner, result, finalFen: currentFen });
          await forfeitGameAction({
            gameId,
            winner,
            result,
            finalFen: currentFen,
          });
          console.log('Database updated successfully with forfeit');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update game in database';
          console.error('Error updating database:', errorMessage, error);
          
          // Reload game state to resync after error
          await loadGame(gameId);
          
          dispatch({ 
            type: 'SET_ERROR', 
            payload: errorMessage
          });
          return;
        }
        
        // 2. Emit end_game transaction event
        const transactionId = `end_game-${gameId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const endGameData: EndGameTransactionData = {
          transactionId,
          playerAddress: currentAccount.address,
          data: {
            gameObjectId: state.gameState.game.objectId,
            winner: winnerAddress,
            result: result as '1-0' | '0-1' | '1/2-1/2',
            finalFen: currentFen,
          }
        };
        emit('transaction:end_game', endGameData);
        
        // 3. Update game state optimistically
        dispatch({
          type: 'UPDATE_BOARD_STATE',
          payload: {
            fen: currentFen,
            turn: state.gameState.boardState.turn,
            isCheck: false,
            isCheckmate: false,
            isDraw: false,
          },
        });
        
        // 4. Reload game to get updated state
        await loadGame(gameId);
        
        showSuccess(t('toast.gameForfeited'));
        
        // 5. If there's a winner and they're a human player, enqueue reward mint
        // Wait a bit for database view to refresh
        if (winner && winner !== 'computer' && winner !== 'draw' && winnerAddress) {
          setTimeout(async () => {
            try {
              const player = await getPlayer(winnerAddress);
              if (player) {
                console.log(`[GameContext] Enqueuing wins reward mint for player ${player.id} after forfeit`);
                await enqueueMint("wins", player);
              }
            } catch (error) {
              console.error('Error getting player or enqueuing mint:', error);
            }
          }, 5000);
        }
        
        // 6. Subscribe to transaction result (optional - game is already saved)
        const subscription = transactionResult$
          .pipe(
            filter((result) => result.transactionId === transactionId),
            take(1)
          )
          .subscribe((result) => {
            if (result.status === 'error') {
              // Game is already saved, just log the error
              console.warn('Forfeit blockchain transaction failed, but game was saved:', result.error);
            }
          });
      } catch (err) {
        console.error('Error processing forfeit:', err);
        const error = t('toast.forfeitFailed');
        showError(error);
        await loadGame(gameId);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: error
        });
      }
    } catch (err) {
      console.error('Error forfeiting game:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to forfeit game';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.gameState, state.isReplayMode, state.isAiThinking, currentAccount, gameId, emit, transactionResult$, loadGame, showSuccess, showError, t, enqueueMint]);

  // Auto-trigger AI moves
  useEffect(() => {
    if (state.gameState && !state.isReplayMode && !state.isAiThinking) {
      const isGameFinished = state.gameState.game.winner !== null;
      if (!isGameFinished && state.gameState.computerPlayer) {
        const currentTurnColor = state.gameState.boardState.turn === 'w' ? 'white' : 'black';
        const isComputerTurn = state.gameState.computerPlayer.color === currentTurnColor;

        if (isComputerTurn) {
          const timer = setTimeout(() => {
            makeAiMove();
          }, 1000);

          return () => clearTimeout(timer);
        }
      }
    }
  }, [state.gameState, state.isReplayMode, state.isAiThinking, makeAiMove]);

  // Load game on mount
  useEffect(() => {
    loadGame(gameId);
  }, [gameId, loadGame]);

  // Listen for object_id updates from create_game transactions
  useEffect(() => {
    const subscription = transactionResult$
      .pipe(
        filter((result) => 
          result.status === 'success' && 
          result.objectId && 
          state.gameState?.game.id === gameId &&
          !state.gameState?.game.objectId
        )
      )
      .subscribe(async (result) => {
        if (result.objectId) {
          console.log(`[GameContext] Received object_id update: ${result.objectId} for game ${gameId}`);
          
          // Update gameState transparently with new object_id
          dispatch({
            type: 'UPDATE_GAME_OBJECT_ID',
            payload: result.objectId,
          });
          
          // Reload game to ensure state is in sync
          try {
            await loadGame(gameId);
          } catch (error) {
            console.error('[GameContext] Failed to reload game after object_id update', error);
          }
        }
      });

    return () => subscription.unsubscribe();
  }, [gameId, state.gameState?.game.id, state.gameState?.game.objectId, transactionResult$, loadGame]);

  const contextValue: GameContextType = {
    ...state,
    loadGame,
    makeMove,
    makeAiMove,
    forfeitGame,
    goToMove,
    goToCurrentPosition,
    setError,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

// Hook to use the game context
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}