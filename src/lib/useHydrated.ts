import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// False on the server and during hydration, true afterwards. Use it to gate values that
// can already be known on the client before React hydrates (e.g. Clerk's isLoaded/user),
// so the first client render matches the server HTML.
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
