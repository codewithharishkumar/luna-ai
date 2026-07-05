import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    if (!stripe) {
      return new NextResponse("Stripe not configured", { status: 503 });
    }

    const body = await req.text();
    const signature = req.headers.get("Stripe-Signature");

    if (!signature) {
      return new NextResponse("Missing Stripe signature", { status: 400 });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (error: any) {
      console.error("[Stripe Webhook Signature Error]", error.message);
      return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    // CHECKOUT COMPLETE
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      if (!session?.metadata?.userId) {
        return new NextResponse("User ID missing", { status: 400 });
      }

      // Retrieve the Stripe Subscription object and cast to any to safely
      // access numeric timestamp fields (Stripe SDK v22 types are a wrapper Response<>).
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      ) as any;

      // SAVE/UPDATE SUBSCRIPTION WITH UPSERT
      await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            user_id: session.metadata.userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            plan_tier: session.metadata.tier || "premium",
            status: "active",
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          },
          { onConflict: "user_id" }
        );
    }

    // SUBSCRIPTION UPDATE OR CANCELLATION
    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as any;

      // Detect tier from active Price ID
      const priceId = subscription.items.data[0]?.price?.id;
      let planTier = "free";

      if (event.type !== "customer.subscription.deleted") {
        if (
          priceId === process.env.STRIPE_BASIC_WEEKLY_PRICE_ID ||
          priceId === process.env.STRIPE_BASIC_MONTHLY_PRICE_ID ||
          priceId === "price_mock_basic_weekly" ||
          priceId === "price_mock_basic_monthly"
        ) {
          planTier = "basic";
        } else if (
          priceId === process.env.STRIPE_PREMIUM_WEEKLY_PRICE_ID ||
          priceId === process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID ||
          priceId === "price_mock_premium_weekly" ||
          priceId === "price_mock_premium_monthly"
        ) {
          planTier = "premium";
        } else if (
          priceId === process.env.STRIPE_ULTRA_PRICE_ID ||
          priceId === "price_mock_ultra"
        ) {
          planTier = "ultra";
        }
      }

      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: subscription.status,
          plan_tier: planTier,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    return new NextResponse("Webhook received", { status: 200 });
  } catch (error) {
    console.error("[Webhook Fatal Error]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
