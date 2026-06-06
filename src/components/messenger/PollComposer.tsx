// Modal dialog to create a poll. Inserts a message_type='poll' row first,
// then gw_polls + gw_poll_options. Caller refetches messages on close.
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';

export function PollComposer({ groupId, userId, onClose }: { groupId: string; userId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [busy, setBusy] = useState(false);

  function update(i: number, v: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  }
  function addOpt() { if (options.length < 10) setOptions((p) => [...p, '']); }
  function removeOpt(i: number) {
    if (options.length > 2) setOptions((p) => p.filter((_, idx) => idx !== i));
  }

  async function create() {
    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOpts.length < 2) return;
    setBusy(true);
    try {
      // 1. Insert message
      const { data: msg, error: mErr } = await supabase.from('gw_group_messages').insert({
        group_id: groupId, user_id: userId, content: question.trim(), message_type: 'poll',
      }).select('id').single();
      if (mErr) throw mErr;

      // 2. Insert poll
      const { data: poll, error: pErr } = await supabase.from('gw_polls').insert({
        message_id: msg.id, question: question.trim(),
        created_by: userId, allow_multiple_selections: allowMultiple,
      }).select('id').single();
      if (pErr) throw pErr;

      // 3. Insert options
      const { error: oErr } = await supabase.from('gw_poll_options').insert(
        cleanOpts.map((text, i) => ({ poll_id: poll.id, option_text: text, display_order: i }))
      );
      if (oErr) throw oErr;

      onClose();
    } catch (e: any) {
      toast({ title: 'Poll failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-md my-4 bg-white text-gray-900">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white text-gray-900 z-10 border-b rounded-t-xl">
          <CardTitle className="text-gray-900">New poll</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="text-gray-900 hover:bg-gray-100"><X className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Question</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Rehearsal moved to 7pm?" autoFocus />
          </div>
          <div>
            <Label className="text-xs">Options</Label>
            <div className="space-y-1">
              {options.map((o, i) => (
                <div key={i} className="flex gap-1">
                  <Input value={o} onChange={(e) => update(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                  {options.length > 2 && (
                    <Button variant="ghost" size="sm" onClick={() => removeOpt(i)}><Trash2 className="w-3 h-3" /></Button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <Button variant="ghost" size="sm" onClick={addOpt}><Plus className="w-3 h-3 mr-1" /> Add option</Button>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allowMultiple} onChange={(e) => setAllowMultiple(e.target.checked)} />
            Allow multiple choices
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={create} disabled={busy || !question.trim() || options.filter((o) => o.trim()).length < 2}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Post poll
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
