-- Drop and recreate RLS policies for new tables (corrected syntax)

-- user_roles_multi policies
drop policy if exists "users_can_read_own_roles" on user_roles_multi;
drop policy if exists "admins_can_manage_all_roles" on user_roles_multi;

create policy "users_can_read_own_roles" on user_roles_multi for select using (user_id = auth.uid());
create policy "admins_can_manage_all_roles" on user_roles_multi for all using (exists(select 1 from user_roles_multi where user_id = auth.uid() and role = 'super_admin'));

-- bowman_scholars policies  
drop policy if exists "scholars_public_read" on bowman_scholars;
drop policy if exists "scholars_self_write" on bowman_scholars;
drop policy if exists "scholars_self_update" on bowman_scholars;

create policy "scholars_public_read" on bowman_scholars for select using (true);
create policy "scholars_self_write" on bowman_scholars for insert with check (user_id = auth.uid());
create policy "scholars_self_update" on bowman_scholars for update using (user_id = auth.uid());

-- liturgical_weeks policies
drop policy if exists "liturgical_weeks_public_read" on liturgical_weeks;
drop policy if exists "liturgical_weeks_creator_write" on liturgical_weeks;
drop policy if exists "liturgical_weeks_creator_update" on liturgical_weeks;

create policy "liturgical_weeks_public_read" on liturgical_weeks for select using (true);
create policy "liturgical_weeks_creator_write" on liturgical_weeks for insert with check (created_by = auth.uid());
create policy "liturgical_weeks_creator_update" on liturgical_weeks for update using (created_by = auth.uid());

-- liturgy_assets policies
drop policy if exists "liturgy_assets_public_read" on liturgy_assets;
drop policy if exists "liturgy_assets_creator_write" on liturgy_assets;
drop policy if exists "liturgy_assets_creator_update" on liturgy_assets;

create policy "liturgy_assets_public_read" on liturgy_assets for select using (true);
create policy "liturgy_assets_creator_write" on liturgy_assets for insert with check (created_by = auth.uid());
create policy "liturgy_assets_creator_update" on liturgy_assets for update using (created_by = auth.uid());

-- playlists policies
drop policy if exists "playlists_public_read" on playlists;
drop policy if exists "playlists_creator_write" on playlists;
drop policy if exists "playlists_creator_update" on playlists;

create policy "playlists_public_read" on playlists for select using (is_public = true or created_by = auth.uid());
create policy "playlists_creator_write" on playlists for insert with check (created_by = auth.uid());
create policy "playlists_creator_update" on playlists for update using (created_by = auth.uid());

-- playlist_items policies
drop policy if exists "playlist_items_public_read" on playlist_items;
drop policy if exists "playlist_items_creator_write" on playlist_items;
drop policy if exists "playlist_items_creator_update" on playlist_items;

create policy "playlist_items_public_read" on playlist_items for select using (true);
create policy "playlist_items_creator_write" on playlist_items for insert with check (exists(select 1 from playlists where id = playlist_id and created_by = auth.uid()));
create policy "playlist_items_creator_update" on playlist_items for update using (exists(select 1 from playlists where id = playlist_id and created_by = auth.uid()));