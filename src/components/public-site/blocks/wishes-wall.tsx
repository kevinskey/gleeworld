// Wishes Wall — a public message wall where signed-in members and graduates
// post best wishes (built for Doc's retirement page; tenant-neutral).
//
// Reading is open to everyone (the wall IS the content of the page);
// posting requires a signed-in session — that decision (Kevin, 2026-08-12)
// replaces moderation queues: posts appear instantly, and tenant admins get
// a Hide/Unhide control on every card (hidden posts render dimmed for
// admins only). RLS enforces all of it server-side; this component is just
// the polite face.
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Best Wishes'),
  intro: z.string().default('Share a memory or a word of thanks. Sign in to add yours to the wall.'),
  composerLabel: z.string().default('Add your message'),
  classYearLabel: z.string().default('Class year (optional)'),
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
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', userId!)
        .maybeSingle();
      return !!(data?.is_admin || data?.is_super_admin);
    },
  });

  const post = useMutation({
    mutationFn: async () => {
      const text = message.trim();
      if (!text) throw new Error('Write a message first.');
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) throw new Error('Sign in to post.');
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('preferred_name, full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      const display =
        profile?.preferred_name?.trim() || profile?.full_name?.trim() || user.email || 'A graduate';
      const { error } = await supabase.from('gw_wish_wall_posts' as never).insert({
        user_id: user.id,
        display_name: display,
        class_year: classYear.trim() || null,
        message: text,
      } as never);
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
    <section id="wishes" className="max-w-6xl mx-auto w-full px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">{config.heading}</h2>
        {config.intro && <p className="text-muted-foreground max-w-xl mx-auto">{config.intro}</p>}
      </div>

      {userId ? (
        <form
          className="mb-10 rounded-xl border border-border bg-white/70 p-4 space-y-3"
          onSubmit={(e) => { e.preventDefault(); post.mutate(); }}
        >
          <Label className="font-medium">{config.composerLabel}</Label>
          <Textarea
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
            <Button type="submit" disabled={post.isPending || !message.trim()}>
              {post.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" />}
              Post to the wall
            </Button>
            {post.isError && (
              <span className="text-sm text-destructive">{(post.error as Error).message}</span>
            )}
          </div>
        </form>
      ) : (
        <div className="mb-10 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          <a href="/login" className="underline font-medium">Sign in</a> to add your message to the wall.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Be the first to leave a message.</p>
      ) : (
        <div className="columns-1 cq-sm:columns-2 gap-4 [&>*]:break-inside-avoid">
          {posts.map((p) => (
            <div
              key={p.id}
              className={`mb-4 rounded-xl border border-border bg-white p-4 shadow-sm ${p.hidden ? 'opacity-40' : ''}`}
            >
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{p.message}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {p.display_name}
                  {p.class_year && <span className="text-muted-foreground font-normal"> · {p.class_year}</span>}
                </p>
                <div className="flex gap-1">
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
