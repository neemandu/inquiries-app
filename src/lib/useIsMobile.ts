import { useSyncExternalStore } from 'react';

// Matches Tailwind's `md` breakpoint: below 768px the mobile layout is used
const QUERY = '(max-width: 767px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
