// Logged-out/offline My Music: renders ONLY from the IndexedDB vault.
// No supabase call may sit on this page's render path — it must work in
// airplane mode once the app shell is loaded, signed in or not.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HardDrive, Music, Trash2, ExternalLink } from 'lucide-react';
import { ScoreViewerDialog, type ViewingScore } from '@/components/music-library/ScoreViewerDialog';
import { listVault, getVaultBlob, removeFromVault, isVaultSupported, type VaultEntry } from '@/lib/offlineVault';
import { useAuth } from '@/contexts/AuthContext';

const fmtBytes = (n: number) => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export default function MyMusicOfflinePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState<ViewingScore | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['offline-vault'],
    queryFn: listVault,
    enabled: isVaultSupported(),
  });
  const bytes = entries.reduce((n, e) => n + e.size, 0);

  const open = async (e: VaultEntry) => {
    const blob = await getVaultBlob(e.id);
    if (!blob) { qc.invalidateQueries({ queryKey: ['offline-vault'] }); return; }
    setViewing({ title: e.title, pdfUrl: URL.createObjectURL(blob) });
  };
  const close = () => {
    if (viewing) URL.revokeObjectURL(viewing.pdfUrl);
    setViewing(null);
  };
  const remove = async (id: string) => {
    await removeFromVault(id);
    qc.invalidateQueries({ queryKey: ['offline-vault'] });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <HardDrive className="w-5 h-5" /> My Music on this device
          </h1>
          {user && (
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link to="/dashboard/music-library">Full library <ExternalLink className="w-3.5 h-3.5 ml-1" /></Link>
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {entries.length > 0
            ? `${entries.length} score${entries.length === 1 ? '' : 's'} · ${fmtBytes(bytes)} — available offline, no sign-in needed.`
            : 'Scores you save to this device open here — offline, no sign-in needed.'}
        </p>

        {!isVaultSupported() && (
          <Card><CardContent className="py-8 text-sm text-muted-foreground">This browser does not support on-device storage.</CardContent></Card>
        )}

        {isVaultSupported() && !isLoading && entries.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <Music className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-medium">No scores saved to this device</p>
              <p className="text-xs text-muted-foreground">
                Sign in, open My Music in the Music Library, and tap “Save to this device” on any score.
              </p>
            </CardContent>
          </Card>
        )}

        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Card className="hover:bg-accent/40 transition-colors">
                <CardContent className="py-3 flex items-center gap-3">
                  <button type="button" className="flex-1 text-left min-w-0" onClick={() => open(e)} aria-label={`Open ${e.title}`}>
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[e.composer, e.voicing, fmtBytes(e.size)].filter(Boolean).join(' · ')}
                    </p>
                  </button>
                  <Button
                    variant="ghost" size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(e.id)}
                    aria-label={`Remove ${e.title} from this device`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <ScoreViewerDialog viewing={viewing} onClose={close} />
    </div>
  );
}
