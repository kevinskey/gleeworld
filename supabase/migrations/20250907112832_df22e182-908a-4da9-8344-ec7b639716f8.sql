-- Fix critical RLS policies for Bowman Scholars tables

-- RLS: user_roles_multi
create policy urm_self_read on user_roles_multi
for select using (user_id = auth.uid() or is_super_admin());
create policy urm_admin_all on user_roles_multi
for all using (is_super_admin()) with check (is_super_admin());

-- RLS: bowman_scholars
create policy bs_read on bowman_scholars
for select using (true);
create policy bs_write_self on bowman_scholars
for insert with check (auth.uid() = user_id);
create policy bs_write_self_upd on bowman_scholars
for update using (auth.uid() = user_id);
create policy bs_admin on bowman_scholars
for all using (is_super_admin()) with check (is_super_admin());

-- RLS: liturgical_weeks
create policy lw_read_all on liturgical_weeks for select using (true);
create policy lw_write_admin on liturgical_weeks for all
  using (is_super_admin() or has_role('admin')) with check (is_super_admin() or has_role('admin'));
create policy lw_insert_creator on liturgical_weeks for insert
  with check (auth.uid() = created_by or is_super_admin() or has_role('admin'));
create policy lw_update_creator on liturgical_weeks for update
  using (auth.uid() = created_by or is_super_admin() or has_role('admin'));

-- RLS: liturgy_assets
create policy la_read on liturgy_assets for select using (true);
create policy la_admin on liturgy_assets for all
  using (is_super_admin() or has_role('admin')) with check (is_super_admin() or has_role('admin'));
create policy la_ins_creator on liturgy_assets for insert
  with check (auth.uid() = created_by or is_super_admin() or has_role('admin'));
create policy la_upd_creator on liturgy_assets for update
  using (auth.uid() = created_by or is_super_admin() or has_role('admin'));

-- RLS: playlists
create policy pl_read on playlists for select using (is_public = true or is_super_admin() or has_role('admin') or auth.uid() = created_by);
create policy pl_admin on playlists for all
  using (is_super_admin() or has_role('admin')) with check (is_super_admin() or has_role('admin'));
create policy pl_ins_creator on playlists for insert
  with check (auth.uid() = created_by or is_super_admin() or has_role('admin'));
create policy pl_upd_creator on playlists for update
  using (auth.uid() = created_by or is_super_admin() or has_role('admin'));

-- RLS: playlist_items
create policy pli_read on playlist_items for select using (true);
create policy pli_admin on playlist_items for all
  using (is_super_admin() or has_role('admin')) with check (is_super_admin() or has_role('admin'));
create policy pli_ins_creator on playlist_items for insert
  with check (exists(select 1 from playlists p where p.id = playlist_id and (p.created_by = auth.uid() or is_super_admin() or has_role('admin'))));
create policy pli_upd_creator on playlist_items for update
  using (exists(select 1 from playlists p where p.id = playlist_id and (p.created_by = auth.uid() or is_super_admin() or has_role('admin'))));