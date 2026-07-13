import { useState, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AssistantAction, ThreadMessage } from '@/lib/assistant/types';

interface AssistantThreadProps {
  messages: ThreadMessage[];
  busy: boolean;
  error: string | null;
  runAction: (msgId: string, action: AssistantAction) => Promise<void>;
  cancelAction: (msgId: string) => void;
  scrollRef?: RefObject<HTMLDivElement>;
  className?: string;
}

/**
 * Message bubbles + pending confirm cards + busy/error rendering, shared by
 * the desktop spotlight dialog and the phone bottom sheet. `executingId` is
 * local to this component — it only guards double-clicks on a confirm
 * card's Send/Cancel while `runAction` is in flight, and neither shell needs
 * to observe it.
 */
export const AssistantThread = ({ messages, busy, error, runAction, cancelAction, scrollRef, className }: AssistantThreadProps) => {
  const [executingId, setExecutingId] = useState<string | null>(null);

  return (
    <div ref={scrollRef} className={className}>
      {messages.map((m) => (
        <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
          <div className={m.role === 'user'
            ? 'max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-2 text-sm'
            : 'max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-foreground'}>
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.pendingAction && m.actionState === 'pending' && (
              <div className="mt-2 rounded-lg border bg-card p-2 space-y-2">
                {m.pendingAction.tool === 'create_course_draft' ? (
                  <>
                    <p className="text-xs text-muted-foreground">Create draft course:</p>
                    <p className="text-xs font-medium">
                      “{String((m.pendingAction.args.spec as Record<string, unknown> | undefined)?.title ?? 'Untitled')}” —{' '}
                      {(((m.pendingAction.args.spec as Record<string, unknown> | undefined)?.modules as unknown[]) ?? []).length} modules.
                      Students can’t see drafts.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {m.pendingAction.tool === 'send_sms' ? 'Text' : 'Email'} to{' '}
                      {(m.pendingAction.args.recipient_names as string[] | undefined)?.join(', ') ?? 'recipients'}:
                    </p>
                    {m.pendingAction.tool === 'send_email' && m.pendingAction.args.subject != null && (
                      <p className="text-xs text-muted-foreground">
                        Subject: {String(m.pendingAction.args.subject)}
                      </p>
                    )}
                    <p className="text-xs font-medium">
                      {String(m.pendingAction.args.message ?? m.pendingAction.args.body ?? '')}
                    </p>
                  </>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="h-9 text-xs" disabled={executingId === m.id}
                    onClick={() => {
                      // Set synchronously, before the async runAction's first
                      // dispatch — don't rely on render timing to keep a second
                      // click (or a Cancel click) from racing this one.
                      setExecutingId(m.id);
                      runAction(m.id, m.pendingAction!).finally(
                        () => setExecutingId((id) => (id === m.id ? null : id)),
                      );
                    }}>
                    {m.pendingAction.tool === 'create_course_draft' ? 'Create' : 'Send'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 text-xs" disabled={executingId === m.id}
                    onClick={() => cancelAction(m.id)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {m.actionState === 'done' && <p className="text-xs text-muted-foreground mt-1">✓ Done</p>}
            {m.actionState === 'cancelled' && <p className="text-xs text-muted-foreground mt-1">Cancelled</p>}
            {m.actionState === 'error' && <p className="text-xs text-destructive mt-1">That didn't work — see above.</p>}
          </div>
        </div>
      ))}
      {busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
