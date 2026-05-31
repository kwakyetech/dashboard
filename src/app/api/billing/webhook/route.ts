import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-paystack-signature');
    if (!signature) {
      console.warn('[PAYSTACK_WEBHOOK_WARNING] Missing signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret || paystackSecret === 'sk_test_placeholder_key') {
      console.error('[PAYSTACK_WEBHOOK_ERROR] Paystack secret key is not configured');
      return NextResponse.json({ error: 'Internal configuration error' }, { status: 500 });
    }

    // Get raw body as text for verification
    const rawBody = await req.text();

    // Compute expected signature
    const hash = crypto
      .createHmac('sha512', paystackSecret)
      .update(rawBody)
      .digest('hex');

    // Verify signature matches
    if (hash !== signature) {
      console.warn('[PAYSTACK_WEBHOOK_WARNING] Signature mismatch. Calculated:', hash, 'Received:', signature);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse verified payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    
    console.log(`[PAYSTACK_WEBHOOK] Received event: ${event}`);

    // Process successful payment charge
    if (event === 'charge.success') {
      const data = payload.data;
      const metadata = data.metadata;
      
      if (!metadata || !metadata.firmId || !metadata.plan) {
        console.error('[PAYSTACK_WEBHOOK_ERROR] Missing firmId or plan metadata in successful charge:', data.reference);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      const { firmId, plan } = metadata;
      
      console.log(`[PAYSTACK_WEBHOOK] Updating firm ${firmId} subscription to plan: ${plan}`);

      // Set subscription expiry date 30 days from now
      const subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Perform update in database
      await prisma.firm.update({
        where: { id: firmId },
        data: {
          subscriptionPlan: plan,
          subscriptionExpiresAt: subscriptionExpiresAt,
        },
      });

      console.log(`[PAYSTACK_WEBHOOK] Successfully updated firm ${firmId} subscription`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('[PAYSTACK_WEBHOOK_ERROR] Webhook processing failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
