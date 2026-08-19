import { useAuth } from '@/contexts/AuthContext';
import { AssistantFab } from '@/components/assistant/AssistantFab';
import { AssistantMiniPlayer } from '@/components/assistant/AssistantMiniPlayer';
import { AssistantSheet } from '@/components/assistant/AssistantSheet';

// The assistant's floating surfaces: push-to-talk mic + live-conversation
// button, the mini player, and the chat sheet.
//
// AssistantProvider already lives in App.tsx above the routes (the shell
// remounts on every navigation, and a provider living down there took the
// live voice session with it). These three consumers stayed behind in
// DashboardShell, though, which meant the mic still disappeared the moment
// you stepped onto a public route — the landing page, the store, a concert
// page. Mounting them next to the provider is what actually makes the
// assistant follow you across the whole app.
//
// Gated on a signed-in user: assistant-chat has no entry in
// supabase/config.toml and so runs with the default verify_jwt = true, so
// an anonymous visitor would get a mic that 401s on every utterance. The
// config still names a public-assistant function for the anon path, but no
// such function exists under supabase/functions — wiring that up is what
// this gate is waiting on.
export const AssistantSurfaces = () => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <AssistantFab />
      <AssistantMiniPlayer />
      <AssistantSheet />
    </>
  );
};

export default AssistantSurfaces;
