-- Create finance record for Greg's existing payment
INSERT INTO finance_records (
  user_id,
  date,
  type,
  category,
  description,
  amount,
  balance,
  reference,
  notes
)
SELECT 
  up.user_id,
  up.payment_date,
  'payment',
  'Payment',
  CONCAT('Payment received via ', up.payment_method),
  -up.amount, -- Negative because it's money going out to the user
  0, -- Will be recalculated by sync function
  CONCAT('Payment ID: ', up.id),
  COALESCE(up.notes, 'Payment processed through admin panel')
FROM user_payments up
WHERE up.user_id = 'dc10608c-dfa7-4aa3-8206-a0361f015a21'
  AND NOT EXISTS (
    SELECT 1 FROM finance_records fr 
    WHERE fr.user_id = up.user_id 
    AND fr.reference = CONCAT('Payment ID: ', up.id)
  );