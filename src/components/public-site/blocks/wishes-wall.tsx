// Wishes Wall — a public message wall where signed-in members and graduates
// post best wishes (built for Doc's retirement page; tenant-neutral).
//
// Reading is open to everyone (the wall IS the content of the page);
// posting requires a signed-in session — that decision (Kevin, 2026-08-12)
// replaces moderation queues: posts appear instantly, and tenant admins get
// a Hide/Unhide control on every card (hidden posts render dimmed for
// admins only). RLS enforces all of it server-side; this component is just
// the polite face.
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { SignInDialog } from '@/components/auth/SignInDialog';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  eyebrow: z.string().default('Best wishes'),
  heading: z.string().default('Best Wishes'),
  intro: z.string().default('Share a memory or a word of thanks. Sign in to add yours to the wall.'),
  composerLabel: z.string().default('Add your message'),
  classYearLabel: z.string().default('Class year (optional)'),
  postCtaLabel: z.string().default('Post a statement'),
  // Optional second CTA (e.g. a giving link). Hidden until both are set.
  giftLabel: z.string().default(''),
  giftUrl: z.string().default(''),
  // Band background: ivory matches the invitation cards; ink turns the
  // guest book into its own dark room (distinct from the band above).
  tone: z.enum(['ivory', 'ink']).default('ivory'),
});
type Config = z.infer<typeof schema>;

interface WishPost {
  id: string;
  user_id: string;
  display_name: string;
  class_year: string | null;
  message: string;
  hidden: boolean;
  created_at: string;
}

function useSessionUser() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return userId;
}

function Render({ config, ctx }: BlockRenderProps<Config>) {
  const userId = useSessionUser();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [classYear, setClassYear] = useState('');
  const [signInOpen, setSignInOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // Everyone sees visible posts; admins additionally get hidden ones back
  // from RLS and can unhide. The tenant filter is the site slug — the wall
  // renders on a public page where no tenant session context exists.
  const { data: posts = [], isLoading } = useQuery<WishPost[]>({
    queryKey: ['wish-wall', ctx.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_wish_wall_posts' as never)
        .select('id, user_id, display_name, class_year, message, hidden, created_at, gw_tenants!inner(slug)')
        .eq('gw_tenants.slug', ctx.slug)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as unknown as WishPost[]) ?? [];
    },
  });

  // Whether the signed-in viewer is a tenant admin (shows Hide controls).
  // Cheap probe: admins are the only callers RLS hands hidden rows to, but
  // that's invisible when nothing is hidden — so read the profile flag.
  const { data: isAdmin = false } = useQuery<boolean>({
    queryKey: ['wish-wall-admin', ctx.slug, userId],
    enabled: !!userId,
    queryFn: async () => {
      // Tenant-scoped staff check (review 2026-08-13: profile flags are
      // global; membership admins have none).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc('am_i_staff', { p_slug: ctx.slug });
      return data === true;
    },
  });

  const post = useMutation({
    mutationFn: async () => {
      const text = message.trim();
      if (!text) throw new Error('Write a message first.');
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) throw new Error('Sign in to post.');
      // Slug-resolved, server-named post (review 2026-08-13: the direct
      // insert filed non-members' posts into their HOME tenant, and the
      // display name was client-forgeable).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('post_wish', {
        p_slug: ctx.slug,
        p_class_year: classYear.trim() || null,
        p_message: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      setClassYear('');
      queryClient.invalidateQueries({ queryKey: ['wish-wall', ctx.slug] });
    },
  });

  const setHidden = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await supabase
        .from('gw_wish_wall_posts' as never)
        .update({ hidden } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wish-wall', ctx.slug] }),
  });

  const removeOwn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_wish_wall_posts' as never).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wish-wall', ctx.slug] }),
  });

  return (
    <section
      id="wishes"
      className="w-full border-y"
      style={{
        background: config.tone === 'ink' ? '#131722' : '#FDFBF6',
        color: config.tone === 'ink' ? '#fff' : undefined,
        borderColor: `color-mix(in oklab, var(--site-accent) ${config.tone === 'ink' ? '45%' : '25%'}, transparent)`,
      }}
    >
      <div className="gw-container">
        {/* Ceremonial centered header — the guest book is a page of the same
            program as the Event Card (UI audit, 2026-08-13). */}
        <div className="text-center mb-8">
          {config.eyebrow && (
            <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--site-accent)', letterSpacing: '0.24em' }}>
              {config.eyebrow}
            </p>
          )}
          <h2 className="text-4xl cq-sm:text-5xl font-bold leading-tight" style={{ fontFamily: 'var(--site-heading-font)' }}>
            {config.heading}
          </h2>
          {config.intro && <p className={`mt-3 max-w-2xl mx-auto text-base ${config.tone === 'ink' ? 'text-white/70' : 'text-muted-foreground'}`}>{config.intro}</p>}
          <div className="mt-6 mx-auto max-w-sm flex items-center gap-4" aria-hidden="true">
            <span className="h-px flex-1" style={{ background: 'var(--site-accent)', opacity: 0.4 }} />
            <span className="h-px w-10" style={{ background: 'var(--site-accent)' }} />
            <span className="h-px flex-1" style={{ background: 'var(--site-accent)', opacity: 0.4 }} />
          </div>
        </div>

        {/* One card, one CTA slot — content swaps by session state, the
            structure never does. */}
        <div
          className="mx-auto max-w-2xl bg-white text-slate-900 border p-6 cq-sm:p-8"
          style={{
            borderColor: 'color-mix(in oklab, var(--site-accent) 35%, transparent)',
            borderRadius: 'var(--site-radius)',
          }}
        >
          {!userId ? (
            <div className="text-center space-y-4">
              <Heart className="w-7 h-7 mx-auto" style={{ color: 'var(--site-accent)' }} />
              <p className="text-base">
                {posts.length === 0
                  ? 'Be the first to sign the wall — create an account or sign in to leave a word.'
                  : 'Create an account or sign in to add your message to the wall.'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  className="px-7 h-14 text-base font-semibold text-white"
                  style={{ background: '#131722', borderRadius: 'var(--site-radius)' }}
                  onClick={() => setSignInOpen(true)}
                >
                  <Heart className="w-4 h-4 mr-2" style={{ color: 'var(--site-accent)' }} />
                  {config.postCtaLabel || 'Post a statement'}
                </Button>
                {config.giftLabel && config.giftUrl && (
                  <a
                    href={config.giftUrl}
                    className="inline-flex items-center px-7 h-14 text-base font-semibold border-4"
                    style={{ color: 'var(--site-accent)', borderColor: 'var(--site-accent)', borderRadius: 'var(--site-radius)' }}
                  >
                    {config.giftLabel}
                  </a>
                )}
              </div>
              <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
            </div>
          ) : (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); post.mutate(); }}>
              {posts.length === 0 && (
                <p className="text-center text-base font-medium">Be the first to sign the wall.</p>
              )}
              <Label className="font-medium">{config.composerLabel}</Label>
              <Textarea
                ref={composerRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Your message…"
                required
              />
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                  placeholder={config.classYearLabel}
                  className="max-w-[180px]"
                  maxLength={20}
                />
                <Button
                  type="submit"
                  disabled={post.isPending || !message.trim()}
                  className="font-semibold text-white"
                  style={{ background: '#131722', borderRadius: 'var(--site-radius)' }}
                >
                  {post.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" style={{ color: 'var(--site-accent)' }} />}
                  Post to the wall
                </Button>
                {config.giftLabel && config.giftUrl && (
                  <a
                    href={config.giftUrl}
                    className="inline-flex items-center px-5 h-10 text-sm font-semibold border-4"
                    style={{ color: 'var(--site-accent)', borderColor: 'var(--site-accent)', borderRadius: 'var(--site-radius)' }}
                  >
                    {config.giftLabel}
                  </a>
                )}
                {post.isError && (
                  <span className="text-sm text-destructive">{(post.error as Error).message}</span>
                )}
              </div>
            </form>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : posts.length > 0 && (
          <div className="mt-8 columns-1 cq-sm:columns-2 gap-4 [&>*]:break-inside-avoid">
            {posts.map((p) => (
              <div
                key={p.id}
                className={`mb-4 bg-white text-slate-900 border p-5 ${p.hidden ? 'opacity-40' : ''}`}
                style={{
                  borderColor: 'color-mix(in oklab, var(--site-accent) 25%, transparent)',
                  borderRadius: 'var(--site-radius)',
                }}
              >
                <p className="whitespace-pre-wrap text-base leading-relaxed">{p.message}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    {p.display_name}
                    {p.class_year && <span> · {p.class_year}</span>}
                  </p>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() => setHidden.mutate({ id: p.id, hidden: !p.hidden })}
                      >
                        {p.hidden ? 'Unhide' : 'Hide'}
                      </button>
                    )}
                    {userId === p.user_id && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() => removeOwn.mutate(p.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Intro</Label>
        <Textarea value={config.intro} onChange={(e) => set({ intro: e.target.value })} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>Composer label</Label>
        <Input value={config.composerLabel} onChange={(e) => set({ composerLabel: e.target.value })} />
      </div>
    </div>
  );
}

export const wishesWallBlock: BlockModule<typeof schema> = {
  type: 'wishes-wall',
  name: 'Wishes Wall',
  description: 'A public wall of messages. Visitors sign in to post; admins can hide any post.',
  icon: Heart,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: schema.parse({}),
  EditorForm,
  Render,
};
