import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/companies - List all companies belonging to the firm
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const whereClause: any = {
      firmId: session.firmId,
    };

    if (session.role === 'CLIENT') {
      whereClause.users = {
        some: { id: session.userId }
      };
    }

    const companies = await prisma.company.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ companies }, { status: 200 });
  } catch (error: any) {
    console.error('[GET_COMPANIES_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create a new company for the firm
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, taxId, currency } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: {
        name,
        taxId: taxId || null,
        currency: currency || 'GHS',
        firmId: session.firmId,
        // Also connect the creator user to the company via UserCompanies relation
        users: {
          connect: { id: session.userId }
        }
      },
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (error: any) {
    console.error('[POST_COMPANIES_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
