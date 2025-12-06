"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Square } from "./square";
import { ChessEngine } from "@/lib/chess/engine";
import { ChessPiece } from "./chess-pieces";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PromotionModal } from "@/components/game/promotion-modal";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useGame } from "@/contexts/game-context";

interface BoardProps {
  fen?: string;
  onMove?: (from: string, to: string, promotion?: string) => void;
  isFlipped?: boolean;
  highlightedSquares?: string[];
  className?: string;
  playerColor?: 'white' | 'black' | null; // Color the human player can move
  isComputerGame?: boolean; // Whether this is a game against computer
  isPlayerTurn?: boolean; // Whether it's the human player's turn
}

export function Board({ 
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  onMove,
  isFlipped = false,
  highlightedSquares = [],
  className,
  playerColor = null,
  isComputerGame = false,
  isPlayerTurn = true
}: BoardProps) {
  const currentAccount = useCurrentAccount();
  const { gameState } = useGame();

  if (!gameState) return null;

  const isGameFinished = gameState.game.winner !== null;
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [movingPiece, setMovingPiece] = useState<{ from: string; to: string; piece: any; capturedSquare?: string } | null>(null);
  const [promotionMove, setPromotionMove] = useState<{ from: string; to: string } | null>(null);
  const prevFenRef = useRef<string>(fen);
  const boardRef = useRef<HTMLDivElement>(null);

  // Memoize engine and board to avoid recreating on every render
  // This improves performance and prevents visual glitches
  const { engine, board } = useMemo(() => {
    const engineInstance = new ChessEngine(fen);
    const boardInstance = engineInstance.getBoard();
    return { engine: engineInstance, board: boardInstance };
  }, [fen]);

  // Detect AI moves or programmatic moves by comparing FEN changes
  // Also clear user-initiated animations when FEN updates
  // Use a ref to track if we're in a user-initiated move to prevent double animation
  const isUserMoveRef = useRef(false);
  
  useEffect(() => {
    // If FEN changed and we have a user-initiated animation, clear it
    if (prevFenRef.current && prevFenRef.current !== fen && movingPiece && isUserMoveRef.current) {
      // FEN has updated, clear the animation
      setMovingPiece(null);
      isUserMoveRef.current = false;
      prevFenRef.current = fen;
      return;
    }
    
    // Skip if there's already an animation or if this is a user-initiated move
    if (prevFenRef.current && prevFenRef.current !== fen && !movingPiece && !isUserMoveRef.current) {
      const prevEngine = new ChessEngine(prevFenRef.current);
      const currentEngine = new ChessEngine(fen);
      const prevBoard = prevEngine.getBoard();
      const currentBoard = currentEngine.getBoard();

      // Find the piece that moved
      let fromSquare: string | null = null;
      let toSquare: string | null = null;
      let movedPiece: any = null;

      // Check all squares to find what changed
      let capturedPieceSquare: string | null = null;
      
      for (let rank = 1; rank <= 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const square = `${'abcdefgh'[file]}${rank}`;
          const prevPiece = prevBoard.flatMap(p => p).find(p => p?.square === square);
          const currentPiece = currentBoard.flatMap(p => p).find(p => p?.square === square);

          if (!prevPiece && currentPiece) {
            // Piece appeared here (destination)
            toSquare = square;
            movedPiece = currentPiece;
          } else if (prevPiece && !currentPiece) {
            // Piece disappeared from here
            if (!fromSquare) {
              // First disappearance is the source
              fromSquare = square;
              movedPiece = prevPiece;
            } else if (square === toSquare) {
              // If this is the destination square, the piece that disappeared here was captured
              capturedPieceSquare = square;
            } else {
              // Another piece disappeared (shouldn't happen in normal moves, but handle it)
              capturedPieceSquare = square;
            }
          } else if (prevPiece && currentPiece && 
                     (prevPiece.type !== currentPiece.type || prevPiece.color !== currentPiece.color)) {
            // Piece changed at same square (capture - different piece type/color)
            // This means a piece moved here and captured the previous piece
            if (!fromSquare) {
              // We haven't found the source yet, this might be a special case
              // But typically the source would be found first
            }
            toSquare = square;
            movedPiece = currentPiece;
            capturedPieceSquare = square; // The captured piece was here (prevPiece)
          }
        }
      }
      
      // If destination is same as a square where a piece disappeared, it's a capture
      if (toSquare && !capturedPieceSquare) {
        const prevPieceAtDest = prevBoard.flatMap(p => p).find(p => p?.square === toSquare);
        const currentPieceAtDest = currentBoard.flatMap(p => p).find(p => p?.square === toSquare);
        if (prevPieceAtDest && currentPieceAtDest && 
            (prevPieceAtDest.type !== currentPieceAtDest.type || prevPieceAtDest.color !== currentPieceAtDest.color)) {
          capturedPieceSquare = toSquare;
        }
      }

      // If we found a move, trigger animation
      if (fromSquare && toSquare && movedPiece && fromSquare !== toSquare) {
        setMovingPiece({ 
          from: fromSquare, 
          to: toSquare, 
          piece: movedPiece,
          capturedSquare: capturedPieceSquare || undefined
        });
        // Clear animation after it completes
        setTimeout(() => setMovingPiece(null), 300);
      } else if (fromSquare && toSquare && movedPiece && fromSquare === toSquare) {
        // Same square (promotion or other special case) - no animation needed
        // But still handle captured piece if it exists
        if (capturedPieceSquare) {
          setMovingPiece({ 
            from: fromSquare, 
            to: toSquare, 
            piece: movedPiece,
            capturedSquare: capturedPieceSquare
          });
          setTimeout(() => setMovingPiece(null), 300);
        }
      }
    }
    prevFenRef.current = fen;
  }, [fen, movingPiece]);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const squares = [];
  for (let rank of (isFlipped ? [...ranks].reverse() : ranks)) {
    for (let file of (isFlipped ? [...files].reverse() : files)) {
      squares.push(`${file}${rank}`);
    }
  }
  const handleSquareClick = (square: string) => {
    // Don't allow interaction if it's not the player's turn in computer games
    if (isComputerGame && !isPlayerTurn) {
      return;
    }

    if (selectedSquare === square) {
      // Deselect if clicking the same square
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (selectedSquare && legalMoves.includes(square)) {
      // Get the piece that's moving before the move happens
      const pieceToMove = engine.getPiece(selectedSquare);
      
      // Check if this is a promotion move (pawn moving to 8th rank for white or 1st rank for black)
      // chess.js returns piece type as lowercase single letter: 'p', 'r', 'n', 'b', 'q', 'k'
      const isPawn = pieceToMove?.type === 'p';
      const targetRank = parseInt(square[1]);
      const isPromotion = isPawn && (
        (pieceToMove?.color === 'w' && targetRank === 8) ||
        (pieceToMove?.color === 'b' && targetRank === 1)
      );
      
      if (isPromotion) {
        // Show promotion modal
        setPromotionMove({ from: selectedSquare, to: square });
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      
      // Check if there's a piece at the destination (capture)
      const pieceAtDestination = engine.getPiece(square);
      const isCapture = !!pieceAtDestination;
      
      if (pieceToMove) {
        // Mark as user-initiated move to prevent duplicate animation from FEN change
        isUserMoveRef.current = true;
        
        // Trigger animation immediately, including capture info
        setMovingPiece({
          from: selectedSquare,
          to: square,
          piece: pieceToMove,
          capturedSquare: isCapture ? square : undefined
        });
        
        // Don't clear animation here - let it clear when FEN updates
        // This prevents the glitch where piece appears at old position
      }
      
      // Make move
      onMove?.(selectedSquare, square);
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Select new square
    const piece = engine.getPiece(square);
    if (piece) {
      // In computer games, only allow moving pieces of the player's color
      if (isComputerGame && playerColor) {
        const pieceColor = piece.color === 'w' ? 'white' : 'black';
        if (pieceColor !== playerColor) {
          // Don't allow selecting opponent's pieces in computer games
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
      }
      
      const moves = engine.getLegalMoves(square);
      setSelectedSquare(square);
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const renderPiece = (piece: any) => {
    if (!piece) return null;
    
    return (
      <ChessPiece 
        type={piece.type} 
        color={piece.color === 'w' ? 'white' : 'black'}
      />
    );
  };

  // Calculate square positions for animation (in percentage)
  // This must match the actual visual layout of squares on the board
  const getSquarePosition = (square: string) => {
    // Find the index of this square in the rendered squares array
    // This ensures the position matches exactly where it's rendered
    const squareIndex = squares.findIndex(sq => sq === square);
    
    if (squareIndex === -1) {
      // Fallback calculation if square not found
      const file = square[0];
      const rank = square[1];
      const fileIndex = files.indexOf(file);
      const rankIndex = parseInt(rank) - 1;
      return {
        left: `${fileIndex * (100 / 8)}%`,
        top: `${rankIndex * (100 / 8)}%`,
      };
    }
    
    // Calculate position based on grid layout (8 columns)
    const col = squareIndex % 8;
    const row = Math.floor(squareIndex / 8);
    
    return {
      left: `${col * (100 / 8)}%`,
      top: `${row * (100 / 8)}%`,
    };
  };

  return (
    <div 
      ref={boardRef}
      className={cn(
        "chess-board relative", 
      className,
      {
        "opacity-75 pointer-events-none": isComputerGame && !isPlayerTurn
      }
      )}
      role="application"
      aria-label="Chess board"
      aria-describedby="chess-board-description"
    >
      <div id="chess-board-description" className="sr-only">
        Interactive chess board. Use arrow keys to navigate between squares, Enter or Space to select a square or make a move.
      </div>
      {squares.map((square, index) => {
        const file = square[0];
        const rank = square[1];
        const isLight = (files.indexOf(file) + parseInt(rank)) % 2 === 0;
        const piece = board.flatMap(p => p).find(p => p?.square === square);
        
        // Hide pieces during animation to prevent duplication
        const isMovingFrom = movingPiece?.from === square;
        const isMovingTo = movingPiece?.to === square;
        
        // For user moves: keep hiding piece at source until FEN shows piece at destination
        // This prevents the glitch where piece briefly appears at old position
        let shouldHidePiece = isMovingFrom || isMovingTo;
        
        if (isMovingFrom && isUserMoveRef.current && movingPiece) {
          // Check if FEN has updated by seeing if piece is now at destination
          const pieceAtDestination = board.flatMap(p => p).find(
            p => p?.square === movingPiece.to && 
            p?.type === movingPiece.piece.type && 
            p?.color === movingPiece.piece.color
          );
          
          // If piece is not yet at destination in current FEN, keep hiding at source
          if (!pieceAtDestination) {
            shouldHidePiece = true;
          }
        }

        return (
          <Square
            key={square}
            square={square}
            piece={shouldHidePiece ? null : renderPiece(piece)}
            isLight={isLight}
            isSelected={selectedSquare === square}
            isLegalMove={legalMoves.includes(square)}
            isHighlighted={highlightedSquares.includes(square)}
            disabled={!currentAccount || isGameFinished}
            onClick={() => handleSquareClick(square)}
          />
        );
      })}
      
      {/* Animated moving piece overlay */}
      <AnimatePresence>
        {movingPiece && (
          <motion.div
            className="absolute pointer-events-none z-50 flex items-center justify-center"
            initial={getSquarePosition(movingPiece.from)}
            animate={getSquarePosition(movingPiece.to)}
            exit={getSquarePosition(movingPiece.to)}
            transition={{
              type: "tween",
              ease: "easeInOut",
              duration: 0.3,
            }}
            style={{
              width: `${100 / 8}%`,
              height: `${100 / 8}%`,
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              {renderPiece(movingPiece.piece)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Promotion Modal */}
      <PromotionModal
        open={!!promotionMove}
        onSelect={(piece) => {
          if (promotionMove) {
            // Get the piece that's moving
            const pieceToMove = engine.getPiece(promotionMove.from);
            const pieceAtDestination = engine.getPiece(promotionMove.to);
            const isCapture = !!pieceAtDestination;
            
            if (pieceToMove) {
              // Mark as user-initiated move
              isUserMoveRef.current = true;
              
              // Trigger animation
              setMovingPiece({
                from: promotionMove.from,
                to: promotionMove.to,
                piece: pieceToMove,
                capturedSquare: isCapture ? promotionMove.to : undefined
              });
            }
            
            // Make move with promotion
            onMove?.(promotionMove.from, promotionMove.to, piece);
            setPromotionMove(null);
            setSelectedSquare(null);
            setLegalMoves([]);
          }
        }}
        playerColor={playerColor || 'white'}
      />
    </div>
  );
}