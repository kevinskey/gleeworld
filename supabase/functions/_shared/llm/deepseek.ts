// DeepSeek provider. OpenAI-compatible endpoint, called with raw fetch to
// match how assistant-chat talks to the same API (no SDK in this codebase).
//
// Model IDs and pricing verified against api-docs.deepseek.com on 2026-08-18:
// deepseek-v4-flash and deepseek-v4-pro are the current IDs (the legacy
// deepseek-chat / deepseek-reasoner names were retired 2026-07-24).
// Normalization uses FLASH deliberately — this is structured extraction, not
// reasoning, and Pro costs three times as much for no benefit here.
import type { ChatMessage } from '../auctionNormalize.ts';
import type { LlmChatResult, LlmProvider } from './types.ts';

const DEFAULT_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-v4-flash';

export function createDeepSeekProvider(): LlmProvider {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') ?? '';
  const url = Deno.env.get('AUCTION_LLM_URL') ?? DEFAULT_URL;
  const model = Deno.env.get('AUCTION_LLM_MODEL') ?? DEFAULT_MODEL;

  return {
    name: 'deepseek',
    model,

    async chatJson(messages: ChatMessage[]): Promise<LlmChatResult> {
      if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not set');

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          // Extraction, not composition: no creativity wanted.
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`DeepSeek ${res.status}: ${detail.slice(0, 400)}`);
      }

      const body = await res.json();
      const content = body?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('DeepSeek returned no message content');
      }

      const usage = body?.usage ?? {};
      return {
        content,
        model: typeof body?.model === 'string' ? body.model : model,
        usage: {
          prompt_tokens: Number(usage.prompt_tokens ?? 0),
          // DeepSeek reports the cached portion separately; it is billed far
          // cheaper, and the pinned system prompt exists to maximise it.
          cached_prompt_tokens: Number(usage.prompt_cache_hit_tokens ?? 0),
          completion_tokens: Number(usage.completion_tokens ?? 0),
        },
      };
    },
  };
}
