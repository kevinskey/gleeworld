import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildChatRequest, callModel } from '../provider';
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

describe('callModel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves with message on successful response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'hi' } }],
      }),
    };
    vi.stubGlobal('fetch', vi.fn(async () => mockResponse));

    const req = { model: 'test-model', messages: [] };
    const apiKey = 'test-key';
    const apiUrl = 'https://api.example.com/chat';

    const result = await callModel(req, apiKey, apiUrl);

    expect(result).toEqual({
      message: { role: 'assistant', content: 'hi' },
    });
    expect(fetch).toHaveBeenCalledWith(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req),
    });
  });

  it('rejects with error on non-OK response', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    };
    vi.stubGlobal('fetch', vi.fn(async () => mockResponse));

    const req = { model: 'test-model', messages: [] };
    const apiKey = 'test-key';
    const apiUrl = 'https://api.example.com/chat';

    await expect(callModel(req, apiKey, apiUrl)).rejects.toThrow();
    const error = await callModel(req, apiKey, apiUrl).catch((e) => e);
    expect(error.message).toContain('429');
    expect(error.message).toContain('rate limited');
  });

  it('rejects with error on malformed response (no message)', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({}),
    };
    vi.stubGlobal('fetch', vi.fn(async () => mockResponse));

    const req = { model: 'test-model', messages: [] };
    const apiKey = 'test-key';
    const apiUrl = 'https://api.example.com/chat';

    await expect(callModel(req, apiKey, apiUrl)).rejects.toThrow();
    const error = await callModel(req, apiKey, apiUrl).catch((e) => e);
    expect(error.message).toContain('no message');
  });
});
