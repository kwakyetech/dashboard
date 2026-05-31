import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getMonthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });
}

// Calculate GHS progressive PAYE Income Tax
// Taxable Income = Base Salary + Allowances - SSNIT (5.5%)
function calculatePAYE(taxable: number): number {
  if (taxable <= 0) return 0;
  
  let tax = 0;
  let remaining = taxable;

  // Tier 1: First GH₵500 @ 0%
  if (remaining <= 500) return 0;
  remaining -= 500;

  // Tier 2: Next GH₵1,000 @ 5%
  if (remaining <= 1000) {
    return tax + remaining * 0.05;
  }
  tax += 1000 * 0.05; // 50
  remaining -= 1000;

  // Tier 3: Next GH₵2,500 @ 15%
  if (remaining <= 2500) {
    return tax + remaining * 0.15;
  }
  tax += 2500 * 0.15; // 375
  remaining -= 2500;

  // Tier 4: Above GH₵4,000 @ 25%
  tax += remaining * 0.25;
  return tax;
}

// Helper to generate a draft payrun for a company, year, and month
export async function generateDraftPayrun(companyId: string, year: number, month: number) {
  // Fetch all active employees
  const employees = await prisma.employee.findMany({
    where: { companyId },
  });

  if (employees.length === 0) {
    return null;
  }

  // Calculate totals & entries
  let totalBase = 0;
  let totalTax = 0;
  let totalSsnit = 0;
  let totalNet = 0;

  const computedEntries = employees.map((emp) => {
    const base = Number(emp.baseSalary);
    const allowances = Number(emp.allowances);

    // SSNIT (employee deduction = 5.5% of base)
    const ssnit = base * 0.055;

    // PAYE taxable income = base salary + allowances - employee SSNIT
    const taxable = Math.max(0, base + allowances - ssnit);
    const tax = calculatePAYE(taxable);

    // Net Pay = Gross - deductions
    const netPay = (base + allowances) - ssnit - tax;

    totalBase += base;
    totalTax += tax;
    totalSsnit += ssnit;
    totalNet += netPay;

    return {
      employeeId: emp.id,
      baseSalary: base,
      allowances,
      ssnit,
      tax,
      netPay,
    };
  });

  // Create Payrun with nested PayrunEntry records
  return await prisma.payrun.create({
    data: {
      companyId,
      year,
      month,
      status: 'DRAFT',
      totalBase,
      totalTax,
      totalSsnit,
      totalNet,
      entries: {
        create: computedEntries,
      },
    },
    include: {
      entries: {
        include: {
          employee: true,
        },
      },
    },
  });
}

// GET /api/companies/[id]/payroll?year=YYYY&month=M - Fetch payroll summary & entries (auto-generates draft if missing)
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
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month');

    if (!yearStr || !monthStr) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
    }

    let payrun = await prisma.payrun.findUnique({
      where: {
        companyId_year_month: { companyId, year, month },
      },
      include: {
        entries: {
          include: {
            employee: true,
          },
        },
      },
    });

    // Auto-generate draft payrun if it doesn't exist yet
    if (!payrun) {
      payrun = await generateDraftPayrun(companyId, year, month);
    }

    return NextResponse.json({ payrun }, { status: 200 });

  } catch (error: any) {
    console.error('[GET_PAYROLL_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/companies/[id]/payroll - Create/recalculate draft payrun
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

    const { year, month } = await req.json();

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
    }

    // Check if payroll already exists and is approved
    const existingPayrun = await prisma.payrun.findUnique({
      where: {
        companyId_year_month: { companyId, year, month },
      },
    });

    if (existingPayrun && existingPayrun.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Payroll for this month has already been approved and locked.' },
        { status: 400 }
      );
    }

    // Delete existing draft payrun (cascade deletes entries)
    if (existingPayrun) {
      await prisma.payrun.delete({
        where: { id: existingPayrun.id },
      });
    }

    const newPayrun = await generateDraftPayrun(companyId, year, month);

    if (!newPayrun) {
      return NextResponse.json(
        { error: 'No active employees found. Please register employees first.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ payrun: newPayrun }, { status: 201 });

  } catch (error: any) {
    console.error('[POST_PAYROLL_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/companies/[id]/payroll - Approve draft payrun & post transaction to ledger
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

    const { year, month } = await req.json();

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    const payrun = await prisma.payrun.findUnique({
      where: {
        companyId_year_month: { companyId, year, month },
      },
    });

    if (!payrun) {
      return NextResponse.json({ error: 'Payroll batch not found' }, { status: 404 });
    }

    if (payrun.status === 'APPROVED') {
      return NextResponse.json({ error: 'Payroll is already approved' }, { status: 400 });
    }

    const totalGross = Number(payrun.totalNet) + Number(payrun.totalTax) + Number(payrun.totalSsnit);

    const today = new Date();
    let txDate = new Date(Date.UTC(year, month, 0)); // stable last day of month in UTC
    if (year === today.getFullYear() && month === (today.getMonth() + 1)) {
      txDate = today; // date as today if it's the current month/year
    }

    // Update payrun status and post ledger transaction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedPayrun = await tx.payrun.update({
        where: { id: payrun.id },
        data: { status: 'APPROVED' },
        include: {
          entries: {
            include: {
              employee: true,
            },
          },
        },
      });

      // Post transaction to ledger
      const transaction = await tx.transaction.create({
        data: {
          companyId,
          date: txDate,
          description: `Payroll Approval - ${getMonthName(month)} ${year}`,
          amount: totalGross, // total gross salary expense
          originalAmount: totalGross,
          currency: 'GHS',
          exchangeRate: 1.0,
          type: 'expense',
          category: 'payroll',
          categoryAiGenerated: false,
          notes: `System-generated payroll expense for ${getMonthName(month)} ${year}. Net payout: GH₵${Number(payrun.totalNet).toFixed(2)}, PAYE Tax: GH₵${Number(payrun.totalTax).toFixed(2)}, SSNIT: GH₵${Number(payrun.totalSsnit).toFixed(2)}.`,
        },
      });

      return { payrun: updatedPayrun, transaction };
    });

    return NextResponse.json({ 
      success: true, 
      payrun: result.payrun, 
      transaction: result.transaction,
      message: 'Payroll approved and posted as expense to the transaction ledger.'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[APPROVE_PAYROLL_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
