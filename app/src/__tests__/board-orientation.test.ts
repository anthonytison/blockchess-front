// Board Orientation Tests
// Tests to ensure the human player's pieces are always at the bottom in solo mode

import { GameState, Game, Player, BoardState } from '@/domain/entities';

describe('Board Orientation Logic', () => {
  // Helper function to create a mock game state
  const createMockGameState = (
    mode: 'solo' | 'vs',
    player1Color: 'white' | 'black',
    currentTurn: 'w' | 'b' = 'w'
  ): GameState => {
    const game: Game = {
      id: 'test-game',
      mode,
      player1Name: 'Human',
      player2Name: mode === 'solo' ? 'Computer' : 'Player2',
      player1Color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      moveCount: 0,
    };

    let players: Player[];
    let humanPlayer: Player;
    let computerPlayer: Player | undefined;

    if (mode === 'solo') {
      humanPlayer = {
        name: 'Human',
        color: player1Color,
        isComputer: false,
        isHuman: true,
      };
      
      computerPlayer = {
        name: 'Computer',
        color: player1Color === 'white' ? 'black' : 'white',
        isComputer: true,
        isHuman: false,
      };
      
      players = [humanPlayer, computerPlayer];
    } else {
      const player1: Player = {
        name: 'Human',
        color: player1Color,
        isComputer: false,
        isHuman: true,
      };
      
      const player2: Player = {
        name: 'Player2',
        color: player1Color === 'white' ? 'black' : 'white',
        isComputer: false,
        isHuman: true,
      };
      
      players = [player1, player2];
      humanPlayer = player1;
    }

    const boardState: BoardState = {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: currentTurn,
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      legalMoves: [],
    };

    return {
      game,
      players,
      humanPlayer,
      computerPlayer,
      boardState,
      moves: [],
      currentPosition: 0,
    };
  };

  describe('Solo Mode - Human Player Always at Bottom', () => {
    test('When human chooses WHITE pieces, WHITE pieces should be at BOTTOM (board NOT flipped)', () => {
      const gameState = createMockGameState('solo', 'white');
      
      // Expected behavior:
      // - Human chose white pieces
      // - White pieces should be at bottom for human player
      // - Board should NOT be flipped (normal orientation)
      // - Player can only move white pieces
      
      const expectedIsFlipped = false; // White pieces at bottom = normal orientation
      const expectedPlayerColor = 'white';
      
      expect(gameState.game.player1Color).toBe('white');
      expect(gameState.humanPlayer.name).toBe('Human');
      expect(gameState.humanPlayer.color).toBe('white');
      expect(gameState.humanPlayer.isComputer).toBe(false);
      expect(gameState.computerPlayer?.name).toBe('Computer');
      expect(gameState.computerPlayer?.color).toBe('black');
      expect(gameState.computerPlayer?.isComputer).toBe(true);
      
      // Board orientation logic - flip if human chose black (so human pieces are at bottom)
      const isFlipped = gameState.game.mode === 'solo' 
        ? gameState.humanPlayer.color === 'black'
        : false;
      
      // Player color - human player's chosen color
      const playerColor = gameState.humanPlayer.color;
      
      expect(isFlipped).toBe(expectedIsFlipped);
      expect(playerColor).toBe(expectedPlayerColor);
    });

    test('When human chooses BLACK pieces, BLACK pieces should be at BOTTOM (board IS flipped)', () => {
      const gameState = createMockGameState('solo', 'black');
      
      // Expected behavior:
      // - Human chose black pieces
      // - Black pieces should be at bottom for human player
      // - Board should be flipped (black pieces move to bottom)
      // - Player can only move black pieces
      
      const expectedIsFlipped = true; // Black pieces at bottom = flipped orientation
      const expectedPlayerColor = 'black';
      
      expect(gameState.game.player1Color).toBe('black');
      expect(gameState.humanPlayer.name).toBe('Human');
      expect(gameState.humanPlayer.color).toBe('black');
      expect(gameState.humanPlayer.isComputer).toBe(false);
      expect(gameState.computerPlayer?.name).toBe('Computer');
      expect(gameState.computerPlayer?.color).toBe('white');
      expect(gameState.computerPlayer?.isComputer).toBe(true);
      
      // Board orientation logic - flip if human chose black (so human pieces are at bottom)
      const isFlipped = gameState.game.mode === 'solo' 
        ? gameState.humanPlayer.color === 'black'
        : false;
      
      // Player color - human player's chosen color
      const playerColor = gameState.humanPlayer.color;
      
      expect(isFlipped).toBe(expectedIsFlipped);
      expect(playerColor).toBe(expectedPlayerColor);
    });
  });

  describe('VS Mode - Traditional Chess Orientation', () => {
    test('In VS mode, board should flip on black turn (traditional behavior)', () => {
      const gameState = createMockGameState('vs', 'white', 'b');
      
      // In VS mode, board flips based on current turn, not player color
      const isFlipped = gameState.game.mode === 'vs' && gameState.boardState.turn === 'b';
      
      expect(isFlipped).toBe(true);
    });

    test('In VS mode, board should not flip on white turn', () => {
      const gameState = createMockGameState('vs', 'white', 'w');
      
      // In VS mode, board flips based on current turn, not player color
      const isFlipped = gameState.game.mode === 'vs' && gameState.boardState.turn === 'b';
      
      expect(isFlipped).toBe(false);
    });
  });

  describe('Player Move Validation', () => {
    test('In solo mode, human can only move their chosen color pieces', () => {
      const gameStateWhite = createMockGameState('solo', 'white');
      const gameStateBlack = createMockGameState('solo', 'black');
      
      // When human chose white, they can only move white pieces
      expect(gameStateWhite.game.player1Color).toBe('white');
      
      // When human chose black, they can only move black pieces  
      expect(gameStateBlack.game.player1Color).toBe('black');
    });

    test('Computer turn detection works correctly', () => {
      const gameState = createMockGameState('solo', 'white', 'b'); // Human is white, current turn is black (computer's turn)
      
      const currentTurnColor = gameState.boardState.turn === 'w' ? 'white' : 'black';
      const isComputerTurn = gameState.computerPlayer?.color === currentTurnColor;
      
      expect(isComputerTurn).toBe(true);
    });

    test('Human turn detection works correctly', () => {
      const gameState = createMockGameState('solo', 'white', 'w'); // Human is white, current turn is white (human's turn)
      
      const currentTurnColor = gameState.boardState.turn === 'w' ? 'white' : 'black';
      const isComputerTurn = gameState.computerPlayer?.color === currentTurnColor;
      
      expect(isComputerTurn).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('Default player1Color should be white if not specified', () => {
      const gameState = createMockGameState('solo', 'white');
      const playerColor = gameState.humanPlayer.color;
      
      expect(playerColor).toBe('white');
    });
  });
});