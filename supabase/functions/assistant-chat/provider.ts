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
  // Empty tools = a plain completion request (the wrap-up call after the
  // tool budget runs out). Some OpenAI-compatible providers reject
  // `tools: []`, so omit the fields entirely rather than sending them empty.
  const req: Record<string, unknown> = { model, messages, max_tokens: 1000, temperature: 0.3 };
  if (tools.length > 0) {
    req.tools = tools;
    req.tool_choice = 'auto';
  }
  return req;
}

type ModelResult = { message: ChatMessage & { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } };

async function callModelOnce(
  req: Record<string, unknown>,
  apiKey: string,
  apiUrl: string,
): Promise<ModelResult> {
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

export async function callModel(
  req: Record<string, unknown>,
  apiKey: string,
  apiUrl: string,
): Promise<ModelResult> {
  // One retry on transient failure. A multi-tool turn makes several model
  // calls in a row; a single provider blip mid-loop used to abort the whole
  // turn as "couldn't reach the assistant" and throw away every completed
  // step. 4xx responses (bad request / auth / context too long) won't heal
  // on retry, so those still throw immediately.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callModelOnce(req, apiKey, apiUrl);
    } catch (e) {
      if (e instanceof Error && /^Model API 4\d\d:/.test(e.message)) throw e;
      lastErr = e;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw lastErr;
}
