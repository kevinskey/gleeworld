import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import {
  ArrowLeft, Image as ImageIcon, Link2, Loader2, Printer, QrCode, Save, X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { uploadFileAndGetUrl } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { PageTitle } from '@/components/dashboard/DashboardPageShell';
import { WorshipAidSheets } from '@/components/liturgy/WorshipAidSheets';
import {
  buildWorshipAid, coverImageScale, coverTitleSize, COVER_IMAGE_MAX, COVER_IMAGE_MIN,
  COVER_TITLE_MAX, COVER_TITLE_MIN, DEFAULT_SETTINGS, panelSpacing, SPACING_MAX, SPACING_MIN,
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

type Row = AidSource & {
  id: string; psalm_title: string | null; worship_aid: unknown; share_token: string | null;
};

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
  const [uploading, setUploading] = useState<PanelId | 'cover' | null>(null);
  const uploadTarget = useRef<PanelId | 'cover'>('cover');
  // Read inside the upload callback so a slider moved mid-upload is not lost.
  const settingsRef = useRef(settings); settingsRef.current = settings;
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

  /**
   * Find the engraved psalm for this Mass, for plans composed before the
   * composer started recording it directly.
   *
   * Matching is done HERE rather than in the query, and against the plan's
   * sung-setting title first. The old version filtered on the citation
   * server-side and missed the common case: the composer titles a score from
   * the citation at the moment it is saved, so a Sunday whose responsorial is
   * the Jeremiah canticle produces a score called "Jeremiah 31:10-12,13"
   * while the plan's citation field still reads "Psalm 84(85):9-14" — two
   * strings for one piece of music, and no overlap to match on.
   *
   * psalm_title is the reliable link, because saving the setting writes it.
   * The citation is only a fallback for a score titled by hand.
   */
  useEffect(() => {
    const stored = (row?.worship_aid as { psalmImageUrl?: string } | null)?.psalmImageUrl;
    if (stored) { setPsalmImage(stored); return; }
    if (!row) return;
    (async () => {
      const { data } = await supabase
        .from('gw_sheet_music')
        .select('title, thumbnail_url, created_at')
        .contains('tags', ['responsorial-psalm'])
        .not('thumbnail_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      const rows = (data ?? []) as Array<{ title: string; thumbnail_url: string }>;
      if (rows.length === 0) return;

      const norm = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();
      const wanted = [row.psalm_title, row.responsorial_psalm]
        .map((v) => norm(v ?? ''))
        .filter(Boolean);

      const match = rows.find((r) => wanted.some((w) => norm(r.title).includes(w) || w.includes(norm(r.title))))
        // Nothing matched by name: the newest psalm setting in this tenant is
        // a better guess than printing no music at all, and the user can see
        // on the preview whether it is the right one.
        ?? rows[0];
      if (match?.thumbnail_url) setPsalmImage(match.thumbnail_url);
    })();
  }, [row]);

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

  /** The single writer. Both the Save button and an image upload go through
   *  it, so they cannot drift into saving different shapes. */
  const persist = useCallback(async (value: WorshipAidSettings) => {
    const { error } = await supabase
      .from('gw_liturgy_masses')
      .update({ worship_aid: value as unknown as Record<string, unknown> })
      .eq('id', id!);
    if (error) { toast.error(error.message); return false; }
    return true;
  }, [id]);

  const save = async () => {
    setSaving(true);
    const ok = await persist(settings);
    setSaving(false);
    if (ok) toast.success('Worship aid saved.');
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

  /**
   * Add an image to the aid.
   *
   * Goes through uploadFileAndGetUrl rather than supabase.storage.upload
   * directly. This droplet's storage writes objects to a versioned, prefixed
   * key while the public proxy reads a flat one, and a daemon flattens the
   * two a couple of seconds later. An upload therefore SUCCEEDS while its
   * public URL still 403s — so the previous version handed an <img> a URL
   * that was not live yet, the image failed to load, and it never retried.
   * That is why the cover looked broken while the file was sitting in the
   * bucket perfectly intact. The helper waits for the URL to become
   * reachable, and deletes the orphan if it never does.
   *
   * The result is SAVED immediately rather than left for the Save button.
   * Uploading a picture is already a deliberate act; making it depend on a
   * second, easily-missed step is how a cover ends up in storage with a null
   * in the record — which is exactly what happened.
   */
  const upload = useCallback(async (file: File) => {
    if (!id) return;
    const target = uploadTarget.current;
    setUploading(target);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      // Timestamped rather than fixed: a fixed name would need an overwrite,
      // and storage UPDATE is owner-only — a second person editing the same
      // plan could not replace an image the first had added.
      const result = await uploadFileAndGetUrl(
        file, BUCKET, `liturgy/${id}`, `aid-${target}-${Date.now()}.${ext}`,
      );
      if (!result) {
        toast.error("The image uploaded but never became readable. That's usually a storage hiccup — try again.");
        return;
      }
      const next: WorshipAidSettings = target === 'cover'
        ? { ...settingsRef.current, coverImageUrl: result.url }
        : { ...settingsRef.current, images: { ...settingsRef.current.images, [target]: result.url } };
      setSettings(next);
      await persist(next);
      toast.success('Image added.');
    } finally {
      setUploading(null);
    }
  }, [id, persist]);

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
            {/* The cover's two elements size against each other: a long parish
                name wants smaller type, and a mark with the season already
                lettered into it wants a big picture and a small title. */}
            <div className="flex flex-wrap items-center gap-4 border border-border p-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Title size
                <input
                  type="range"
                  min={COVER_TITLE_MIN} max={COVER_TITLE_MAX} step={0.5}
                  value={coverTitleSize(settings)}
                  onChange={(e) => patch({ coverTitleSize: Number(e.target.value) })}
                  aria-label="Cover title size"
                  className="w-32"
                />
                <span className="w-12 tabular-nums">{coverTitleSize(settings).toFixed(1)}pt</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Picture size
                <input
                  type="range"
                  min={COVER_IMAGE_MIN} max={COVER_IMAGE_MAX} step={0.01}
                  value={coverImageScale(settings)}
                  onChange={(e) => patch({ coverImageScale: Number(e.target.value) })}
                  aria-label="Cover picture size"
                  className="w-32"
                />
                <span className="w-12 tabular-nums">{Math.round(coverImageScale(settings) * 100)}%</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={uploading !== null}
                onClick={() => pickImage('cover')}>
                {uploading === 'cover'
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <ImageIcon className="mr-1.5 h-4 w-4" />}
                {uploading === 'cover' ? 'Uploading…' : settings.coverImageUrl ? 'Replace cover image' : 'Cover image'}
              </Button>
              {settings.coverImageUrl && (
                <>
                  <img src={settings.coverImageUrl} alt="" className="h-10 w-10 border border-border object-contain" />
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => {
                      const next = { ...settingsRef.current, coverImageUrl: null };
                      setSettings(next); void persist(next);
                    }} className="text-destructive">
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
                  <Button type="button" variant="outline" size="sm" disabled={uploading !== null}
                    onClick={() => pickImage(p)}>
                    {uploading === p
                      ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      : <ImageIcon className="mr-1.5 h-4 w-4" />}
                    {uploading === p ? 'Uploading…' : img ? 'Replace' : 'Add image'}
                  </Button>
                  {img && (
                    <>
                      <img src={img} alt="" className="h-10 w-10 border border-border object-contain" />
                      <Button type="button" variant="ghost" size="sm" className="text-destructive"
                        onClick={() => {
                          const next = {
                            ...settingsRef.current,
                            images: { ...settingsRef.current.images, [p]: null },
                          };
                          setSettings(next); void persist(next);
                        }}>
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
