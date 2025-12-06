"use client";

import { cn } from "@/lib/utils";

interface SquareProps {
  square: string;
  piece?: React.ReactNode;
  isLight: boolean;
  isSelected?: boolean;
  isLegalMove?: boolean;
  isHighlighted?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function Square({
  square,
  piece,
  isLight,
  isSelected = false,
  isLegalMove = false,
  isHighlighted = false,
  disabled = false,
  onClick
}: SquareProps) {
  const file = square[0];
  const rank = square[1];
  const squareColor = isLight ? 'light' : 'dark';
  
  // Build descriptive aria-label
  let ariaLabel = `Square ${file}${rank}, ${squareColor} square`;
  if (piece) {
    ariaLabel += `, contains piece`;
  } else {
    ariaLabel += `, empty`;
  }
  if (isSelected) {
    ariaLabel += `, selected`;
  }
  if (isLegalMove) {
    ariaLabel += piece ? `, legal capture` : `, legal move`;
  }
  if (isHighlighted) {
    ariaLabel += `, last move`;
  }

  return (
    <button
      className={cn(
        "chess-square",
        isLight ? "light" : "dark",
        {
          "selected": isSelected,
          "legal-move": isLegalMove && !piece,
          "legal-capture": isLegalMove && piece,
          "last-move": isHighlighted,
        }
      )}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {piece && (
        <div className="chess-piece" aria-hidden="true">
          {piece}
        </div>
      )}
      
      {/* Square coordinates for accessibility */}
      <span className="sr-only">{square}</span>
    </button>
  );
}