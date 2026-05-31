import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; reportId: string } }
) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: companyId, reportId } = params;

    // Verify company ownership
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || company.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report || report.companyId !== companyId) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const parsedReport = {
      ...report,
      content: JSON.parse(report.content),
    };

    return NextResponse.json({ report: parsedReport }, { status: 200 });

  } catch (error: any) {
    console.error('[GET_SINGLE_REPORT_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
