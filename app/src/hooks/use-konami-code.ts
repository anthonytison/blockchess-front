"use client";

import { useEffect, useState, useRef } from 'react';

const konamiCodeString: string = "ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,KeyB,KeyA";

// Konami code sequence: Up, Up, Down, Down, Left, Right, Left, Right, B, A
const konamiCode: string[] = konamiCodeString.split(',');

// Timeout between key presses (500ms)
const keyTimeout = 500;

// Konami console log
console.log(`%c☠️ If You Hit The Wrong Note, We'll All 'B Flat'.`, 'background-color:black;color:white;font-weight:bold;padding:15px;')

// Normalize key for keyboard layout-aware matching
// Use event.code for arrow keys (physical position) and event.key for letters (logical character)
function normalizeKey(code: string, key: string): string {
  // For arrow keys, use event.code (physical position is same on all layouts)
  if (code.startsWith('Arrow')) {
    return code;
  }
  
  // For letter keys, use event.key (logical character, works with AZERTY/QWERTY/etc.)
  // This ensures "A" and "B" work regardless of keyboard layout
  if (key && key.length === 1 && /[a-zA-Z]/.test(key)) {
    return `Key${key.toUpperCase()}`;
  }
  
  // Fallback to event.code for other keys
  return code;
}

export function useKonamiCode(onSuccess: () => void) {
  const [sequence, setSequence] = useState<string[]>([]);
  const onSuccessRef = useRef(onSuccess);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep the callback ref up to date
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = normalizeKey(event.code, event.key);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setSequence((prev) => {
        const newSequence = [...prev, key];

        // Keep only the last N keys (where N is the length of Konami code)
        const trimmedSequence = newSequence.slice(-konamiCode.length);

        // Join sequences into strings for comparison
        const sequenceString = trimmedSequence.join(',');

        // Check if the sequence matches by comparing strings
        if (trimmedSequence.length === konamiCode.length) {
          const matches = sequenceString === konamiCodeString;

          if (matches) {
            // Clear timeout since we matched
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            console.log(`%c☠️ Jerk Alert!`, 'background-color:black;color:white;font-weight:bold;padding:15px;')
            onSuccessRef.current();
            return []; // Reset sequence after success
          }
        }

        return trimmedSequence;
      });

      // Set timeout to reset sequence if no key is pressed within 500ms
      timeoutRef.current = setTimeout(() => {
        setSequence([]);
        timeoutRef.current = null;
      }, keyTimeout);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Empty dependency array - handler is stable

  return sequence;
}

