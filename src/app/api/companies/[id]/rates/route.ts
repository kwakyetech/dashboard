import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/companies/[id]/rates?from=XXX - Fetch online exchange rate to company base currency
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
    const fromCurrency = (searchParams.get('from') || 'GHS').toUpperCase();
    const baseCurrency = (company.currency || 'GHS').toUpperCase();

    if (fromCurrency === baseCurrency) {
      return NextResponse.json({ rate: 1.0 }, { status: 200 });
    }

    // Fetch live rates from a keyless free public exchange rates API
    const response = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`, {
      next: { revalidate: 3600 } // cache rate for 1 hour
    });

    if (!response.ok) {
      throw new Error('Failed to fetch online exchange rates');
    }

    const data = await response.json();
    const rate = data.rates[baseCurrency];

    if (rate === undefined) {
      return NextResponse.json({ error: `Currency ${baseCurrency} not supported by rates provider` }, { status: 400 });
    }

    return NextResponse.json({ rate }, { status: 200 });

  } catch (error: any) {
    console.error('[GET_EXCHANGE_RATES_ERROR]', error);
    // Fallback: simple static rates if API is down
    const staticRates: Record<string, Record<string, number>> = {
      EUR: { USD: 1.08, GBP: 0.85, EUR: 1.0, GHS: 15.0 },
      GBP: { USD: 1.27, EUR: 1.17, GBP: 1.0, GHS: 18.0 },
      USD: { EUR: 0.92, GBP: 0.79, USD: 1.0, GHS: 14.0 },
      JPY: { USD: 0.0064, EUR: 0.0059, JPY: 1.0, GHS: 0.09 },
      CAD: { USD: 0.73, EUR: 0.68, CAD: 1.0, GHS: 10.0 },
      AUD: { USD: 0.66, EUR: 0.61, AUD: 1.0, GHS: 9.0 },
      GHS: { USD: 0.071, EUR: 0.067, GBP: 0.056, GHS: 1.0 },
    };

    const fromCurrency = new URL(req.url).searchParams.get('from')?.toUpperCase() || 'GHS';
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const baseCurrency = (company?.currency || 'GHS').toUpperCase();

    const rate = staticRates[fromCurrency]?.[baseCurrency] || 1.0;
    return NextResponse.json({ rate, isFallback: true }, { status: 200 });
  }
}
