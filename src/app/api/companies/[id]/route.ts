import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/companies/[id] - Get details of a single company
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify company belongs to user's firm
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company || company.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Client role scope validation
    if (session.role === 'CLIENT') {
      const isAssigned = await prisma.company.findFirst({
        where: {
          id,
          users: { some: { id: session.userId } }
        }
      });
      if (!isAssigned) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ company }, { status: 200 });
  } catch (error: any) {
    console.error('[GET_COMPANY_BY_ID_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[id] - Delete a company and all related data (cascade)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Verify company belongs to user's firm
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company || company.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Perform cascade delete inside a transaction to prevent database foreign key constraint errors
    await prisma.$transaction([
      prisma.transaction.deleteMany({
        where: { companyId: id },
      }),
      prisma.report.deleteMany({
        where: { companyId: id },
      }),
      prisma.budget.deleteMany({
        where: { companyId: id },
      }),
      prisma.employee.deleteMany({
        where: { companyId: id },
      }),
      prisma.payrun.deleteMany({
        where: { companyId: id },
      }),
      prisma.company.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Company deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('[DELETE_COMPANY_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH /api/companies/[id] - Update company settings (e.g. name, taxId, base currency)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Verify company belongs to user's firm
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company || company.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { name, taxId, currency } = await req.json();

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        name: name || undefined,
        taxId: taxId !== undefined ? taxId : undefined,
        currency: currency || undefined,
      },
    });

    return NextResponse.json({ company: updatedCompany }, { status: 200 });
  } catch (error: any) {
    console.error('[PATCH_COMPANY_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
