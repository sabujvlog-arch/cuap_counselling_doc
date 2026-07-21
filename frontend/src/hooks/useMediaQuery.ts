'use client';

import { useState, useEffect } from 'react';

/**
 * useMediaQuery hook to dynamically track CSS media query matching state.
 * E.g., const isMobile = useMediaQuery('(max-width: 767px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    media.addEventListener('change', listener);
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [matches, query]);

  return matches;
}
