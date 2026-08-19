// supabase-js wraps every non-2xx edge function response in FunctionsHttpError,
// whose .message is always the generic "Edge Function returned a non-2xx status
// code". The function's real {error: "..."} body lives only on error.context
// (the fetch Response). This recovers it so callers can show the actual reason.
export async function edgeFunctionErrorMessage(
  error: unknown,
  data: Record<string, unknown> | null | undefined,
): Promise<string | null> {
  if (error) {
    let body: { error?: unknown } | null = null;
    try {
      body = await (error as { context?: { json?: () => Promise<{ error?: unknown }> } }).context?.json?.();
    } catch { /* body absent or not JSON */ }
    if (body?.error) return String(body.error);
    const message = (error as { message?: string }).message;
    return message ?? 'unknown error';
  }
  if (data?.error) return String(data.error);
  return null;
}
