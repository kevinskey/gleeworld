-- Fix RLS policies for messaging tables

-- Check if RLS is enabled for messaging tables and add proper policies
ALTER TABLE gw_message_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for gw_message_groups
CREATE POLICY "Users can view groups they are members of"
  ON gw_message_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_group_members gm
      WHERE gm.group_id = gw_message_groups.id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
    )
  );

CREATE POLICY "Admins can manage all groups"
  ON gw_message_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
    )
  );

-- RLS policies for gw_group_members  
CREATE POLICY "Users can view group members for groups they belong to"
  ON gw_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_group_members gm2
      WHERE gm2.group_id = gw_group_members.group_id
      AND gm2.user_id = auth.uid()
      AND gm2.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
    )
  );

CREATE POLICY "Admins can manage group members"
  ON gw_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
    )
  );

-- RLS policies for gw_group_messages
CREATE POLICY "Users can view messages in groups they belong to"
  ON gw_group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_group_members gm
      WHERE gm.group_id = gw_group_messages.group_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_super_admin = true)
    )
  );

CREATE POLICY "Users can send messages to groups they belong to"
  ON gw_group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM gw_group_members gm
      WHERE gm.group_id = gw_group_messages.group_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON gw_group_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON gw_group_messages FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for gw_message_reactions
CREATE POLICY "Users can view reactions in groups they belong to"
  ON gw_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_group_messages gm
      JOIN gw_group_members gmem ON gmem.group_id = gm.group_id
      WHERE gm.id = gw_message_reactions.message_id
      AND gmem.user_id = auth.uid()
      AND gmem.is_active = true
    )
  );

CREATE POLICY "Users can add reactions to messages in their groups"
  ON gw_message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM gw_group_messages gm
      JOIN gw_group_members gmem ON gmem.group_id = gm.group_id
      WHERE gm.id = gw_message_reactions.message_id
      AND gmem.user_id = auth.uid()
      AND gmem.is_active = true
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON gw_message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for gw_typing_indicators
CREATE POLICY "Users can view typing indicators in their groups"
  ON gw_typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_group_members gm
      WHERE gm.group_id = gw_typing_indicators.group_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
  );

CREATE POLICY "Users can insert their own typing indicators"
  ON gw_typing_indicators FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM gw_group_members gm
      WHERE gm.group_id = gw_typing_indicators.group_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
  );

CREATE POLICY "Users can delete their own typing indicators"
  ON gw_typing_indicators FOR DELETE
  USING (auth.uid() = user_id);