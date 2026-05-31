import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, hashPassword, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, password, firmName } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if email already in use by another user
    if (email.toLowerCase() !== session.email.toLowerCase()) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {
      name: name || null,
      email: email.toLowerCase(),
    };

    if (password && password.trim() !== '') {
      updateData.password = await hashPassword(password);
    }

    // Update user
    const updatedUser = await prisma.$transaction(async (tx) => {
      // If firmName is provided and user is ADMIN, update Firm name
      if (firmName && firmName.trim() !== '' && session.role === 'ADMIN') {
        await tx.firm.update({
          where: { id: session.firmId },
          data: { name: firmName },
        });
      }

      return await tx.user.update({
        where: { id: session.userId },
        data: updateData,
        include: { firm: true },
      });
    });

    const sessionPayload = {
      userId: updatedUser.id,
      firmId: updatedUser.firmId,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name,
    };

    // Refresh current cookie
    setSessionCookie(sessionPayload);

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        firmId: updatedUser.firmId,
        firmName: updatedUser.firm.name,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[PROFILE_UPDATE_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
