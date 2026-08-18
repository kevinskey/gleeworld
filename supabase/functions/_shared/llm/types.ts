// The contract every LLM provider implements for the Auctions normalizer.
// Adding a provider means writing one new file next to deepseek.ts that
// exports a createXProvider() of this shape, and naming it in index.ts's
// switch — no caller anywhere else changes.
import type { ChatMessage, TokenUsage } from '../auctionNormalize.ts';

export interface LlmChatResult {
  content: string;
  usage: TokenUsage;
  model: string;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  // Must request strict JSON from the model. The caller validates the string
  // it returns; a provider never writes to the database itself.
  chatJson(messages: ChatMessage[]): Promise<LlmChatResult>;
}
