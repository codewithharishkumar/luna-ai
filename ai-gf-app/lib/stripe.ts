import Stripe from "stripe";

// Initialize gracefully so the app doesn't crash if keys are missing
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" as any }) 
  : null;

export const getStripePriceId = (tier: "basic" | "premium", interval: "weekly" | "monthly") => {
  if (tier === "basic") {
    return interval === "weekly"
      ? process.env.STRIPE_BASIC_WEEKLY_PRICE_ID || "price_mock_basic_weekly"
      : process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || "price_mock_basic_monthly";
  }
  if (tier === "premium") {
    return interval === "weekly"
      ? process.env.STRIPE_PREMIUM_WEEKLY_PRICE_ID || "price_mock_premium_weekly"
      : process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_mock_premium_monthly";
  }
  return "";
};
