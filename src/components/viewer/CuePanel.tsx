import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Radio, Users, X, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CueRole } from '@/hooks/useCueCoordination';

interface CuePanelProps {
  role: CueRole;
  code: string | null;
  participants: number;
  lastError: string | null;
  onStartLeading: () => Promise<string>;
  onJoin: (code: string) => Promise<boolean>;
  onLeave: () => void;
}

export function CuePanel({
  role, code, participants, lastError, onStartLeading, onJoin, onLeave,
}: CuePanelProps) {
  const [joinCode, setJoinCode] = useState('');
  const [working, setWorking] = useState(false);

  const handleStart = async () => {
    setWorking(true);
    try { await onStartLeading(); }
    catch (e: any) { toast.error(e?.message ?? 'Could not start session'); }
    finally { setWorking(false); }
  };

  const handleJoin = async () => {
    setWorking(true);
    try {
      const ok = await onJoin(joinCode);
      if (!ok) toast.error(lastError ?? 'Could not join session');
      else setJoinCode('');
    } finally { setWorking(false); }
  };

  const copyCode = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); toast.success('Code copied'); } catch {}
  };

  if (role === 'leader' && code) {
    return (
      <div className="p-3 border rounded-lg bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary animate-pulse" />
          <div className="text-sm font-semibold">Leading session</div>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" /> {participants}
          </span>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Session code</div>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-2xl font-bold tracking-widest tabular-nums">{code}</code>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={copyCode} title="Copy code">
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Followers join from their Viewer's Cue panel.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onLeave} className="w-full">
          <X className="w-3.5 h-3.5 mr-1" /> End session
        </Button>
      </div>
    );
  }

  if (role === 'follower' && code) {
    return (
      <div className="p-3 border rounded-lg bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary animate-pulse" />
          <div className="text-sm font-semibold">Following session</div>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" /> {participants}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xl font-bold tracking-widest tabular-nums">{code}</code>
        </div>
        <p className="text-[11px] text-muted-foreground italic">
          Your page will turn automatically when the leader turns.
        </p>
        <Button size="sm" variant="outline" onClick={onLeave} className="w-full">
          <X className="w-3.5 h-3.5 mr-1" /> Leave session
        </Button>
      </div>
    );
  }

  // Idle: offer Lead or Join.
  return (
    <div className="space-y-3">
      <div className="p-3 border rounded-lg bg-card">
        <div className="text-sm font-semibold mb-1">Lead a session</div>
        <p className="text-xs text-muted-foreground mb-2">
          Generate a code and share it. Every follower's page turns when yours does.
        </p>
        <Button size="sm" onClick={handleStart} disabled={working} className="w-full">
          {working ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Radio className="w-4 h-4 mr-1" />}
          Lead session
        </Button>
      </div>
      <div className="p-3 border rounded-lg bg-card space-y-2">
        <div className="text-sm font-semibold">Follow a leader</div>
        <Input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="6-char code"
          maxLength={8}
          className={cn('text-center tracking-widest tabular-nums h-9', joinCode && 'font-bold')}
          onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
        />
        <Button size="sm" variant="outline" onClick={handleJoin} disabled={!joinCode.trim() || working} className="w-full">
          {working ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          Join
        </Button>
      </div>
    </div>
  );
}
