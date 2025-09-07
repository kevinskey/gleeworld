-- RLS policies for Bowman Scholars tables

-- user_roles_multi policies
create policy "users_can_read_own_roles" on user_roles_multi for select using (user_id = auth.uid());
create policy "admins_can_manage_all_roles" on user_roles_multi for all using (exists(select 1 from user_roles_multi where user_id = auth.uid() and role = 'super_admin'));

-- bowman_scholars policies  
create policy "scholars_public_read" on bowman_scholars for select using (true);
create policy "scholars_self_write" on bowman_scholars for insert with check (user_id = auth.uid());
create policy "scholars_self_update" on bowman_scholars for update using (user_id = auth.uid());

-- liturgical_weeks policies
create policy "liturgical_weeks_public_read" on liturgical_weeks for select using (true);
create policy "liturgical_weeks_creator_write" on liturgical_weeks for insert with check (created_by = auth.uid());
create policy "liturgical_weeks_creator_update" on liturgical_weeks for update using (created_by = auth.uid());

-- liturgy_assets policies
create policy "liturgy_assets_public_read" on liturgy_assets for select using (true);
create policy "liturgy_assets_creator_write" on liturgy_assets for insert with check (created_by = auth.uid());
create policy "liturgy_assets_creator_update" on liturgy_assets for update using (created_by = auth.uid());

-- playlists policies
create policy "playlists_public_read" on playlists for select using (is_public = true or created_by = auth.uid());
create policy "playlists_creator_write" on playlists for insert with check (created_by = auth.uid());
create policy "playlists_creator_update" on playlists for update using (created_by = auth.uid());

-- playlist_items policies
create policy "playlist_items_public_read" on playlist_items for select using (true);
create policy "playlist_items_creator_write" on playlist_items for insert with check (exists(select 1 from playlists where id = playlist_id and created_by = auth.uid()));
create policy "playlist_items_creator_update" on playlist_items for update using (exists(select 1 from playlists where id = playlist_id and created_by = auth.uid()));