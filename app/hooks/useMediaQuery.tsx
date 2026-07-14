import { useEffect, useState } from 'react';

export default function useMediaQuery(query: string) {
  const getMediaQueryList = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return null;
    }

    return window.matchMedia(query);
  };

  const getMatches = () => {
    const mediaQueryList = getMediaQueryList();

    if (!mediaQueryList) {
      return false;
    }

    return mediaQueryList.matches;
  };

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mediaQueryList = getMediaQueryList();

    if (!mediaQueryList) {
      return undefined;
    }

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);

    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
