import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe Client with secret key or build fallback validation key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_51DummyKeyForBuildValidation";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-01-27" as any,
});

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: "Missing required parameter: projectId" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://flyertocalendar.vercel.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: 'FlyerToCalendar - Single Event Pass' },
          unit_amount: 2900,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${appUrl}/dashboard?status=success&project_id=${projectId}`,
      cancel_url: `${appUrl}/dashboard`,
      metadata: {
        projectId,
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Stripe checkout session initiation failed." }, { status: 500 });
  }
}
