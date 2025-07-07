-- Update Gregg's balance to reflect the payment
UPDATE finance_records 
SET balance = -800.00 
WHERE user_id = 'dc10608c-dfa7-4aa3-8206-a0361f015a21' 
  AND amount = -800.00;