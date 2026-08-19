-- Carry the tenant's SoundCloud profile into the public site payload so the
-- new `soundcloud` block can render for anonymous visitors.
--
-- The block deliberately holds no profile of its own: it reads the branding
-- value, so a tenant that fills in Settings → Branding gets a working
-- section with no per-block setup, and one that leaves it blank renders
-- nothing at all.
--
-- Additive only — same signature, one extra key in the returned object.
-- Every other field is byte-for-byte the previous definition.

CREATE OR REPLACE FUNCTION public.get_public_site(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'slug', s.slug,
    'theme', s.theme,
    'blocks', coalesce(s.published_blocks, '[]'::jsonb),
    'published_at', s.published_at,
    'org_name', b.org_name,
    'logo_url', b.logo_url,
    'tagline', b.tagline,
    'primary_color', b.primary_color,
    'accent_color', b.accent_color,
    'font_family', b.font_family,
    'letter_spacing', b.letter_spacing,
    'soundcloud_url', b.soundcloud_url,
    'active_addons', coalesce(
      (select jsonb_agg(ts.module_id)
         from gw_tenant_subscriptions ts
        where ts.tenant_id = s.tenant_id and ts.status = 'active'),
      '[]'::jsonb)
  )
  from gw_public_sites s
  left join gw_branding_settings b on b.tenant_id = s.tenant_id
  where s.slug = p_slug and s.is_published = true;
$function$;
