-- Fix the user_dashboard_data view to correctly calculate unread notifications
DROP VIEW IF EXISTS user_dashboard_data;

CREATE OR REPLACE VIEW user_dashboard_data AS
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  COALESCE(contract_stats.total_contracts, 0) as total_contracts,
  COALESCE(contract_stats.signed_contracts, 0) as signed_contracts,
  COALESCE(w9_stats.w9_forms_count, 0) as w9_forms_count,
  COALESCE(payment_stats.payments_received, 0) as payments_received,
  COALESCE(payment_stats.total_amount_received, 0) as total_amount_received,
  COALESCE(notification_stats.unread_notifications, 0) as unread_notifications
FROM gw_profiles p
LEFT JOIN (
  SELECT 
    created_by as user_id,
    COUNT(*) as total_contracts,
    COUNT(CASE WHEN status IN ('signed', 'completed') THEN 1 END) as signed_contracts
  FROM contracts_v2 
  GROUP BY created_by
) contract_stats ON p.user_id = contract_stats.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as w9_forms_count
  FROM w9_forms 
  GROUP BY user_id
) w9_stats ON p.user_id = w9_stats.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as payments_received,
    COALESCE(SUM(amount), 0) as total_amount_received
  FROM user_payments 
  GROUP BY user_id
) payment_stats ON p.user_id = payment_stats.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as unread_notifications
  FROM gw_notifications 
  WHERE is_read = false AND (expires_at IS NULL OR expires_at > now())
  GROUP BY user_id
) notification_stats ON p.user_id = notification_stats.user_id;