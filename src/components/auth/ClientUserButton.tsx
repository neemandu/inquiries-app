'use client';

import { useSyncExternalStore, type ComponentProps } from 'react';
import { UserButton } from '@clerk/nextjs';

const subscribe = () => () => {};

// Clerk's UserButton renders nothing until clerk-js has loaded, which is always
// the case on the server. On slow connections clerk-js can finish loading before
// React hydrates the page, so the client renders the button's <div> where the
// server rendered nothing → hydration mismatch. Render it only after hydration.
export default function ClientUserButton(props: ComponentProps<typeof UserButton>) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated ? <UserButton {...props} /> : null;
}
