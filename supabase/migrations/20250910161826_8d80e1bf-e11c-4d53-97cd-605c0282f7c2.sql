-- First, let's add a project_role column to the mus240_group_memberships table
ALTER TABLE mus240_group_memberships 
ADD COLUMN project_role text;

-- Set up an enum for project roles
CREATE TYPE mus240_project_role AS ENUM (
  'research_lead',
  'content_developer', 
  'technical_lead',
  'project_manager',
  'researcher_analyst',
  'writer_editor',
  'designer_developer',
  'coordinator_presenter'
);

-- Update the project_role column to use the enum
ALTER TABLE mus240_group_memberships 
ALTER COLUMN project_role TYPE mus240_project_role USING project_role::mus240_project_role;

-- Add a comment to explain the role system
COMMENT ON COLUMN mus240_group_memberships.project_role IS 'Optional project-specific role that team members can choose based on their strengths and project needs';