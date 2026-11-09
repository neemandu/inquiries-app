import { Assistant, Heebo } from 'next/font/google';

// Fonts used by the mobile client-portal screens (Figma: Client Portal mobile)
export const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['200', '700'] });
export const assistant = Assistant({ subsets: ['hebrew', 'latin'], weight: ['400', '600', '700'] });
