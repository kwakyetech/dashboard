import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDraftPayrun } from '@/app/api/companies/[id]/payroll/route';

export const dynamic = 'force-dynamic';

async function handleCron(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientToken = searchParams.get('token') || req.headers.get('x-cron-token');
    const configuredToken = process.env.CRON_SECRET || 'local-cron-token-12345';

    if (clientToken !== configuredToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed month

    const companies = await prisma.company.findMany();
    const results = [];

    for (const company of companies) {
      // Check if payrun already exists
      const existingPayrun = await prisma.payrun.findUnique({
        where: {
          companyId_year_month: {
            companyId: company.id,
            year,
            month,
          },
        },
      });

      if (!existingPayrun) {
        const draft = await generateDraftPayrun(company.id, year, month);
        if (draft) {
          results.push({ companyId: company.id, companyName: company.name, status: 'GENERATED_DRAFT' });
        } else {
          results.push({ companyId: company.id, companyName: company.name, status: 'NO_EMPLOYEES' });
        }
      } else {
        results.push({ companyId: company.id, companyName: company.name, status: `EXISTS_${existingPayrun.status}` });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Automated payroll draft processing completed for ${month}/${year}.`,
      processed: results,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[CRON_PAYROLL_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
