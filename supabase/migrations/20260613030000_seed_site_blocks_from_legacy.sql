-- Seed draft gw_site_blocks from legacy landing content (gw_hero_slides /
-- homepage_hero universal sliders / gw_landing_sections) for tenants that have
-- legacy content but no blocks yet. Sites are created UNPUBLISHED so admins can
-- review in /admin/public-page and hit Publish; until then the tenant root
-- keeps rendering the legacy landing. Idempotent: skips tenants with blocks.
do $$
declare
  t record;
  v_org text; v_logo text; v_tag text;
  v_imgs text[]; v_title text; v_desc text;
  v_about jsonb; v_social jsonb;
  v_pos int;
  v_hero_cfg jsonb;
begin
  for t in select id, slug from gw_tenants loop
    if exists (select 1 from gw_site_blocks b where b.tenant_id = t.id) then
      continue;
    end if;

    select array_agg(h.image_url order by h.display_order),
           (array_agg(h.title order by h.display_order))[1],
           (array_agg(h.description order by h.display_order))[1]
      into v_imgs, v_title, v_desc
      from gw_hero_slides h
     where h.tenant_id = t.id and coalesce(h.is_active, true) and h.image_url is not null;

    if v_imgs is null then
      select array_agg(s.image_url order by s.display_order),
             (array_agg(s.title order by s.display_order))[1],
             (array_agg(s.description order by s.display_order))[1]
        into v_imgs, v_title, v_desc
        from gw_universal_slider_slides s
        join gw_universal_sliders u on u.id = s.slider_id
       where u.tenant_id = t.id and u.placement_key = 'homepage_hero'
         and coalesce(u.is_active, true) and coalesce(s.is_active, true)
         and s.image_url is not null;
    end if;

    select ls.config into v_about
      from gw_landing_sections ls
     where ls.tenant_id = t.id and ls.section_type = 'about' and ls.enabled
     limit 1;

    select ls.config into v_social
      from gw_landing_sections ls
     where ls.tenant_id = t.id and ls.section_type = 'social' and ls.enabled
     limit 1;

    if v_imgs is null and v_about is null and v_social is null then
      continue;
    end if;

    select b.org_name, b.logo_url, b.tagline into v_org, v_logo, v_tag
      from gw_branding_settings b where b.tenant_id = t.id limit 1;
    v_org := coalesce(v_org, t.slug);

    insert into gw_public_sites (tenant_id, slug)
    values (t.id, t.slug)
    on conflict (tenant_id) do nothing;

    v_pos := 0;
    insert into gw_site_blocks (tenant_id, block_type, position, config, is_visible)
    values (t.id, 'header', v_pos, jsonb_build_object(
      'siteName', v_org,
      'logoUrl', coalesce(v_logo, ''),
      'navLinks', jsonb_build_array(
        jsonb_build_object('label', 'Events', 'url', '#events'),
        jsonb_build_object('label', 'About', 'url', '#about'),
        jsonb_build_object('label', 'Contact', 'url', '#contact'))), true);

    if array_length(v_imgs, 1) > 1 then
      v_hero_cfg := jsonb_build_object(
        'variant', 'slideshow', 'imageUrl', '', 'videoUrl', '',
        'images', to_jsonb(v_imgs));
    else
      v_hero_cfg := jsonb_build_object(
        'variant', 'image', 'imageUrl', coalesce(v_imgs[1], ''), 'videoUrl', '',
        'images', '[]'::jsonb);
    end if;
    v_hero_cfg := v_hero_cfg || jsonb_build_object(
      'headline', coalesce(nullif(v_title, ''), v_org),
      'subheadline', coalesce(nullif(v_desc, ''), coalesce(v_tag, '')),
      'ctaLabel', 'See upcoming events',
      'ctaUrl', '#events');
    v_pos := v_pos + 1;
    insert into gw_site_blocks (tenant_id, block_type, position, config, is_visible)
    values (t.id, 'hero', v_pos, v_hero_cfg, true);

    v_pos := v_pos + 1;
    insert into gw_site_blocks (tenant_id, block_type, position, config, is_visible)
    values (t.id, 'events', v_pos,
      jsonb_build_object('heading', 'Upcoming events', 'style', 'cards', 'limit', 4), true);

    if v_about is not null then
      v_pos := v_pos + 1;
      insert into gw_site_blocks (tenant_id, block_type, position, config, is_visible)
      values (t.id, 'about', v_pos, jsonb_build_object(
        'title', coalesce(v_about->>'title', 'About us'),
        'body', coalesce(v_about->>'body', ''),
        'imageUrl', coalesce(v_about->>'image_url', ''),
        'imageSide', case when v_about->>'layout' = 'image-left' then 'left' else 'right' end), true);
    end if;

    v_pos := v_pos + 1;
    insert into gw_site_blocks (tenant_id, block_type, position, config, is_visible)
    values (t.id, 'contact', v_pos, jsonb_build_object(
      'email', '', 'phone', '',
      'facebook', coalesce(v_social->>'facebook', ''),
      'instagram', coalesce(v_social->>'instagram', ''),
      'youtube', coalesce(v_social->>'youtube', ''),
      'twitter', coalesce(v_social->>'twitter', ''),
      'spotify', coalesce(v_social->>'spotify', '')), true);

    -- reset loop variables for the next tenant
    v_imgs := null; v_title := null; v_desc := null;
    v_about := null; v_social := null; v_org := null; v_logo := null; v_tag := null;
  end loop;
end $$;
