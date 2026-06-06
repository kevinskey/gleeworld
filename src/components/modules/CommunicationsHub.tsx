// Legacy 5-tab Communications Hub replaced by the unified page at /communications
// (group chats, newsletters, email blast, polls, RSVPs, voice, broadcast — one place).
// Any old wrapper that renders <CommunicationsHub /> now redirects.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const CommunicationsHub = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/communications', { replace: true });
  }, [navigate]);
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingSpinner size="md" text="Opening Communications…" />
    </div>
  );
};

export default CommunicationsHub;
