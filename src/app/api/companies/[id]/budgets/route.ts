import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/companies/[id]/budgets - Get budgets and actual expenses for a given month/year
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: companyId } = params;

    // Verify company belongs to user's firm
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || company.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1)); // 1-indexed

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
    }

    // 1. Fetch all budgets defined for this month
    const budgets = await prisma.budget.findMany({
      where: {
        companyId,
        year,
        month,
      },
    });

    // 2. Fetch expenses for this month to compute variance
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        companyId,
        type: 'expense',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        category: true,
        amount: true,
      },
    });

    // Aggregate spent amount per category
    const spentMap: Record<string, number> = {};
    transactions.forEach((tx) => {
      const amt = parseFloat(tx.amount.toString());
      spentMap[tx.category] = (spentMap[tx.category] || 0) + amt;
    });

    return NextResponse.json({
      year,
      month,
      budgets: budgets.map((b) => ({
        id: b.id,
        category: b.category,
        amount: parseFloat(b.amount.toString()),
        spent: spentMap[b.category] || 0,
      })),
      allSpent: spentMap, // return raw spent map for categories that don't have budgets defined yet
    }, { status: 200 });

  } catch (error: any) {
    console.error('[GET_BUDGETS_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/companies/[id]/budgets - Create or update a budget limit
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: companyId } = params;

    // Verify company belongs to user's firm
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || company.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { category, amount, year, month } = await req.json();

    if (!category || amount === undefined || !year || !month) {
      return NextResponse.json(
        { error: 'Category, amount, year, and month are required' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ error: 'Invalid budget amount' }, { status: 400 });
    }

    // Upsert budget limit
    const budget = await prisma.budget.upsert({
      where: {
        companyId_category_year_month: {
          companyId,
          category,
          year: parseInt(year),
          month: parseInt(month),
        },
      },
      update: {
        amount: parsedAmount,
      },
      create: {
        companyId,
        category,
        amount: parsedAmount,
        year: parseInt(year),
        month: parseInt(month),
      },
    });

    return NextResponse.json({ budget }, { status: 200 });

  } catch (error: any) {
    console.error('[POST_BUDGET_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
