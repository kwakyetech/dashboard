import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);

    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Refresh user data from database to ensure it still exists and gets current details
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { firm: true },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        firmId: user.firmId,
        firmName: user.firm.name,
        subscriptionPlan: user.firm.subscriptionPlan,
        subscriptionExpiresAt: user.firm.subscriptionExpiresAt ? user.firm.subscriptionExpiresAt.toISOString() : null,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[SESSION_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
