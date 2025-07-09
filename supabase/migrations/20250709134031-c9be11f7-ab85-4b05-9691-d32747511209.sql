-- Fix the user_dashboard_data view to only show contracts relevant to the specific user
DROP VIEW IF EXISTS user_dashboard_data;

CREATE VIEW user_dashboard_data AS
SELECT 
    p.id AS user_id,
    p.email,
    p.full_name,
    -- Count contracts where user is creator OR recipient
    (
        SELECT count(DISTINCT c.id)
        FROM contracts_v2 c
        LEFT JOIN contract_recipients_v2 cr ON c.id = cr.contract_id
        WHERE c.created_by = p.id 
           OR cr.recipient_email = p.email
    ) AS total_contracts,
    -- Count signed contracts where user is creator OR recipient
    (
        SELECT count(DISTINCT c.id)
        FROM contracts_v2 c
        LEFT JOIN contract_signatures_v2 cs ON c.id = cs.contract_id
        LEFT JOIN contract_recipients_v2 cr ON c.id = cr.contract_id
        WHERE (c.created_by = p.id OR cr.recipient_email = p.email)
           AND cs.status = 'completed'
    ) AS signed_contracts,
    -- Count user's W9 forms
    (
        SELECT count(*)
        FROM w9_forms
        WHERE w9_forms.user_id = p.id
    ) AS w9_forms_count,
    -- Count user's payments
    (
        SELECT count(*)
        FROM user_payments
        WHERE user_payments.user_id = p.id
    ) AS payments_received,
    -- Sum user's payment amounts
    (
        SELECT COALESCE(sum(user_payments.amount), 0)
        FROM user_payments
        WHERE user_payments.user_id = p.id
    ) AS total_amount_received,
    -- Count unread notifications
    (
        SELECT count(*)
        FROM user_notifications
        WHERE user_notifications.user_id = p.id 
           AND user_notifications.is_read = false
    ) AS unread_notifications
FROM profiles p;