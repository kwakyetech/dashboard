import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { comparePassword, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find User and include their Firm details
    const user = await prisma.user.findUnique({
      where: { email },
      include: { firm: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const sessionPayload = {
      userId: user.id,
      firmId: user.firmId,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    // Set cookie
    setSessionCookie(sessionPayload);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        firmId: user.firmId,
        firmName: user.firm.name,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[LOGIN_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
