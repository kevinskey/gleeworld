import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AssistantProvider } from '@/lib/assistant/AssistantProvider';
import { AssistantFab } from '@/components/assistant/AssistantFab';
import { AssistantSheet } from '@/components/assistant/AssistantSheet';

// Mounts the assistant once for the whole app instead of once per
// DashboardShell. The shell only wraps authenticated dashboard pages, so
// the mic used to vanish the moment you stepped onto the landing page, the
// store, a concert page, or any other public route — the FAB was never
// rendered there at all. Hoisting it here keeps a single thread alive
// across every route transition, dashboard or not.
//
// Gated on a signed-in user: the assistant talks to the `assistant-chat`
// edge function, which has no entry in supabase/config.toml and therefore
// runs with the default verify_jwt = true. An anonymous visitor would get
// a mic that 401s on every utterance, which is worse than no mic. (The
// config still lists a `public-assistant` function for the anon path, but
// that function doesn't exist in supabase/functions — wiring it up is what
// this gate is waiting on.)
export const GlobalAssistantHost = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  return (
    <AssistantProvider>
      {children}
      {/* Both self-gate: the FAB hides while the sheet or a video call is
          up, and the sheet renders nothing until it's opened. */}
      <AssistantFab />
      <AssistantSheet />
    </AssistantProvider>
  );
};

export default GlobalAssistantHost;
