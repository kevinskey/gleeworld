// QR Attendance add-on — generate a short-lived code students scan or
// enter to mark themselves present for today's session. Persists to
// gw_attendance_qr_codes (existing table, context_type='course').

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, RefreshCw, Loader2, Copy, Check } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Props { courseId: string; canEdit: boolean; }

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

function randomCode(): string {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export default function QRAttendanceAddon({ courseId, canEdit }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [studentCode, setStudentCode] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  // Latest active code for this course.
  const { data: activeCode } = useQuery({
    queryKey: ['attendance-qr', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_attendance_qr_codes')
        .select('id, qr_token, generated_at, expires_at, is_active, scan_count')
        .eq('context_type', 'course')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      // Deactivate prior codes for this context (best-effort).
      await supabase
        .from('gw_attendance_qr_codes')
        .update({ is_active: false })
        .eq('context_type', 'course')
        .eq('is_active', true);

      const token = randomCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('gw_attendance_qr_codes')
        .insert({
          qr_token: token,
          context_type: 'course',
          generated_by: user?.id,
          generated_at: new Date().toISOString(),
          expires_at: expiresAt,
          is_active: true,
          scan_count: 0,
          max_scans: 200,
          location_data: { course_id: courseId },
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-qr', courseId] }),
    onError: (e: any) => toast.error(e?.message || 'Failed.'),
  });

  async function checkIn() {
    if (!studentCode.trim() || !user) return;
    setCheckingIn(true);
    try {
      const { data: code } = await supabase
        .from('gw_attendance_qr_codes')
        .select('id, expires_at, is_active, location_data')
        .eq('qr_token', studentCode.trim().toUpperCase())
        .eq('context_type', 'course')
        .maybeSingle();
      if (!code || !code.is_active || new Date(code.expires_at) < new Date()) {
        throw new Error('Code expired or invalid.');
      }
      const codeCourseId = (code.location_data as any)?.course_id;
      if (codeCourseId !== courseId) throw new Error('Code is for a different class.');

      // Record attendance
      const { error: attErr } = await supabase
        .from('gw_course_attendance')
        .upsert({
          course_id: courseId,
          user_id: user.id,
          session_date: new Date().toISOString().slice(0, 10),
          status: 'present',
        }, { onConflict: 'course_id,user_id,session_date' });
      if (attErr) throw attErr;

      // Bump scan_count
      await supabase
        .from('gw_attendance_qr_codes')
        .update({ scan_count: ((activeCode as any)?.scan_count || 0) + 1 })
        .eq('id', code.id);

      toast.success('Checked in. ✓');
      setStudentCode('');
    } catch (e: any) {
      toast.error(e?.message || 'Check-in failed.');
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 inline-flex items-center justify-center">
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold">QR check-in</h2>
          <p className="text-xs text-muted-foreground">{canEdit ? 'Generate a 15-minute code students enter to mark themselves present.' : 'Enter the code your instructor gave you to mark yourself present.'}</p>
        </div>
      </div>

      {canEdit ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-6 text-center space-y-3">
            {activeCode ? (
              <>
                <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Active code</div>
                <div className="text-5xl font-mono font-bold tracking-wider">{(activeCode as any).qr_token}</div>
                <div className="text-xs text-muted-foreground">
                  Expires {formatDistanceToNow(new Date((activeCode as any).expires_at), { addSuffix: true })}
                  {' · '}
                  {(activeCode as any).scan_count || 0} check-in{((activeCode as any).scan_count || 0) === 1 ? '' : 's'}
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText((activeCode as any).qr_token); toast.success('Copied.'); }}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                  </Button>
                  <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> New code
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No active code yet.</p>
                <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
                  {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <QrCode className="w-4 h-4 mr-1.5" />}
                  Generate code
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-6 space-y-3">
            <Label className="text-xs">Enter the 6-letter code</Label>
            <div className="flex items-center gap-2">
              <Input
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="font-mono uppercase text-lg tracking-widest text-center"
              />
              <Button onClick={checkIn} disabled={checkingIn || !studentCode.trim()}>
                {checkingIn ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                Check in
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
