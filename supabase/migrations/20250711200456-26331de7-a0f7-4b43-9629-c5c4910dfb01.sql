-- Create finance records for existing payments that don't have them
INSERT INTO finance_records (
  user_id,
  date,
  type,
  category,
  description,
  amount,
  balance,
  reference,
  notes,
  created_at,
  updated_at
)
SELECT 
  p.user_id,
  p.payment_date::date,
  'payment',
  'Payment',
  'Payment received via ' || p.payment_method,
  -p.amount, -- Negative because it's money going out to the user
  0, -- Will be recalculated by sync function
  'Payment ID: ' || p.id,
  COALESCE(p.notes, 'Payment processed through admin panel - backfilled'),
  p.created_at,
  p.created_at
FROM user_payments p
LEFT JOIN finance_records fr ON fr.reference LIKE '%Payment ID: ' || p.id || '%'
WHERE fr.id IS NULL;