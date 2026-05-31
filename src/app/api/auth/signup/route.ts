import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, firmName } = await req.json();

    if (!email || !password || !firmName) {
      return NextResponse.json(
        { error: 'Email, password, and firm name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check if firm already exists
    const existingFirm = await prisma.firm.findUnique({
      where: { email },
    });

    if (existingFirm) {
      return NextResponse.json(
        { error: 'A firm with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // Create Firm and User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const firm = await tx.firm.create({
        data: {
          name: firmName,
          email: email, // use creator email as firm contact email
          subscriptionPlan: 'free',
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || null,
          role: 'ADMIN',
          firmId: firm.id,
        },
      });

      return { user, firm };
    });

    const sessionPayload = {
      userId: result.user.id,
      firmId: result.firm.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
    };

    // Set cookie
    setSessionCookie(sessionPayload);

    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        firmId: result.user.firmId,
        firmName: result.firm.name,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('[SIGNUP_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
