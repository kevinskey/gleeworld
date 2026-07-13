export interface AssistantAction {
  tool: string;
  args: Record<string, unknown>;
  confirm: boolean;
}

export interface ThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pendingAction?: AssistantAction;
  actionState?: 'pending' | 'confirmed' | 'cancelled' | 'done' | 'error';
}

export interface ThreadState {
  messages: ThreadMessage[];
  busy: boolean;
  error: string | null;
}
