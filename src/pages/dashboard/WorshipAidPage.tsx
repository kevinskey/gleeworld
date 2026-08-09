import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, FileDown, Image as ImageIcon, Link2,
  Loader2, Plus, Printer, QrCode, RotateCcw, Save, Trash2, X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { uploadFileAndGetUrl } from '@/utils/storage';
import { worshipAidToPdf, worshipAidFileName } from '@/lib/liturgy/worshipAidPdf';
import {
  applyPanelEdits, reorderKeys,
  type AidEditsByPanel, type PanelEdits,
} from '@/lib/liturgy/aidEdits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageTitle } from '@/components/dashboard/DashboardPageShell';
import { WorshipAidSheets } from '@/components/liturgy/WorshipAidSheets';
import { AidStage } from '@/components/liturgy/aid-editor/AidStage';
import { AidControlRail } from '@/components/liturgy/aid-editor/AidControlRail';
import { withFullView, AID_VIEW_ATTR, PANEL_LABEL } from '@/components/liturgy/aid-editor/aidView';
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
  const [filing, setFiling] = useState(false);
  /** How the content paginated, and whether any of it has nowhere to go. */
  const [flow, setFlow] = useState<{ overflowLines: number; dropped: number }>(
    { overflowLines: 0, dropped: 0 },
  );
  /** Which panel the edit list is showing. */
  const [editPanel, setEditPanel] = useState<PanelId>('insideLeft');
  /** Below `lg` the rail is a drawer; this is its open state. */
  const [railOpen, setRailOpen] = useState(false);
  // Same 1024px breakpoint as the `lg:` classes elsewhere on this page.
  // Driving the rail/drawer split from JS, not CSS, means only one
  // AidControlRail is ever mounted at a time — with two mounted at once
  // (desktop rail CSS-hidden but still in the DOM, plus an open drawer) the
  // Cover/Notices fields would carry duplicate ids and the shared file input
  // could bind to either one.
  const isMobile = useIsMobile();
  const sheetsRef = useRef<HTMLDivElement>(null);
  const uploadTarget = useRef<PanelId | 'cover'>('cover');
  // Read inside the upload callback so a slider moved mid-upload is not lost.
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Crossing up past `lg` closes the drawer by dropping `open` to false
   * without Radix ever firing `onOpenChange`, so `railOpen` would stay true
   * forever. Rotating an iPad back to portrait (1194 → 834) then re-satisfies
   * `isMobile && railOpen` and the drawer springs open over the sheet with no
   * user action. Clear the state at the same moment the drawer stops being
   * the rail, so reopening is always something the user asked for.
   */
  useEffect(() => {
    if (!isMobile) setRailOpen(false);
  }, [isMobile]);

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

  /**
   * File the program in the Media Library, under Documents / Worship Aids.
   *
   * An ARCHIVE copy, not the one to hand out: Print produces real vector type
   * at the printer's resolution, which is sharper than any rasterisation.
   * This is what makes a program findable next year, or mailable to a cantor
   * who was not there.
   */
  const fileToLibrary = async () => {
    if (!sheetsRef.current || !row) return;
    setFiling(true);
    try {
      // Focus mode hides three of the four panels and scales the fourth.
      // html2canvas honours both, so the capture must run with the full,
      // unscaled sheet visible — otherwise the archived PDF silently files
      // as a one-panel document. withFullView finds the wrapper carrying
      // AID_VIEW_ATTR (the same node sheetsRef points at) and restores the
      // previous view afterwards even if the capture throws.
      const { blob, pages } = await withFullView(
        sheetsRef.current?.closest<HTMLElement>(`[${AID_VIEW_ATTR}]`) ?? null,
        () => worshipAidToPdf(sheetsRef.current!),
      );
      const name = worshipAidFileName(row.observation ?? '', row.mass_date);
      const file = new File([blob], name, { type: 'application/pdf' });

      // Through the helper, which waits for the URL to be readable — this
      // droplet's storage serves a fresh upload as 403 for a second or two.
      const result = await uploadFileAndGetUrl(file, 'media-library', 'worship-aids', name);
      if (!result) {
        toast.error("The PDF uploaded but never became readable. Try again.");
        return;
      }

      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('gw_media_library').insert({
        title: `${row.observation || 'Worship Aid'} — ${row.mass_date}`,
        description: `Worship aid, ${pages} printed sides.`,
        file_url: result.url,
        file_path: result.path,
        file_type: 'application/pdf',
        file_size: blob.size,
        // Documents is derived from file_type, so a PDF lands there on its
        // own; the folder is what groups the programs together.
        folder: 'Worship Aids',
        category: 'general',
        tags: ['worship-aid', 'liturgy'],
        uploaded_by: auth?.user?.id ?? null,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Filed under Documents → Worship Aids.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not build the PDF.');
    } finally {
      setFiling(false);
    }
  };

  const edits: AidEditsByPanel = (settings.edits ?? {}) as AidEditsByPanel;

  const patchPanel = (panel: PanelId, change: (cur: PanelEdits) => PanelEdits) => {
    const cur = edits[panel] ?? {};
    patch({ edits: { ...edits, [panel]: change(cur) } as Record<string, unknown> });
  };

  /** The blocks as the panel will actually print them. */
  const panelBlocks = (panel: PanelId) => {
    if (!aid) return [];
    const source = panel === 'insideLeft' ? aid.insideLeft
      : panel === 'insideRight' ? aid.insideRight
      : panel === 'back' ? aid.back : [];
    return applyPanelEdits(source, edits[panel]);
  };

  const move = (panel: PanelId, key: string, dir: -1 | 1) => {
    const order = (edits[panel]?.order?.length ? edits[panel]!.order! : panelBlocks(panel).map((b) => b.key));
    patchPanel(panel, (cur) => ({ ...cur, order: reorderKeys(order, key, dir) }));
  };

  const hide = (panel: PanelId, key: string) =>
    patchPanel(panel, (cur) => ({ ...cur, hidden: [...(cur.hidden ?? []), key] }));

  const restore = (panel: PanelId, key: string) =>
    patchPanel(panel, (cur) => ({ ...cur, hidden: (cur.hidden ?? []).filter((k) => k !== key) }));

  const removeInsert = (panel: PanelId, id: string) =>
    patchPanel(panel, (cur) => ({
      ...cur,
      inserts: (cur.inserts ?? []).filter((b) => b.id !== id),
      order: (cur.order ?? []).filter((k) => k !== id),
    }));

  const setGap = (panel: PanelId, key: string, inches: number) =>
    patchPanel(panel, (cur) => ({ ...cur, gaps: { ...(cur.gaps ?? {}), [key]: inches } }));

  const setText = (panel: PanelId, key: string, field: 'label' | 'title' | 'credit' | 'summary', value: string) =>
    patchPanel(panel, (cur) => ({
      ...cur,
      text: { ...(cur.text ?? {}), [key]: { ...(cur.text?.[key] ?? {}), [field]: value } },
    }));

  const insert = (panel: PanelId, kind: 'text' | 'score' | 'spacer') =>
    patchPanel(panel, (cur) => ({
      ...cur,
      inserts: [
        ...(cur.inserts ?? []),
        kind === 'spacer'
          ? { id: crypto.randomUUID(), kind, height: 0.25 }
          : kind === 'score'
            ? { id: crypto.randomUUID(), kind, imageUrl: psalmImage ?? '' }
            : { id: crypto.randomUUID(), kind, text: 'New text' },
      ],
    }));

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!row || !aid) return <div className="p-8 text-sm">Mass plan not found.</div>;

  /**
   * Cover-only controls, shown by the rail under the cover fields when the
   * Cover panel is selected. This must NOT ride `blockList` — that slot is
   * not rendered on the Cover panel, so anything placed there would vanish
   * on Cover.
   *
   * The hidden file input itself is NOT here: `blockList`'s per-panel "Add
   * image" buttons need it too, and `coverExtras`/`blockList` are mutually
   * exclusive by construction (the rail renders one or the other, never
   * both). An input living inside either one would be absent — and its
   * trigger a silent no-op — whenever the other slot is showing. It is
   * rendered exactly once, below, as a page-level sibling of both rails.
   */
  const coverUpload = (
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
    </div>
  );

  /**
   * Interior-panel controls, shown by the rail whenever a non-Cover panel is
   * selected. Per-panel image + spacing applies to all three interior
   * panels at once (unchanged from before); the insert row and block list
   * below track whichever panel is currently focused (`editPanel`).
   */
  const blockList = (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Reorder, insert &amp; adjust spacing below — to change wording, just click the text on
        the page.
      </p>

      {/* Only the cover art is used every time (Kevin). The other slots are
          often empty, and how much air is left over changes with how many
          hymns and readings a Sunday has — so each panel carries its own
          image control AND its own spacing, to open a sparse panel out or
          tighten a full one. */}
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

      {/* Type directly on the pages in the stage. This is only for what
          cannot be done by typing — reordering, inserting, and spacing. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <h2 className="mr-2 text-sm font-semibold">Insert</h2>
        <Button type="button" size="sm" variant="secondary" onClick={() => insert(editPanel, 'text')}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Text
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => insert(editPanel, 'score')}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Score
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => insert(editPanel, 'spacer')}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Space
        </Button>
      </div>

      <ul className="space-y-1.5">
        {panelBlocks(editPanel).map((b, i, all) => (
          <li key={b.key} className="flex flex-wrap items-center gap-2 border border-border p-2">
            <div className="flex shrink-0 flex-col">
              <button type="button" aria-label="Move up" disabled={i === 0}
                onClick={() => move(editPanel, b.key, -1)}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label="Move down" disabled={i === all.length - 1}
                onClick={() => move(editPanel, b.key, 1)}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <Input
                value={b.entry.label ?? ''}
                onChange={(e) => setText(editPanel, b.key, 'label', e.target.value)}
                placeholder={b.inserted ? 'Heading (optional)' : 'Heading'}
                className="h-8 text-xs font-semibold"
              />
              {(b.entry.title != null || b.inserted) && b.entry.imageUrl == null && (
                <Input
                  value={b.entry.title ?? b.entry.summary ?? ''}
                  onChange={(e) => setText(editPanel, b.key,
                    b.entry.summary != null && b.entry.title == null ? 'summary' : 'title',
                    e.target.value)}
                  placeholder="Text"
                  className="h-8 text-xs"
                />
              )}
              {b.entry.imageUrl && (
                <span className="block truncate text-[11px] text-muted-foreground">
                  Score image
                </span>
              )}
            </div>

            <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              Space after
              <input
                type="range" min={0} max={1.5} step={0.05}
                value={b.gapAfter}
                onChange={(e) => setGap(editPanel, b.key, Number(e.target.value))}
                aria-label={`Space after ${b.entry.label || 'block'}`}
                className="w-20"
              />
              <span className="w-9 tabular-nums">{b.gapAfter.toFixed(2)}″</span>
            </label>

            <Button
              type="button" size="sm" variant="ghost" className="shrink-0 text-destructive"
              onClick={() => (b.inserted ? removeInsert(editPanel, b.key) : hide(editPanel, b.key))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>

      {/* Removed entries stay recoverable: hiding is a diff against the
          plan, so nothing is actually lost. */}
      {(edits[editPanel]?.hidden ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">Removed:</span>
          {(edits[editPanel]?.hidden ?? []).map((k) => (
            <Button key={k} type="button" size="sm" variant="outline" className="text-xs"
              onClick={() => restore(editPanel, k)}>
              <RotateCcw className="mr-1 h-3 w-3" /> {k}
            </Button>
          ))}
        </div>
      )}
    </div>
  );

  /** Rendered inside the rail's collapsed "Phone edition" section. */
  const phoneEdition = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Publishing puts a QR code on the printed cover. Anyone who scans it reads the
          program on their phone — no account, and only what the printed aid shows.
        </p>
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
    </div>
  );

  /**
   * `h-full`, not `h-[calc(100vh-...)]`. DashboardShell's `<main>` is a flex
   * item with a definite height, so `h-full` resolves against its content box
   * and sits inside its paddings at every breakpoint — with no constant to
   * get wrong. There is no single right constant to subtract: the topbar is
   * 3.5rem below `md` and 5rem above it, `<main>` adds `pt-3 sm:pt-4` plus a
   * `pb-[4rem+safe-area]` below `md` to clear the docked MobileBottomNav, the
   * TrialBanner's height is variable, and `100vh` is not `100dvh` in
   * WKWebView. Overshooting made the page column taller than its scroll
   * parent: the shell scrolled, and on phones the bottom bar that is the ONLY
   * way to open the controls slid under the docked nav.
   */
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* The one physical file input for both the cover-image upload and
          every per-panel "Add image" button. It must be mounted exactly
          once, independent of which panel or which rail (desktop vs.
          drawer) is currently showing — see the note on `coverUpload`. */}
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

      <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-2 print:hidden sm:px-6">
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
          <Button variant="outline" onClick={fileToLibrary} disabled={filing}>
            {filing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}
            {filing ? 'Filing…' : 'Save PDF to library'}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* The document cannot grow past four pages, so anything the flow
          could not place is reported rather than silently cut at the fold.
          Page-owned (not the stage's terse sticky badge) so the full
          explanation is available at every viewport, not just the ones
          where the badge's tooltip would be discoverable. */}
      {flow.dropped > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-y border-destructive/40 bg-destructive/5 px-4 py-2 text-xs print:hidden sm:px-6">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p className="min-w-0 flex-1">
            <span className="font-semibold text-destructive">
              {flow.dropped} {flow.dropped === 1 ? 'item does' : 'items do'} not fit.
            </span>{' '}
            A worship aid is four pages and cannot grow — about{' '}
            {(flow.overflowLines * 0.16).toFixed(1)}″ of content has nowhere to go. Remove or
            shorten something, or reduce the space after an item.
          </p>
        </div>
      )}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(340px,380px)_1fr]">
        {!isMobile && (
          <div className="min-h-0 border-r border-border">
            <AidControlRail
              panel={editPanel}
              onPanelChange={setEditPanel}
              settings={settings}
              onSettingsPatch={patch}
              blockList={blockList}
              phoneEdition={phoneEdition}
              coverExtras={coverUpload}
            />
          </div>
        )}

        <AidStage
          focusPanel={editPanel}
          overflowLines={flow.overflowLines}
          dropped={flow.dropped}
          sheetsRef={sheetsRef}
        >
          <WorshipAidSheets
            aid={aid}
            qrDataUrl={qr}
            settings={settings}
            edits={edits}
            editable
            onEditBlock={(key, field, value) => {
              // The key identifies the block, but which PANEL owns it decides
              // where the edit is stored. Found rather than assumed, because a
              // reflowed block no longer prints on the panel it came from.
              const panel = (['insideLeft', 'insideRight', 'back'] as PanelId[])
                .find((p) => panelBlocks(p).some((b) => b.key === key));
              if (panel) setText(panel, key, field, value);
            }}
            onMoveBlock={(key, dir) => {
              // The owning panel is FOUND, not assumed: with the flow engine a
              // block can print on a page it did not come from, so its edits
              // still live with the panel that generated it.
              const panel = (['insideLeft', 'insideRight', 'back'] as PanelId[])
                .find((p) => panelBlocks(p).some((b) => b.key === key));
              if (panel) move(panel, key, dir);
            }}
            onSpaceBlock={(key, delta) => {
              const panel = (['insideLeft', 'insideRight', 'back'] as PanelId[])
                .find((p) => panelBlocks(p).some((b) => b.key === key));
              if (!panel) return;
              const cur = panelBlocks(panel).find((b) => b.key === key)?.gapAfter ?? 0;
              setGap(panel, key, Math.max(0, cur + delta));
            }}
            onDeleteBlock={(key) => {
              const panel = (['insideLeft', 'insideRight', 'back'] as PanelId[])
                .find((p) => panelBlocks(p).some((b) => b.key === key));
              if (!panel) return;
              const block = panelBlocks(panel).find((b) => b.key === key);
              if (block?.inserted) removeInsert(panel, key); else hide(panel, key);
            }}
            onFlow={(r) => setFlow((cur) => (
              cur.overflowLines === r.overflowLines && cur.dropped === r.dropped.length
                ? cur
                : { overflowLines: r.overflowLines, dropped: r.dropped.length }
            ))}
          />
        </AidStage>
      </div>

      {/* Narrow screens: the rail becomes a drawer.
          `relative z-10`: AidStage scales the focused panel with a CSS
          transform, which paints outside its own layout box and — because a
          transformed element forms a stacking context that paints above
          later, non-positioned in-flow siblings regardless of DOM order —
          that overflow rendered on top of this bar and swallowed its clicks
          (measured with Playwright at 834x1112: elementFromPoint on the
          trigger resolved to a `.worship-aid-block` inside the sheet, and a
          real `.click()` timed out). Giving this bar its own stacking
          context with a positive z-index puts it back above the sheet even
          if something still paints past AidStage's bounds. */}
      <div className="relative z-10 border-t border-border p-2 print:hidden lg:hidden">
        <Button variant="outline" className="w-full" onClick={() => setRailOpen(true)}>
          {PANEL_LABEL[editPanel]}
          {/* Either count can be zero while the other is not — content can be
              dropped outright without a partial line spilling — so each side
              is suppressed on its own rather than printing "0 over". */}
          {(flow.overflowLines > 0 || flow.dropped > 0) && (
            <span className="ml-2 text-xs text-destructive">
              {flow.overflowLines > 0 && `${flow.overflowLines} over`}
              {flow.overflowLines > 0 && flow.dropped > 0 && ' · '}
              {flow.dropped > 0 && `${flow.dropped} dropped`}
            </span>
          )}
        </Button>
      </div>
      {/* `open` is also gated on `isMobile`, not just `railOpen`: without
          that, resizing past `lg` while the drawer happened to be open
          would leave it mounted alongside the now-visible desktop rail —
          the exact duplicate-rail condition this split exists to prevent.
          The effect near the top of the component clears `railOpen` on the
          same transition, because closing this way never reaches
          `onOpenChange`.

          NON-MODAL on purpose (`modal={false}` + `hideOverlay`). A modal
          drawer dims the page 80%, traps pointer events and locks body
          scroll — which would mean the flagship non-desktop target, iPad
          portrait at 834px, could not see the panel it is editing while it
          edited it. Half height leaves the focused panel visible above the
          controls, so the drawer is a companion to the sheet rather than a
          round trip away from it. */}
      <Sheet open={isMobile && railOpen} onOpenChange={setRailOpen} modal={false}>
        <SheetContent side="bottom" hideOverlay className="h-[55vh] p-0">
          <SheetTitle className="sr-only">Aid controls</SheetTitle>
          {/* Clears the close button (absolute, top-3 right-3, up to 44px
              square) so it never sits on top of the panel-switcher row.
              `h-full` alongside the padding: AidControlRail's own `h-full`
              (needed for its internal overflow-y-auto to cap at the sheet's
              height rather than growing past it) resolves against this
              wrapper, so the wrapper needs a real height of its own, not
              just top padding. */}
          <div className="h-full pt-12">
            <AidControlRail
              panel={editPanel}
              onPanelChange={setEditPanel}
              settings={settings}
              onSettingsPatch={patch}
              blockList={blockList}
              phoneEdition={phoneEdition}
              coverExtras={coverUpload}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
