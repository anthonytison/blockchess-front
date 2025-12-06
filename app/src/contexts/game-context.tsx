"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { GameState } from '@/domain/entities';
import { endGameTransaction, moveTransaction, packageId } from '@/lib/sui-transactions';
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Chess, Square } from 'chess.js';
import { Transaction } from '@mysten/sui/transactions';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { useMintQueue } from '@/hooks/use-mint-queue';
import { useToast } from '@/app/context/toast-provider';
import { getPlayer } from '@/app/actions/account';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';

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
  | { type: 'ADD_MOVE'; payload: { move: any; newFen: string; newTurn: 'w' | 'b' } };

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

  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  const { enqueueMint } = useMintQueue();
  
  const { showSuccess, showError } = useToast();
  
  const t = useTranslations();

  // Standalone waitForTransaction function to avoid Suspense boundary issues
  const waitForTransaction = useCallback(async (
    digest: string, 
    maxRetries = 15, 
    delay = 1000
  ): Promise<SuiTransactionBlockResponse | null> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const txResponse = await suiClient.getTransactionBlock({
          digest,
          options: {
            showEffects: true,
            showObjectChanges: true,
            showInput: true,
            showEvents: true,
            showBalanceChanges: true,
          },
        });
        return txResponse;
      } catch (error: any) {
        if (i === maxRetries - 1) throw error;
        console.log(`Transaction not indexed yet, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      }
    }
    return null;
  }, [suiClient]);

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

  // Shared function to process and save a move (blockchain-first, then database)
  const processMoveToBlockchainAndDatabase = useCallback((
    moveSan: string,
    newFen: string,
    moveDetails: { from: string; to: string; promotion?: string },
    isAiMove: boolean = false,
    gameEndInfo?: { isGameOver: boolean; winner: string | null; result: string; winnerAddress: string | null }
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!state.gameState) {
        reject(new Error('No game state'));
        return;
      }

      // Check if wallet is connected
      if (!currentAccount) {
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

      // Log for clarity
      // if (isAiMove) {
      //   console.log('Recording AI move on blockchain using your wallet:', currentAccount.address);
      // }

      // Generate hash for blockchain
      hashString(`${moveSan}${newFen}`).then(moveHash => {
        // Create blockchain transaction
        const transaction = new Transaction();

        moveTransaction(transaction, {
          gameObjectId: state.gameState!.game.objectId as string,
          isComputer: isAiMove,
          moveSan,
          fen: newFen,
          moveHash
        })
        
        // If game is ending, add end_game call to same transaction
        if (gameEndInfo?.isGameOver) {
          console.log('Game ending - adding end_game call to transaction');
          
          endGameTransaction(transaction, {
            gameObjectId: state.gameState!.game.objectId as string,
            winner: gameEndInfo.winnerAddress,
            result: gameEndInfo.result,
            finalFen: newFen,
          })
        }

        // Execute blockchain transaction first
        signAndExecute(
          { transaction },
          {
            onSuccess: async (result) => {
              try {
                console.log('Blockchain transaction submitted:', result.digest);

                // Wait for transaction to be confirmed on blockchain before saving to database
                // This ensures moves are only saved after blockchain is updated
                console.log('Waiting for blockchain transaction confirmation...');
                const txResponse = await waitForTransaction(result.digest, 15, 1000);
                
                if (!txResponse || (txResponse.effects && txResponse.effects.status.status !== "success")) {
                  throw new Error('Transaction failed or was not confirmed');
                }
                
                console.log('Blockchain transaction confirmed:', result.digest);

                // After blockchain confirmation, save to database
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
                  
                  // Reload game state to resync after error
                  console.log('Move failed, reloading game state to resync...');
                  try {
                    await loadGame(gameId);
                  } catch (reloadError) {
                    console.warn('Failed to reload game state after error:', reloadError);
                  }
                  
                  dispatch({ 
                    type: 'SET_ERROR', 
                    payload: errorMessage
                  });
                  reject(new Error(errorMessage));
                  return;
                }

                console.log('Response from database:', moveData);

                  // Update board state
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
                  // Ensure move object has all required fields
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
                    playerColor: (newFen.split(' ')[1] === 'w' ? 'black' : 'white') as 'white' | 'black', // The player who just moved
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

                  // Check if game ended and database has been updated with winner
                  // The API response confirms the database transaction is complete
                  if (gameEndInfo?.isGameOver && gameEndInfo?.winnerAddress && 'isGameOver' in moveData && moveData.isGameOver && 'winner' in moveData && moveData.winner) {
                    console.log('Game ended - database updated with winner:', moveData.winner);
                    
                    // Show success toast for game ended
                    showSuccess(t('toast.gameEnded'));
                    
                    // Wait longer for the database view to refresh with the new win count
                    // PostgreSQL views may need more time to reflect the updated game state
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    try {
                      const player = await getPlayer(gameEndInfo.winnerAddress);
                      if (player) {
                        console.log('Enqueuing reward mint for player:', player);
                        // Enqueue in background queue - won't block game state reload
                        // The mint queue will handle retries if the view hasn't updated yet
                        enqueueMint("wins", player);
                      } else {
                        console.warn('Player not found for address:', gameEndInfo.winnerAddress);
                      }
                    } catch (error) {
                      console.error('Error getting player or enqueuing mint:', error);
                      // Don't reject the promise - game move was successful, reward minting is secondary
                    }
                  }

                  // No need to reload game state - we already have the updated state from the server action
                  // The state has been updated optimistically via dispatch actions above
                  // This prevents visual glitches and provides smooth transitions
                  resolve();
              } catch (err) {
                console.error('Error saving to database:', err);
                const error = t('toast.moveFailed');
                
                // Show error toast
                showError(error);
                
                // Reload game state to resync after error
                console.log('Move failed, reloading game state to resync...');
                try {
                  await loadGame(gameId);
                } catch (reloadError) {
                  console.warn('Failed to reload game state after error:', reloadError);
                }
                
                dispatch({ 
                  type: 'SET_ERROR', 
                  payload: error
                });
                reject(err);
              }
            },
            onError: (error: any) => {
              // Extract error message properly - handle empty objects or missing messages
              const errorMessage = error?.message || 
                                  error?.toString() || 
                                  (typeof error === 'string' ? error : 'Unknown error');
              console.error('Blockchain transaction failed:', errorMessage, error);
              const errorMsg = t('toast.transactionFailed');
              
              // Show error toast
              showError(errorMsg);
              
              // Reload game state to resync after blockchain error
              console.log('Blockchain transaction failed, reloading game state to resync...');
              loadGame(gameId).catch((reloadError) => {
                console.warn('Failed to reload game state after blockchain error:', reloadError);
              });
              
              dispatch({ 
                type: 'SET_ERROR', 
                payload: errorMsg
              });
              reject(new Error(errorMsg));
            },
          }
        );
      }).catch(err => {
        console.error('Error generating hash:', err);
        const error = 'Failed to process move';
        dispatch({ 
          type: 'SET_ERROR', 
          payload: error
        });
        reject(err);
      });
    });
  }, [state.gameState, gameId, signAndExecute, currentAccount, suiClient, enqueueMint, waitForTransaction, loadGame, showSuccess, showError, t]);

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
            winnerAddress = winningColor === player1Color ? (currentAccount?.address || null) : null;
          } else {
            winner = winningColor === player1Color ? 'player1' : 'player2';
            winnerAddress = currentAccount?.address || null; // Current player won
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
      
      // Create blockchain transaction to end the game
      const transaction = new Transaction();
      
      endGameTransaction(transaction, {
        gameObjectId: state.gameState.game.objectId as string,
        winner: winnerAddress,
        result,
        finalFen: currentFen,
      });
      
      // Execute blockchain transaction
      signAndExecute(
        { transaction },
        {
          onSuccess: async (txResult) => {
            try {
              console.log('Forfeit game transaction successful:', txResult.digest);
              
              // Update database to mark game as finished
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
              
              // Update game state
              dispatch({
                type: 'UPDATE_BOARD_STATE',
                payload: {
                  fen: currentFen,
                  turn: state.gameState!.boardState.turn,
                  isCheck: false,
                  isCheckmate: false,
                  isDraw: false,
                },
              });
              
              // Reload game to get updated state
              await loadGame(gameId);
              
              showSuccess(t('toast.gameForfeited'));
              
              // If there's a winner and they're a human player, enqueue reward mint
              if (winner && winner !== 'computer' && winner !== 'draw' && winnerAddress) {
                try {
                  const player = await getPlayer(winnerAddress);
                  if (player) {
                    enqueueMint("wins", player);
                  }
                } catch (error) {
                  console.error('Error getting player or enqueuing mint:', error);
                }
              }
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
          },
          onError: async (error: any) => {
            // Handle empty error object or error with no useful info
            // If error is empty object or has no enumerable properties, just proceed
            const errorKeys = error ? Object.keys(error) : [];
            const isEmptyError = !error || (typeof error === 'object' && errorKeys.length === 0);
            
            if (isEmptyError) {
              console.warn('Forfeit transaction failed - Empty error object, proceeding with database update');
            } else {
              console.error('Forfeit transaction failed - Error:', error);
            }
            
            // Even if blockchain transaction fails, still update database since timer expired
            // The game should be marked as finished regardless of blockchain success
            try {
              console.log('Attempting to update database despite blockchain transaction failure', {
                gameId,
                winner,
                result,
                finalFen: currentFen
              });
              
              const { forfeitGame: forfeitGameAction } = await import('@/app/actions/game');
              
              await forfeitGameAction({
                gameId,
                winner,
                result,
                finalFen: currentFen,
              });
              
              console.log('Database updated successfully despite blockchain failure');
              
              // Reload game to get updated state
              await loadGame(gameId);
              
              // Show success message - game was saved even though blockchain failed
              // The game result is still correct in the database
              showSuccess(t('toast.gameForfeited'));
              
              // Clear any error state since we successfully saved to database
              dispatch({ 
                type: 'SET_ERROR', 
                payload: null
              });
              
              // Don't show error toast for blockchain failure since we saved to database
              // The game result is still correct
              return; // Exit early - don't show blockchain error
            } catch (dbError) {
              console.error('Failed to update database after transaction failure:', dbError);
              const dbErrorMessage = dbError instanceof Error ? dbError.message : 'Failed to update game in database';
              
              // Reload game state anyway
              loadGame(gameId).catch((reloadError) => {
                console.warn('Failed to reload game state after forfeit error:', reloadError);
              });
              
              showError(dbErrorMessage);
              dispatch({ 
                type: 'SET_ERROR', 
                payload: dbErrorMessage
              });
            }
          },
        }
      );
    } catch (err) {
      console.error('Error forfeiting game:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to forfeit game';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.gameState, state.isReplayMode, state.isAiThinking, currentAccount, gameId, signAndExecute, loadGame, showSuccess, showError, t, enqueueMint]);

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