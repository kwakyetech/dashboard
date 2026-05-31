import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators can manage billing for the firm
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can manage billing' }, { status: 403 });
    }

    const { plan } = await req.json();
    if (!plan || !['pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid or missing subscription plan' }, { status: 400 });
    }

    // Map plans to GHS Pesewas (1 GHS = 100 Pesewas)
    let amount = 0;
    if (plan === 'pro') {
      amount = 150 * 100; // GH₵150.00
    } else if (plan === 'enterprise') {
      amount = 390 * 100; // GH₵390.00
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret || paystackSecret === 'sk_test_placeholder_key') {
      console.error('[PAYSTACK_INIT_ERROR] Paystack Secret Key is missing or default placeholder');
      return NextResponse.json({ error: 'Billing is currently misconfigured. Please contact support.' }, { status: 500 });
    }

    // Determine the dynamic origin (either localhost or production domain)
    const origin = new URL(req.url).origin;
    const callbackUrl = `${origin}/companies`;

    console.log(`[PAYSTACK] Initializing ${plan} plan transaction for firm ${session.firmId} (${session.email})`);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.email,
        amount: amount,
        currency: 'GHS',
        callback_url: callbackUrl,
        metadata: {
          firmId: session.firmId,
          plan: plan,
        },
      }),
    });

    const responseData = await response.json();
    
    if (!response.ok || !responseData.status) {
      console.error('[PAYSTACK_INIT_FAILED] Paystack response error:', responseData);
      return NextResponse.json({ error: responseData.message || 'Failed to initialize payment gateway' }, { status: 400 });
    }

    return NextResponse.json({
      authorizationUrl: responseData.data.authorization_url,
      reference: responseData.data.reference,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[BILLING_INITIALIZE_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
