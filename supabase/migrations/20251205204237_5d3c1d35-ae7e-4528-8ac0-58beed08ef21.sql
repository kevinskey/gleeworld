-- Add satisfaction survey and exec board candidacy fields to exit interview table
ALTER TABLE public.member_exit_interviews 
ADD COLUMN IF NOT EXISTS satisfaction_overall INTEGER CHECK (satisfaction_overall >= 1 AND satisfaction_overall <= 5),
ADD COLUMN IF NOT EXISTS satisfaction_rehearsals INTEGER CHECK (satisfaction_rehearsals >= 1 AND satisfaction_rehearsals <= 5),
ADD COLUMN IF NOT EXISTS satisfaction_performances INTEGER CHECK (satisfaction_performances >= 1 AND satisfaction_performances <= 5),
ADD COLUMN IF NOT EXISTS satisfaction_leadership INTEGER CHECK (satisfaction_leadership >= 1 AND satisfaction_leadership <= 5),
ADD COLUMN IF NOT EXISTS satisfaction_communication INTEGER CHECK (satisfaction_communication >= 1 AND satisfaction_communication <= 5),
ADD COLUMN IF NOT EXISTS satisfaction_community INTEGER CHECK (satisfaction_community >= 1 AND satisfaction_community <= 5),
ADD COLUMN IF NOT EXISTS what_worked_well TEXT,
ADD COLUMN IF NOT EXISTS what_could_improve TEXT,
ADD COLUMN IF NOT EXISTS suggestions_for_next_semester TEXT,

-- Executive Board Candidacy fields
ADD COLUMN IF NOT EXISTS interested_in_exec_board BOOLEAN,
ADD COLUMN IF NOT EXISTS exec_board_position_interest TEXT,
ADD COLUMN IF NOT EXISTS understands_leadership_program BOOLEAN,
ADD COLUMN IF NOT EXISTS current_gpa DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS willing_to_submit_purpose_statement BOOLEAN,
ADD COLUMN IF NOT EXISTS can_attend_all_sessions BOOLEAN,
ADD COLUMN IF NOT EXISTS willing_to_give_election_speech BOOLEAN,
ADD COLUMN IF NOT EXISTS leadership_program_notes TEXT;