import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generateFinancialReport } from '@/lib/claude';

// GET /api/companies/[id]/reports - List all generated reports for a company
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

    const reports = await prisma.report.findMany({
      where: { companyId },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        generatedAt: true,
        summary: true, // Only fetch summary for lists, exclude heavy content if needed, or fetch all.
      }
    });

    return NextResponse.json({ reports }, { status: 200 });

  } catch (error: any) {
    console.error('[GET_REPORTS_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/companies/[id]/reports - Generate a new report using Claude
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

    const { type, startDate, endDate } = await req.json();

    if (!type || !startDate || !endDate) {
      return NextResponse.json({ error: 'Type, startDate, and endDate are required' }, { status: 400 });
    }

    const startDateTime = new Date(startDate);
    startDateTime.setUTCHours(0, 0, 0, 0);

    const endDateTime = new Date(endDate);
    endDateTime.setUTCHours(23, 59, 59, 999);

    let aggregatedData: any = {};

    if (type === 'balance_sheet') {
      // Balance Sheet requires historical transactions up to the end date
      const transactions = await prisma.transaction.findMany({
        where: {
          companyId,
          date: { lte: endDateTime },
        },
      });

      if (transactions.length === 0) {
        return NextResponse.json({ 
          error: 'No historical transactions found up to the specified end date. Please upload transactions first.' 
        }, { status: 400 });
      }

      let cumulativeIncome = 0;
      let cumulativeExpense = 0;
      let cumulativeEquipment = 0;

      transactions.forEach((t) => {
        const amount = Number(t.amount);
        if (t.type === 'income') {
          cumulativeIncome += amount;
        } else {
          cumulativeExpense += amount;
          if (t.category === 'equipment') {
            cumulativeEquipment += amount;
          }
        }
      });

      const retainedEarnings = cumulativeIncome - cumulativeExpense;
      const accountsReceivable = cumulativeIncome * 0.10;
      const accountsPayable = cumulativeExpense * 0.05;
      const creditCard = cumulativeExpense * 0.02;
      const paidInCapital = 50000;

      // Cash = PaidInCapital + RetainedEarnings + AP + CreditCard - Equipment - AR
      const cash = paidInCapital + retainedEarnings + accountsPayable + creditCard - cumulativeEquipment - accountsReceivable;

      aggregatedData = {
        asOfDate: endDate,
        assets: {
          cash,
          accountsReceivable,
          equipment: cumulativeEquipment,
          totalAssets: cash + accountsReceivable + cumulativeEquipment
        },
        liabilities: {
          accountsPayable,
          creditCard,
          totalLiabilities: accountsPayable + creditCard
        },
        equity: {
          paidInCapital,
          retainedEarnings,
          totalEquity: paidInCapital + retainedEarnings
        }
      };
    } else if (type === 'cash_flow') {
      // Cash Flow requires transactions in the period
      const periodTransactions = await prisma.transaction.findMany({
        where: {
          companyId,
          date: {
            gte: startDateTime,
            lte: endDateTime,
          },
        },
      });

      // Also historical transactions before start date to compute beginning cash
      const priorTransactions = await prisma.transaction.findMany({
        where: {
          companyId,
          date: { lt: startDateTime },
        },
      });

      // Compute beginning cash
      let priorIncome = 0;
      let priorExpense = 0;
      let priorEquipment = 0;

      priorTransactions.forEach((t) => {
        const amount = Number(t.amount);
        if (t.type === 'income') {
          priorIncome += amount;
        } else {
          priorExpense += amount;
          if (t.category === 'equipment') {
            priorEquipment += amount;
          }
        }
      });

      const priorRetained = priorIncome - priorExpense;
      const priorAR = priorIncome * 0.10;
      const priorAP = priorExpense * 0.05;
      const priorCC = priorExpense * 0.02;
      const beginningCash = 50000 + priorRetained + priorAP + priorCC - priorEquipment - priorAR;

      // Compute period flows
      let receipts = 0;
      let payments = 0;
      let equipmentSpend = 0;
      let transfers = 0;

      periodTransactions.forEach((t) => {
        const amount = Number(t.amount);
        if (t.type === 'income') {
          receipts += amount;
        } else if (t.type === 'expense') {
          if (t.category === 'equipment') {
            equipmentSpend += amount;
          } else {
            payments += amount;
          }
        } else if (t.type === 'transfer') {
          // treat transfers as financing inflow/outflows
          transfers += amount;
        }
      });

      const netOperating = receipts - payments;
      const netInvesting = -equipmentSpend;
      const netFinancing = transfers;
      const netChange = netOperating + netInvesting + netFinancing;
      const endingCash = beginningCash + netChange;

      aggregatedData = {
        periodStart: startDate,
        periodEnd: endDate,
        operating: {
          receipts,
          payments: -payments, // represent payments as negative Outflow
          netOperating
        },
        investing: {
          equipment: -equipmentSpend,
          netInvesting
        },
        financing: {
          transfers,
          netFinancing
        },
        totals: {
          beginningCash,
          netChange,
          endingCash
        }
      };
    } else {
      // Default: Income Statement
      const transactions = await prisma.transaction.findMany({
        where: {
          companyId,
          date: {
            gte: startDateTime,
            lte: endDateTime,
          },
        },
      });

      if (transactions.length === 0) {
        return NextResponse.json({ 
          error: 'No transactions found in the specified date range. Please upload transactions before generating a report.' 
        }, { status: 400 });
      }

      const incomeAgg: Record<string, number> = {};
      const expenseAgg: Record<string, number> = {};

      transactions.forEach((t) => {
        const amount = Number(t.amount);
        if (t.type === 'income') {
          incomeAgg[t.category] = (incomeAgg[t.category] || 0) + amount;
        } else {
          expenseAgg[t.category] = (expenseAgg[t.category] || 0) + amount;
        }
      });

      aggregatedData = {
        periodStart: startDate,
        periodEnd: endDate,
        income: incomeAgg,
        expenses: expenseAgg,
      };
    }

    // Call Claude Sonnet API to synthesize financial structure, narrative, and insights
    const aiReport = await generateFinancialReport(
      company.name,
      startDate,
      endDate,
      type,
      aggregatedData
    );

    // Store in DB
    const report = await prisma.report.create({
      data: {
        companyId,
        type,
        startDate: startDateTime,
        endDate: endDateTime,
        summary: aiReport.summary,
        content: JSON.stringify({
          statement: aiReport.statement,
          insights: aiReport.insights,
        }),
      },
    });

    const parsedReport = {
      ...report,
      content: JSON.parse(report.content),
    };

    return NextResponse.json({ report: parsedReport }, { status: 201 });


  } catch (error: any) {
    console.error('[GENERATE_REPORT_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
