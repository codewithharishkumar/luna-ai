-- Phase 2 Monetization: Billing Analytics View

CREATE OR REPLACE VIEW subscription_analytics AS
SELECT
  plan_tier,
  status,
  COUNT(*) as total_users,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
  SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) as canceled_users,
  SUM(CASE WHEN status = 'past_due' THEN 1 ELSE 0 END) as past_due_users,
  ROUND(AVG(trial_message_count)::numeric, 1) as avg_trial_messages,
  ROUND(AVG(trial_voice_seconds)::numeric, 1) as avg_trial_voice_seconds
FROM public.subscriptions
GROUP BY plan_tier, status;
