-- Delete all Syracuse International Jazz Festival contracts and related data

-- First delete related records in dependent tables
DELETE FROM contract_recipients_v2 WHERE contract_id IN (
  SELECT id FROM contracts_v2 WHERE title ILIKE '%syracuse%'
);

DELETE FROM contract_signatures_v2 WHERE contract_id IN (
  SELECT id FROM contracts_v2 WHERE title ILIKE '%syracuse%'
);

DELETE FROM admin_contract_notifications WHERE contract_id IN (
  SELECT id FROM contracts_v2 WHERE title ILIKE '%syracuse%'
);

-- Now delete the contracts themselves
DELETE FROM contracts_v2 WHERE title ILIKE '%syracuse%';