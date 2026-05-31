import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/companies/[id]/employees - Get all employees of a company
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

    const employees = await prisma.employee.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ employees }, { status: 200 });

  } catch (error: any) {
    console.error('[GET_EMPLOYEES_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/companies/[id]/employees - Add a new employee
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

    const { name, role, baseSalary, allowances, ssnitNo, tin } = await req.json();

    if (!name || !role || baseSalary === undefined) {
      return NextResponse.json(
        { error: 'Name, role, and base salary are required' },
        { status: 400 }
      );
    }

    const salaryNum = parseFloat(baseSalary);
    const allowancesNum = allowances !== undefined ? parseFloat(allowances) : 0;

    if (isNaN(salaryNum) || salaryNum < 0 || isNaN(allowancesNum) || allowancesNum < 0) {
      return NextResponse.json({ error: 'Salary and allowances must be positive numbers' }, { status: 400 });
    }

    const newEmployee = await prisma.employee.create({
      data: {
        companyId,
        name: name.trim(),
        role: role.trim(),
        baseSalary: salaryNum,
        allowances: allowancesNum,
        ssnitNo: ssnitNo ? ssnitNo.trim() : null,
        tin: tin ? tin.trim() : null,
      },
    });

    return NextResponse.json({ employee: newEmployee }, { status: 201 });

  } catch (error: any) {
    console.error('[POST_EMPLOYEE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/companies/[id]/employees - Delete an employee
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
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await prisma.employee.delete({
      where: { id: employeeId },
    });

    return NextResponse.json({ success: true, message: 'Employee removed successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[DELETE_EMPLOYEE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/companies/[id]/employees - Update employee details
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

    const { employeeId, name, role, baseSalary, allowances, ssnitNo, tin } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (!name || !role || baseSalary === undefined) {
      return NextResponse.json(
        { error: 'Name, role, and base salary are required' },
        { status: 400 }
      );
    }

    const salaryNum = parseFloat(baseSalary);
    const allowancesNum = allowances !== undefined ? parseFloat(allowances) : 0;

    if (isNaN(salaryNum) || salaryNum < 0 || isNaN(allowancesNum) || allowancesNum < 0) {
      return NextResponse.json({ error: 'Salary and allowances must be positive numbers' }, { status: 400 });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        name: name.trim(),
        role: role.trim(),
        baseSalary: salaryNum,
        allowances: allowancesNum,
        ssnitNo: ssnitNo ? ssnitNo.trim() : null,
        tin: tin ? tin.trim() : null,
      },
    });

    return NextResponse.json({ employee: updatedEmployee }, { status: 200 });

  } catch (error: any) {
    console.error('[PATCH_EMPLOYEE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
