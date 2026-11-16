'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useHydrated } from '@/lib/useHydrated';

// The server doesn't know the sign-in state (ClerkProvider isn't `dynamic`), so it renders
// neither SignedIn nor SignedOut. On fast devices clerk-js can resolve it before React
// hydrates, and the client would render content where the server rendered nothing →
// hydration mismatch. These render only after hydration.
export function ClientSignedIn({ children }: { children: React.ReactNode }) {
  return useHydrated() ? <SignedIn>{children}</SignedIn> : null;
}

export function ClientSignedOut({ children }: { children: React.ReactNode }) {
  return useHydrated() ? <SignedOut>{children}</SignedOut> : null;
}
