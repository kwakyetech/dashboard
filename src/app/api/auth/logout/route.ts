import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  try {
    clearSessionCookie();
    return NextResponse.json({ success: true, message: 'Logged out successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('[LOGOUT_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
