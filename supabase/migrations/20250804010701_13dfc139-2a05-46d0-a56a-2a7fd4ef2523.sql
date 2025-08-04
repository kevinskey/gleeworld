-- Add PR Manager position to executive_position enum
ALTER TYPE executive_position ADD VALUE 'pr_manager';

-- Add Ava Challenger as PR Manager to the executive board
INSERT INTO gw_executive_board_members (
  user_id,
  position,
  is_active,
  start_date
) VALUES (
  '5d2e4026-1d6d-4ecd-a71e-934b9f486979', -- Ava Challenger's user_id
  'pr_manager',
  true,
  CURRENT_DATE
);