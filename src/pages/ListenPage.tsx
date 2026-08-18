// /listen/:id — sign-in-gated landing page for shared recordings (email
// links and bell notifications point here). Access = whatever RLS lets
// the signed-in caller SELECT: owner, class member (course_id copy),
// item-share grantee, or admin. A row we can't see renders the friendly
// no-access state — never a crash, never a distinction between "missing"
// and "not yours" (don't leak existence).
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Music, Loader2, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

interface ListenRow {
  id: string; title: string; file_url: string; file_type: string;
  created_at: string; uploaded_by: string;
}

export default function ListenPage() {
  const { id } = useParams<{ id: string }>();

  const { data: row, isLoading } = useQuery<ListenRow | null>({
    queryKey: ['listen', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, created_at, uploaded_by')
        .eq('id', id!)
        .eq('is_deleted', false)
        .maybeSingle();
      if (error) throw error;
      return (data as ListenRow) ?? null;
    },
  });

  const { data: sharer } = useQuery<string | null>({
    queryKey: ['listen-sharer', row?.uploaded_by],
    enabled: !!row?.uploaded_by,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles_directory')
        .select('full_name')
        .eq('user_id', row!.uploaded_by)
        .maybeSingle();
      return (data as any)?.full_name ?? null;
    },
  });

  return (
    <UniversalLayout>
      <div className="max-w-lg mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-6 h-6 animate-spin inline text-muted-foreground" />
          </div>
        ) : !row ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-base font-semibold">This recording isn't available.</p>
              <p className="text-sm text-muted-foreground mt-1">
                It may have been removed, or it hasn't been shared with your account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Music className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h1 className="text-lg font-semibold">{row.title || 'Untitled recording'}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {sharer ? `Shared by ${sharer}` : 'Shared with you'}
                  {row.created_at ? ` · ${format(parseISO(row.created_at), 'MMM d, yyyy')}` : ''}
                </p>
              </div>
              {row.file_type?.startsWith('audio/') ? (
                <audio controls src={row.file_url} className="w-full" aria-label={row.title} />
              ) : row.file_type?.startsWith('video/') ? (
                <video controls src={row.file_url} className="w-full rounded-lg bg-black" />
              ) : (
                <p className="text-sm text-muted-foreground">Preview isn't available for this file type.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </UniversalLayout>
  );
}
