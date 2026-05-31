import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-aeroledger-jwt-signing-key-12345';
const COOKIE_NAME = 'aeroledger_session';

export interface SessionPayload {
  userId: string;
  firmId: string;
  email: string;
  role: string;
  name?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch (error) {
    return null;
  }
}

export function getSession(req?: NextRequest): SessionPayload | null {
  // If request is provided, try parsing cookie from headers
  if (req) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(^|;)\\s*${COOKIE_NAME}\\s*=\\s*([^;]+)`));
    if (match) {
      return verifyToken(decodeURIComponent(match[2]));
    }
  }

  // Otherwise, use next/headers (for API routes / Page layouts)
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      return verifyToken(token);
    }
  } catch (e) {
    // cookies() might fail if called outside of request context (e.g., build time)
  }

  return null;
}

export function setSessionCookie(payload: SessionPayload) {
  const token = signToken(payload);
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}
