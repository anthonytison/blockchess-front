"use client";

import { useEffect } from 'react';

/**
 * Component that loads Inter font from Google Fonts CDN as a fallback
 * This ensures fonts load even if Next.js font optimization fails
 */
export function FontLoader() {
  useEffect(() => {
    // Check if font links already exist
    const existingLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    if (existingLinks.length > 0) {
      return; // Fonts already loaded
    }

    // Create and add preconnect links
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);

    // Create and add font stylesheet
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }, []);

  return null;
}

