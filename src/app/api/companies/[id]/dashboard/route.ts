import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: companyId } = params;

    // Verify company ownership
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || company.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Parse query params for date filtering
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const where: any = {
      companyId,
    };

    if (startDateStr || endDateStr) {
      where.date = {};
      if (startDateStr) {
        const start = new Date(startDateStr);
        start.setUTCHours(0, 0, 0, 0);
        where.date.gte = start;
      }
      if (endDateStr) {
        const end = new Date(endDateStr);
        end.setUTCHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // Fetch all filtered transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Compute key metrics
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryTotals: Record<string, number> = {};
    const monthlyDataMap: Record<string, { month: string; income: number; expense: number }> = {};

    transactions.forEach((tx) => {
      const amount = Number(tx.amount);
      const date = new Date(tx.date);
      // Format month key as e.g., "2026-05" or "May 26"
      const monthKey = date.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });

      // Initialize monthly bucket if it doesn't exist
      if (!monthlyDataMap[monthKey]) {
        monthlyDataMap[monthKey] = {
          month: monthKey,
          income: 0,
          expense: 0,
        };
      }

      if (tx.type === 'income') {
        totalIncome += amount;
        monthlyDataMap[monthKey].income += amount;
      } else if (tx.type === 'expense') {
        totalExpenses += amount;
        monthlyDataMap[monthKey].expense += amount;

        // Track expense categories
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
      }
    });

    const netProfit = totalIncome - totalExpenses;

    // Format expense categories for Recharts pie chart
    const expenseBreakdown = Object.keys(categoryTotals).map((cat) => ({
      name: cat,
      value: Number(categoryTotals[cat].toFixed(2)),
    })).sort((a, b) => b.value - a.value);

    // Format monthly trends for Recharts line/bar chart
    // We sort the months by actual date
    const monthlyTrends = Object.values(monthlyDataMap);

    return NextResponse.json({
      summary: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
      },
      expenseBreakdown,
      monthlyTrends,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[GET_DASHBOARD_METRICS_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
