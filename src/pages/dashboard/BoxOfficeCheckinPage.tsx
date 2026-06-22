// Box Office door check-in.
//
// Usher opens this page on their phone; camera reads QR codes from
// buyer's /tickets pages. Each scan POSTs to box-office-checkin, which
// HMAC-verifies the token, flips the ticket to 'redeemed', and inserts
// a checkins row. We render a big green/red banner for the usher and
// keep a scrolling log of recent scans.
//
// A typed-input fallback covers the case where a buyer's screen is too
// dim / cracked / etc. to scan — the usher can read aloud the QR's
// printed text or the buyer can DM it.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QrScanner from 'qr-scanner';
import {
  ArrowLeft, Camera, CameraOff, CheckCircle2, AlertTriangle,
  Loader2, Type, Ticket,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getBoxOfficeEvent, listTicketTiers } from '@/lib/boxOffice/api';

type CheckinResult =
  | { result: 'ok'; message: string; ticket_id: string; holder_name: string | null; tier_name: string; event_title: string }
  | { result: 'already_redeemed'; message: string; redeemed_at?: string; holder_name?: string | null }
  | { result: 'invalid_signature'; message: string }
  | { result: 'not_found'; message: string }
  | { result: 'wrong_event'; message: string }
  | { result: 'void'; message: string };

interface LogEntry {
  at: number;
  status: CheckinResult['result'];
  label: string;
  holder?: string | null;
}

export default function BoxOfficeCheckinPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lastSeenTokenRef = useRef<{ token: string; at: number } | null>(null);

  const [scanning, setScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<CheckinResult | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [manual, setManual] = useState('');

  const { data: event } = useQuery({
    queryKey: ['box_office_event', eventId],
    enabled: !!eventId,
    queryFn: () => getBoxOfficeEvent(eventId!),
  });
  const { data: tiers = [] } = useQuery({
    queryKey: ['box_office_tiers', eventId],
    enabled: !!eventId,
    queryFn: () => listTicketTiers(eventId!),
  });
  const totalSold = tiers.reduce((s, t) => s + (t.quantity_sold ?? 0), 0);
  // Count of redeemed tickets for this event — refetched after each scan.
  const { data: redeemed = 0, refetch: refetchRedeemed } = useQuery({
    queryKey: ['box_office_redeemed_count', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('gw_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId!)
        .eq('status', 'redeemed');
      if (error) return 0;
      return count ?? 0;
    },
  });

  useEffect(() => {
    QrScanner.hasCamera().then(setHasCamera).catch(() => setHasCamera(false));
    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToken = async (rawToken: string) => {
    const token = rawToken.trim();
    if (!token) return;
    // Debounce: the camera fires the same code many times per second.
    const now = Date.now();
    if (lastSeenTokenRef.current && lastSeenTokenRef.current.token === token && now - lastSeenTokenRef.current.at < 3000) {
      return;
    }
    lastSeenTokenRef.current = { token, at: now };
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('box-office-checkin', {
        body: { token, event_id: eventId },
      });
      if (error) throw new Error(error.message || 'check-in failed');
      const result = data as CheckinResult;
      setLast(result);
      const label =
        result.result === 'ok'               ? `✓ ${result.holder_name || 'Guest'} · ${result.tier_name}` :
        result.result === 'already_redeemed' ? `↻ Already in${result.holder_name ? ' · ' + result.holder_name : ''}` :
        result.result === 'invalid_signature'? '✗ Bad QR' :
        result.result === 'not_found'        ? '✗ Unknown ticket' :
        result.result === 'wrong_event'      ? '✗ Wrong event' :
        result.result === 'void'             ? '✗ Voided' :
                                               '✗ Error';
      setLog((prev) => [{ at: now, status: result.result, label, holder: 'holder_name' in result ? result.holder_name ?? null : null }, ...prev].slice(0, 25));
      if (result.result === 'ok') refetchRedeemed();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'check-in failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const startScanner = async () => {
    if (!videoRef.current) return;
    try {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => { void handleToken(result.data); },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
        },
      );
      scannerRef.current = scanner;
      await scanner.start();
      setScanning(true);
    } catch (err) {
      console.error('[checkin] camera start failed', err);
      toast.error('Could not access camera. Check Safari → Settings → Camera.');
    }
  };

  const stopScanner = () => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setScanning(false);
  };

  const onManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleToken(manual);
    setManual('');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/dashboard/box-office/event/${eventId}`}><ArrowLeft className="w-4 h-4 mr-1.5" /> Event</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/dashboard/box-office/event/${eventId}/willcall`}>Will-call</Link>
          </Button>
          <div className="text-sm text-muted-foreground tabular-nums">
            {redeemed} / {totalSold} checked in
          </div>
        </div>
      </div>

      <header className="space-y-0.5">
        <div className="flex items-center gap-2 text-rose-700">
          <Ticket className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
            Door check-in
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{event?.title ?? 'Event'}</h1>
      </header>

      {/* Last result — big banner so it's readable across a noisy lobby. */}
      <ResultBanner last={last} busy={busy} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4" /> Scanner
          </CardTitle>
          <CardDescription>
            Point the camera at the QR code on the buyer's screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasCamera === false ? (
            <p className="text-sm text-muted-foreground italic">
              No camera detected. Use manual entry below.
            </p>
          ) : (
            <div className="relative aspect-square w-full max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Button onClick={startScanner}><Camera className="w-4 h-4 mr-1.5" /> Start scanner</Button>
                </div>
              )}
            </div>
          )}
          {scanning && (
            <div className="flex justify-center pt-3">
              <Button variant="outline" size="sm" onClick={stopScanner}>
                <CameraOff className="w-4 h-4 mr-1.5" /> Stop
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="w-4 h-4" /> Manual entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onManualSubmit} className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="manual" className="sr-only">Ticket token</Label>
              <Input id="manual" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="ticket-id.signature" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            </div>
            <Button type="submit" disabled={busy || !manual.trim()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check in'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {log.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent scans</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {log.map((entry) => (
                <li key={entry.at} className="py-2 flex items-center justify-between gap-2">
                  <span className={
                    entry.status === 'ok' ? 'text-emerald-700' :
                    entry.status === 'already_redeemed' ? 'text-amber-700' :
                    'text-rose-700'
                  }>{entry.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(entry.at).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultBanner({ last, busy }: { last: CheckinResult | null; busy: boolean }) {
  if (busy) {
    return (
      <Card className="border-2 border-muted">
        <CardContent className="py-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Checking…</p>
        </CardContent>
      </Card>
    );
  }
  if (!last) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground italic">
          Waiting for a ticket.
        </CardContent>
      </Card>
    );
  }
  if (last.result === 'ok') {
    return (
      <Card className="border-2 border-emerald-500 bg-emerald-50">
        <CardContent className="py-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
          <div className="text-2xl font-bold text-emerald-800 mt-1">Welcome in</div>
          {last.holder_name && <div className="text-lg text-emerald-800 mt-1">{last.holder_name}</div>}
          <div className="text-sm text-emerald-700">{last.tier_name}</div>
        </CardContent>
      </Card>
    );
  }
  if (last.result === 'already_redeemed') {
    return (
      <Card className="border-2 border-amber-500 bg-amber-50">
        <CardContent className="py-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-700 mx-auto" />
          <div className="text-2xl font-bold text-amber-800 mt-1">Already scanned</div>
          {last.holder_name && <div className="text-base text-amber-700 mt-1">{last.holder_name}</div>}
          {last.redeemed_at && (
            <div className="text-xs text-amber-700 mt-1">
              {new Date(last.redeemed_at).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-2 border-rose-500 bg-rose-50">
      <CardContent className="py-6 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-700 mx-auto" />
        <div className="text-2xl font-bold text-rose-800 mt-1">
          {last.result === 'invalid_signature' ? 'Invalid QR' :
           last.result === 'not_found'        ? 'Unknown ticket' :
           last.result === 'wrong_event'      ? 'Wrong event' :
           last.result === 'void'             ? 'Voided' :
                                                'Error'}
        </div>
        <div className="text-sm text-rose-700 mt-1">{last.message}</div>
      </CardContent>
    </Card>
  );
}
