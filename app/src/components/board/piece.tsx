"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PieceProps {
  type: string;
  color: 'white' | 'black';
  isMoving?: boolean;
  className?: string;
}

const pieceSymbols = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙'
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟'
  }
};

export function Piece({ type, color, isMoving = false, className }: PieceProps) {
  const symbol = pieceSymbols[color][type as keyof typeof pieceSymbols.white];

  return (
    <motion.span
      className={cn(
        "chess-piece",
        {
          "moving": isMoving
        },
        className
      )}
      animate={isMoving ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
      role="img"
      aria-label={`${color} ${type}`}
    >
      {symbol}
    </motion.span>
  );
}