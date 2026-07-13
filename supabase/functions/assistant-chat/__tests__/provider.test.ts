import { describe, it, expect } from 'vitest';
import { buildChatRequest } from '../provider';
import { toolsForRole, toOpenAiTools } from '../toolCatalog';

describe('buildChatRequest', () => {
  it('shapes an OpenAI-compatible tool-calling request', () => {
    const req = buildChatRequest(
      [{ role: 'user', content: 'hi' }],
      toOpenAiTools(toolsForRole('member')),
      'deepseek-chat',
    );
    expect(req).toMatchObject({ model: 'deepseek-chat', tool_choice: 'auto' });
    expect(Array.isArray((req as any).tools)).toBe(true);
    expect((req as any).max_tokens).toBeLessThanOrEqual(1500);
    expect((req as any).stream).toBeUndefined();
  });
});
