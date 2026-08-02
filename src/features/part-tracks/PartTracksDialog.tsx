// Director flow: upload source -> confirm parts -> attest rights -> generate.
// Content switches on the score's pipeline status; active states poll.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import * as api from './api';
import { AssignmentsPanel } from './AssignmentsPanel';
import { canGenerate } from './canGenerate';
import { PartMappingTable } from './PartMappingTable';
import { createListenTracker, type ListenTracker } from './player/listenTracker';
import { PartTrackPlayer } from './player/PartTrackPlayer';
import { useMyVoicePart } from './player/useMyVoicePart';
import { RendersList } from './RendersList';
import { RightsAttestation } from './RightsAttestation';
import type { PartTrackPart, PartTrackSourceType } from './types';
import { usePartTrackScore } from './usePartTrackScore';

const ACCEPT = '.xml,.musicxml,.mxl,.mid,.midi,.pdf';

function sourceTypeFromName(name: string): PartTrackSourceType {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf_omr';
  if (lower.endsWith('.mid') || lower.endsWith('.midi')) return 'midi';
  if (lower.endsWith('.mxl')) return 'mxl';
  return 'musicxml';
}

interface Props {
  sheetMusicId: string;
  sheetMusicTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfSource?: api.AttachedPdfSource | null;
}

export function PartTracksDialog({ sheetMusicId, sheetMusicTitle, open, onOpenChange, pdfSource }: Props) {
  const attachedPdfAvailable = api.hasAttachedPdf(pdfSource);
  const { user } = useAuth();
  const { toast } = useToast();
  const { score, parts, rights, renders, loading, refresh } = usePartTrackScore(sheetMusicId, open);
  const myVoicePart = useMyVoicePart(user?.id);
  const { isAdmin } = useUserRole();
  const trackerRef = useRef<ListenTracker | null>(null);

  const scoreId = score?.id;
  const scoreReady = score?.status === 'ready';
  useEffect(() => {
    if (!open || !user || !scoreId || !scoreReady) return;
    const uid = user.id;
    const tracker = createListenTracker({
      // Telemetry must never break playback — swallow flush failures.
      flush: (batch) => { void api.recordListen(scoreId, uid, batch).catch(() => undefined); },
    });
    trackerRef.current = tracker;
    const onVis = () => {
      if (document.visibilityState === 'hidden') tracker.stop();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      tracker.dispose();
      trackerRef.current = null;
    };
  }, [open, user, scoreId, scoreReady]);

  const handleListenState = useCallback((playing: boolean, featuredRole: string | null, tempoPct: number) => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    if (playing) tracker.start(featuredRole, tempoPct);
    else tracker.stop();
  }, []);

  const handleDownload = useCallback((render: { part_role: string | null }) => {
    if (!user || !scoreId) return;
    void api.logDownload(scoreId, user.id, render.part_role, null).catch(() => undefined);
  }, [user, scoreId]);
  const [draftParts, setDraftParts] = useState<PartTrackPart[]>([]);
  const [warningsAcked, setWarningsAcked] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftParts(parts);
  }, [parts]);

  const upload = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      await api.createScore(sheetMusicId, file, sourceTypeFromName(file.name), user.id);
      await refresh();
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Could not read that file.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const importAttachedPdf = async () => {
    if (!user || !pdfSource) return;
    setBusy(true);
    try {
      await api.createScoreFromAttachedPdf(sheetMusicId, pdfSource, user.id);
      await refresh();
    } catch (e) {
      toast({
        title: 'Could not use the attached PDF',
        description: e instanceof Error ? e.message : 'Try uploading the file instead.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!score) return;
    setBusy(true);
    try {
      await api.updateParts(draftParts.map(({ id, role, label, include }) => ({ id, role, label, include })));
      await api.enqueueRender(score.id);
      await refresh();
    } catch (e) {
      toast({
        title: 'Could not start generation',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (!score) return;
    setBusy(true);
    try {
      await api.retryAnalyze(score.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const gate = score
    ? canGenerate({ ...score }, draftParts.map((p) => ({ ...p, confirmed: true })), rights, warningsAcked)
    : { ok: false, reason: null };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Part Tracks — {sheetMusicTitle}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-2">
          {loading && !score && (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}

          {!loading && !score && (
            <div className="py-6 text-center space-y-3">
              <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm">
                Upload the score as MusicXML (.xml, .mxl), MIDI, or a PDF to generate practice tracks.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
              />
              <div className="flex items-center justify-center gap-2">
                {attachedPdfAvailable && (
                  <Button size="sm" disabled={busy} onClick={() => void importAttachedPdf()}>
                    {busy ? 'Reading…' : 'Use the attached PDF (beta)'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={attachedPdfAvailable ? 'outline' : 'default'}
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                >
                  {busy ? 'Uploading…' : 'Choose file'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                PDF reading is beta — clean, engraved octavos work best, and you&apos;ll confirm
                every part before anything is generated. MusicXML is always the most accurate.
              </p>
            </div>
          )}

          {score && (score.status === 'queued' || score.status === 'analyzing') && (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {score.source_type === 'pdf_omr'
                ? 'Reading the PDF… this takes a few minutes for a full octavo.'
                : 'Reading the score… usually under a minute.'}
            </div>
          )}

          {score && score.status === 'awaiting_confirmation' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">
                  We found {draftParts.length} part{draftParts.length === 1 ? '' : 's'} — confirm the mapping
                </p>
                <PartMappingTable parts={draftParts} onChange={setDraftParts} />
              </div>

              {score.validation_report.length > 0 && (
                <div className="space-y-2">
                  {score.validation_report.map((w) => (
                    <Alert key={w.code} variant="default">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription className="text-xs">{w.message}</AlertDescription>
                    </Alert>
                  ))}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pt-warnings-ack"
                      checked={warningsAcked}
                      onCheckedChange={(v) => setWarningsAcked(v === true)}
                    />
                    <Label htmlFor="pt-warnings-ack" className="text-xs font-normal">
                      I&apos;ve reviewed the warnings
                    </Label>
                  </div>
                </div>
              )}

              <RightsAttestation scoreId={score.id} rights={rights} onAttested={() => void refresh()} />

              <div className="space-y-1">
                <Button size="sm" disabled={!gate.ok || busy} onClick={() => void generate()}>
                  {busy ? 'Starting…' : 'Generate part tracks'}
                </Button>
                {!gate.ok && gate.reason && (
                  <p className="text-xs text-muted-foreground">{gate.reason}</p>
                )}
              </div>
            </div>
          )}

          {score && score.status === 'rendering' && (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Rendering stems and mixes… this can take a few minutes.
            </div>
          )}

          {score && score.status === 'ready' && score.manifest && (
            <Tabs defaultValue="practice">
              {isAdmin() && (
                <TabsList className="mb-3">
                  <TabsTrigger value="practice" className="text-sm">Practice</TabsTrigger>
                  <TabsTrigger value="assignments" className="text-sm">Assignments</TabsTrigger>
                </TabsList>
              )}
              <TabsContent value="practice" className="space-y-5">
                <PartTrackPlayer
                  score={score}
                  renders={renders}
                  myVoicePart={myVoicePart}
                  onListenStateChange={handleListenState}
                />
                <details>
                  <summary className="text-sm font-medium cursor-pointer">Downloads</summary>
                  <div className="mt-2">
                    <RendersList renders={renders.filter((r) => r.kind === 'mix')} onDownload={handleDownload} />
                  </div>
                </details>
              </TabsContent>
              {isAdmin() && (
                <TabsContent value="assignments">
                  <AssignmentsPanel scoreId={score.id} parts={parts} />
                </TabsContent>
              )}
            </Tabs>
          )}
          {score && score.status === 'ready' && !score.manifest && <RendersList renders={renders} />}

          {score && score.status === 'failed' && (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  {score.error_message ?? 'Something went wrong reading this score.'}
                </AlertDescription>
              </Alert>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void retry()}>
                Try again
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
