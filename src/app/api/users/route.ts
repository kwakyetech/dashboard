import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/users - List all users in the firm (ADMIN only)
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can manage/view staff and clients list
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { firmId: session.firmId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companies: {
          select: {
            id: true,
            name: true,
          }
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users }, { status: 200 });

  } catch (error: any) {
    console.error('[GET_USERS_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user (Accountant or Client) under the firm (ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can create new users
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, password, name, role, companyIds } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      );
    }

    if (role !== 'ACCOUNTANT' && role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Invalid role. Must be either ACCOUNTANT or CLIENT' },
        { status: 400 }
      );
    }

    if (role === 'CLIENT' && (!companyIds || companyIds.length === 0)) {
      return NextResponse.json(
        { error: 'Client users must be connected to at least one client company' },
        { status: 400 }
      );
    }

    // Check if email already in use
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role,
        firmId: session.firmId,
        companies: role === 'CLIENT' && companyIds ? {
          connect: companyIds.map((id: string) => ({ id }))
        } : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companies: {
          select: { id: true, name: true }
        },
        createdAt: true,
      }
    });

    return NextResponse.json({ user }, { status: 201 });

  } catch (error: any) {
    console.error('[CREATE_USER_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete a user (ADMIN only, cannot delete self)
export async function DELETE(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can delete users
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userId === session.userId) {
      return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 });
    }

    // Verify user belongs to same firm
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.firmId !== session.firmId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[DELETE_USER_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
