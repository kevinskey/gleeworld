import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import {
  ArrowLeft, Image as ImageIcon, Link2, Loader2, Printer, QrCode, Save, X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { PageTitle } from '@/components/dashboard/DashboardPageShell';
import { WorshipAidSheets } from '@/components/liturgy/WorshipAidSheets';
import {
  buildWorshipAid, DEFAULT_SETTINGS, panelSpacing, SPACING_MAX, SPACING_MIN,
  type AidSource, type PanelId, type WorshipAidSettings,
} from '@/lib/liturgy/worshipAid';

/**
 * Design and print the worship aid for a Mass.
 *
 * The preview IS the print output — the same component at the same inch
 * dimensions, not an approximation that gets re-laid-out for paper. What is
 * on screen is what comes out of the printer, which matters for a folded
 * document where a quarter-inch of drift crosses the fold.
 *
 * Liturgical content is read live from the Mass plan and never copied here,
 * so editing the plan updates the aid. Only presentation — cover art, the
 * season word, notices, inserted images — is stored on the row.
 */

const BUCKET = 'sheet-music';

type Row = AidSource & { id: string; psalm_title: string | null; worship_aid: unknown; share_token: string | null };

export default function WorshipAidPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<Row | null>(null);
  const [settings, setSettings] = useState<WorshipAidSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [psalmImage, setPsalmImage] = useState<string | null>(null);
  const uploadTarget = useRef<PanelId | 'cover'>('cover');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('gw_liturgy_masses')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) { toast.error(error.message); setLoading(false); return; }
      const r = data as unknown as Row;
      setRow(r);
      setToken(r.share_token ?? null);
      setSettings({ ...DEFAULT_SETTINGS, ...(r.worship_aid as Partial<WorshipAidSettings> ?? {}) });
      setLoading(false);
    })();
  }, [id]);

  // A psalm composed for this Mass is filed in the library tagged
  // responsorial-psalm; its engraved thumbnail is exactly what the printed
  // program wants, so it is pulled in rather than asked for again.
  useEffect(() => {
    if (!row?.responsorial_psalm) return;
    (async () => {
      const { data } = await supabase
        .from('gw_sheet_music')
        .select('thumbnail_url, created_at')
        .contains('tags', ['responsorial-psalm'])
        .ilike('title', `%${row.responsorial_psalm}%`)
        .not('thumbnail_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);
      const url = data?.[0]?.thumbnail_url as string | undefined;
      if (!url) return;
      setPsalmImage(url);
      // Persist it onto the aid: the phone edition is public and cannot query
      // the library, so the engraved setting has to travel with the record.
      setSettings((cur) => (cur.psalmImageUrl === url ? cur : { ...cur, psalmImageUrl: url }));
    })();
  }, [row?.responsorial_psalm]);

  const publicUrl = useMemo(
    () => (token ? `${window.location.origin}/worship-aid/${token}` : null),
    [token],
  );

  // The QR is generated locally — no third-party chart service, which would
  // hand a scannable link to every parish's service to someone else's server.
  useEffect(() => {
    if (!publicUrl) { setQr(null); return; }
    QRCode.toDataURL(publicUrl, { margin: 0, width: 320, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(null));
  }, [publicUrl]);

  const aid = useMemo(
    () => (row ? buildWorshipAid(row, settings, psalmImage) : null),
    [row, settings, psalmImage],
  );

  const patch = (p: Partial<WorshipAidSettings>) => setSettings((s) => ({ ...s, ...p }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('gw_liturgy_masses')
      .update({ worship_aid: settings as unknown as Record<string, unknown> })
      .eq('id', id!);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Worship aid saved.');
  };

  const publish = async () => {
    const next = token ? null : crypto.randomUUID();
    const { error } = await supabase
      .from('gw_liturgy_masses')
      .update({ share_token: next })
      .eq('id', id!);
    if (error) { toast.error(error.message); return; }
    setToken(next);
    toast.success(next ? 'Published — the QR code now works.' : 'Unpublished. The old link no longer opens.');
  };

  const pickImage = (target: PanelId | 'cover') => {
    uploadTarget.current = target;
    fileRef.current?.click();
  };

  const upload = useCallback(async (file: File) => {
    if (!id) return;
    const target = uploadTarget.current;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `liturgy/${id}/aid-${target}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
    if (error) { toast.error(error.message); return; }
    // Cache-bust: replacing an image must show the new one, not the cached old.
    const url = `${supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    if (target === 'cover') patch({ coverImageUrl: url });
    else patch({ images: { ...settings.images, [target]: url } });
    toast.success('Image added. Save to keep it.');
  }, [id, settings.images]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!row || !aid) return <div className="p-8 text-sm">Mass plan not found.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10 pt-2 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/liturgy/${id}`)} className="mb-1 -ml-2">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to the plan
          </Button>
          <PageTitle>Worship Aid</PageTitle>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="space-y-4 p-4">
          <p className="text-xs text-muted-foreground">
            One landscape sheet, printed both sides and folded once. In the print dialog choose
            <strong> two-sided, flip on short edge</strong>, paper <strong>11 × 8.5 landscape</strong>,
            and scale <strong>100% / Actual size</strong> — any “fit to page” shifts the fold.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="aid-title" className="text-xs">Cover title</Label>
              <Input id="aid-title" value={settings.coverTitle}
                onChange={(e) => patch({ coverTitle: e.target.value })}
                placeholder="Your parish or ensemble name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aid-word" className="text-xs">Season word</Label>
              <Input id="aid-word" value={settings.coverWord}
                onChange={(e) => patch({ coverWord: e.target.value })}
                placeholder={row.liturgical_season ?? 'ADVENT'} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="aid-spine" className="text-xs">Spine text (runs up the back cover)</Label>
              <Input id="aid-spine" value={settings.spineText}
                onChange={(e) => patch({ spineText: e.target.value })}
                placeholder="www.yourparish.org" />
            </div>
          </div>

          {/* Only the cover art is used every time (Kevin). The other slots
              are often empty, and how much air is left over changes with how
              many hymns and readings a Sunday has — so each panel carries its
              own image control AND its own spacing, to open a sparse panel
              out or tighten a full one. */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => pickImage('cover')}>
                <ImageIcon className="mr-1.5 h-4 w-4" />
                {settings.coverImageUrl ? 'Replace cover image' : 'Cover image'}
              </Button>
              {settings.coverImageUrl && (
                <>
                  <img src={settings.coverImageUrl} alt="" className="h-10 w-10 border border-border object-contain" />
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => patch({ coverImageUrl: null })} className="text-destructive">
                    <X className="mr-1 h-3.5 w-3.5" /> Remove
                  </Button>
                </>
              )}
            </div>

            {(['insideLeft', 'insideRight', 'back'] as PanelId[]).map((p) => {
              const name = p === 'insideLeft' ? 'Inside left' : p === 'insideRight' ? 'Inside right' : 'Back';
              const img = settings.images?.[p] ?? null;
              return (
                <div key={p} className="flex flex-wrap items-center gap-2 border border-border p-2">
                  <span className="w-24 shrink-0 text-xs font-medium">{name}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => pickImage(p)}>
                    <ImageIcon className="mr-1.5 h-4 w-4" /> {img ? 'Replace' : 'Add image'}
                  </Button>
                  {img && (
                    <>
                      <img src={img} alt="" className="h-10 w-10 border border-border object-contain" />
                      <Button type="button" variant="ghost" size="sm" className="text-destructive"
                        onClick={() => patch({ images: { ...settings.images, [p]: null } })}>
                        <X className="mr-1 h-3.5 w-3.5" /> Remove
                      </Button>
                    </>
                  )}
                  <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    Line spacing
                    <input
                      type="range"
                      min={SPACING_MIN} max={SPACING_MAX} step={0.05}
                      value={panelSpacing(settings, p)}
                      onChange={(e) => patch({
                        spacing: { ...settings.spacing, [p]: Number(e.target.value) },
                      })}
                      aria-label={`${name} line spacing`}
                      className="w-32"
                    />
                    <span className="w-10 tabular-nums">{panelSpacing(settings, p).toFixed(2)}×</span>
                  </label>
                </div>
              );
            })}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.currentTarget.value = '';
            }}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ['welcomeNotice', 'Welcome notice'],
              ['communionNotice', 'Communion notice'],
              ['sendingNotice', 'Sending notice'],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`aid-${key}`} className="text-xs">{label}</Label>
                <Textarea id={`aid-${key}`} rows={4} value={settings[key]}
                  onChange={(e) => patch({ [key]: e.target.value } as Partial<WorshipAidSettings>)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Phone edition */}
      <Card className="print:hidden">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Phone edition</h2>
              <p className="text-xs text-muted-foreground">
                Publishing puts a QR code on the printed cover. Anyone who scans it reads the
                program on their phone — no account, and only what the printed aid shows.
              </p>
            </div>
            <Button variant={token ? 'outline' : 'default'} onClick={publish}>
              <QrCode className="mr-1.5 h-4 w-4" />
              {token ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
          {publicUrl && (
            <div className="flex flex-wrap items-center gap-3">
              {qr && <img src={qr} alt="QR code" className="h-24 w-24 border border-border" />}
              <div className="min-w-0">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 break-all text-xs text-[hsl(var(--link))] hover:underline">
                  <Link2 className="h-3.5 w-3.5 shrink-0" />{publicUrl}
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  Unpublishing revokes this link immediately.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <WorshipAidSheets aid={aid} qrDataUrl={qr} settings={settings} />
      </div>
    </div>
  );
}
