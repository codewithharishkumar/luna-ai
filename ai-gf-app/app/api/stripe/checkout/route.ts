import { NextResponse } from "next/server";
import { stripe, getStripePriceId } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    // Get user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Request parameters
    const body = await req.json();
    const tier = body.tier || "premium"; // 'basic' | 'premium'
    const interval = body.interval || "weekly"; // 'weekly' | 'monthly'

    const priceId = getStripePriceId(tier as "basic" | "premium", interval as "weekly" | "monthly");

    if (!priceId) {
      return NextResponse.json({ error: "Invalid price configuration for tier and interval." }, { status: 400 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/profile?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/profile?canceled=true`,
      metadata: {
        userId: user.id,
        tier,
        interval,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[Stripe Checkout Error]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
