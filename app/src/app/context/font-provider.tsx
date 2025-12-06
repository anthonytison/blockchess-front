"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useKonamiCode } from '@/hooks/use-konami-code';

interface FontContextType {
  isPixelFont: boolean;
  togglePixelFont: () => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or default to false
  const [isPixelFont, setIsPixelFont] = useState(false);

  // Load from localStorage on mount (after hydration)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(process.env.NEXT_PUBLIC_STORAGE_PIXEL as string);
      const shouldBePixel = saved === 'true';
      if (shouldBePixel !== isPixelFont) {
        setIsPixelFont(shouldBePixel);
      }
    }
  }, []);

  const handleKonamiCode = () => {
    localStorage.getItem(process.env.NEXT_PUBLIC_STORAGE_PIXEL as string) === 'true' ? setIsPixelFont(false) : setIsPixelFont(true);
  };

  useKonamiCode(handleKonamiCode);

  // Apply font class to html element for global font switching
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      if (isPixelFont) {
        html.classList.add('pixel-font-active');
      } else {
        html.classList.remove('pixel-font-active');
      }
      
      // Force a reflow to ensure styles are applied
      void html.offsetHeight;
    }
  }, [isPixelFont]);

  // Save to localStorage whenever isPixelFont changes (backup save)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const valueToSave = isPixelFont ? 'true' : 'false';
      localStorage.setItem(process.env.NEXT_PUBLIC_STORAGE_PIXEL as string, valueToSave);
    }
  }, [isPixelFont]);

  const togglePixelFont = () => {
    setIsPixelFont((prev) => {
      const newValue = !prev;
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(process.env.NEXT_PUBLIC_STORAGE_PIXEL as string, String(newValue));
      }
      return newValue;
    });
  };

  return (
    <FontContext.Provider
      value={{
        isPixelFont,
        togglePixelFont,
      }}
    >
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
}

