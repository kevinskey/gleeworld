export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export function buildChatRequest(
  messages: ChatMessage[],
  tools: Array<Record<string, unknown>>,
  model: string,
): Record<string, unknown> {
  return { model, messages, tools, tool_choice: 'auto', max_tokens: 1000, temperature: 0.3 };
}

export async function callModel(
  req: Record<string, unknown>,
  apiKey: string,
  apiUrl: string,
): Promise<{ message: ChatMessage & { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Model API ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  if (!message) throw new Error('Model API returned no message');
  return { message };
}
