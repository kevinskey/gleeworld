// Provider selection for the Auctions normalizer. Callers ask for a provider
// and never learn which one they got.
//
// To add a provider: write one new file beside deepseek.ts exporting a
// createXProvider(): LlmProvider, then add its case here. Nothing else in the
// module knows a provider exists.
import { createDeepSeekProvider } from './deepseek.ts';
import type { LlmProvider } from './types.ts';

export type { LlmChatResult, LlmProvider } from './types.ts';

export function getLlmProvider(): LlmProvider {
  const requested = (Deno.env.get('AUCTION_LLM_PROVIDER') ?? 'deepseek').toLowerCase();

  switch (requested) {
    case 'deepseek':
      return createDeepSeekProvider();
    default:
      throw new Error(`Unknown AUCTION_LLM_PROVIDER "${requested}"`);
  }
}
