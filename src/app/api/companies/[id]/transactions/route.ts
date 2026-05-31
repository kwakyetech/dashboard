import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/companies/[id]/transactions - Fetch and filter transactions
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

    // Parse query params
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type'); // "income" or "expense"
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Build Prisma query filters
    const where: any = {
      companyId,
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (type && type !== 'all') {
      where.type = type;
    }

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

    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({ transactions }, { status: 200 });

  } catch (error: any) {
    console.error('[GET_TRANSACTIONS_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/companies/[id]/transactions - Manually create a single transaction
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

    const { date, description, amount, type, category, notes, currency, originalAmount, exchangeRate } = await req.json();

    if (!date || !description || amount === undefined || !type || !category) {
      return NextResponse.json(
        { error: 'Date, description, amount, type, and category are required' },
        { status: 400 }
      );
    }

    const parsedAmount = Math.abs(parseFloat(amount));
    if (isNaN(parsedAmount)) {
      return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
    }

    const txCurrency = currency || company.currency || 'GHS';
    const txOriginalAmount = originalAmount !== undefined ? Math.abs(parseFloat(originalAmount)) : parsedAmount;
    const txExchangeRate = exchangeRate !== undefined ? parseFloat(exchangeRate) : 1.0;

    const newTransaction = await prisma.transaction.create({
      data: {
        companyId,
        date: new Date(date),
        description: description.trim(),
        amount: parsedAmount,
        originalAmount: txOriginalAmount,
        currency: txCurrency,
        exchangeRate: txExchangeRate,
        type, // "income" or "expense"
        category,
        categoryAiGenerated: false, // manual transaction, not AI generated
        notes: notes ? notes.trim() : null,
      },
    });



    return NextResponse.json({ transaction: newTransaction }, { status: 201 });

  } catch (error: any) {
    console.error('[POST_TRANSACTION_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH /api/companies/[id]/transactions - Edit a transaction (e.g. manual category override)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

    const { transactionId, category, notes } = await req.json();

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Verify transaction belongs to this company
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx || tx.companyId !== companyId) {
      return NextResponse.json({ error: 'Transaction not found for this company' }, { status: 404 });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        category: category || undefined,
        categoryAiGenerated: category ? false : undefined, // Mark as manual override if category is changed
        notes: notes !== undefined ? notes : undefined,
      },
    });



    return NextResponse.json({ transaction: updatedTransaction }, { status: 200 });

  } catch (error: any) {
    console.error('[PATCH_TRANSACTION_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[id]/transactions - Delete a transaction manually
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Verify transaction belongs to this company
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx || tx.companyId !== companyId) {
      return NextResponse.json({ error: 'Transaction not found for this company' }, { status: 404 });
    }

    // Delete transaction
    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[DELETE_TRANSACTION_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

