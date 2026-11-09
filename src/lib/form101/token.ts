import 'server-only';
import crypto from 'crypto';
import { Form101Employer } from '@/lib/form101/schema';

// Personal Form 101 links: the payload is signed with FORM101_LINK_SECRET, so the employee can't
// change the employer details or extend the link, and the server needs no storage to verify it.
export interface Form101LinkPayload {
  employer: Form101Employer;
  taxYear: number;
  exp: number; // seconds since epoch
  jti: string;
}

const LINK_TTL_DAYS = 14;

function secret() {
  const value = process.env.FORM101_LINK_SECRET;
  if (!value || value.length < 32) {
    throw new Error('FORM101_LINK_SECRET must be set to at least 32 characters');
  }
  return value;
}

const sign = (data: string) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

export function createForm101Token(employer: Form101Employer, taxYear: number) {
  const payload: Form101LinkPayload = {
    employer,
    taxYear,
    exp: Math.floor(Date.now() / 1000) + LINK_TTL_DAYS * 24 * 60 * 60,
    jti: crypto.randomUUID(),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { token: `${data}.${sign(data)}`, payload };
}

// Returns the payload, or null when the token is malformed, tampered with or expired
export function verifyForm101Token(token: string | null | undefined): Form101LinkPayload | null {
  if (!token) return null;
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as Form101LinkPayload;
    return payload.exp * 1000 > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
