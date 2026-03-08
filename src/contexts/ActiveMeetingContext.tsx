import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ActiveMeetingState {
  roomName: string;
  userName: string;
  userEmail?: string;
  userId?: string;
  isModerator?: boolean;
}

interface ActiveMeetingContextType {
  activeMeeting: ActiveMeetingState | null;
  isMinimized: boolean;
  startMeeting: (state: ActiveMeetingState) => void;
  endMeeting: () => void;
  toggleMinimize: () => void;
  setMinimized: (val: boolean) => void;
}

const ActiveMeetingContext = createContext<ActiveMeetingContextType | undefined>(undefined);

export const ActiveMeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingState | null>(() => {
    try {
      const saved = sessionStorage.getItem('glee-active-meeting-global');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (activeMeeting) {
      sessionStorage.setItem('glee-active-meeting-global', JSON.stringify(activeMeeting));
    } else {
      sessionStorage.removeItem('glee-active-meeting-global');
    }
  }, [activeMeeting]);

  const startMeeting = useCallback((state: ActiveMeetingState) => {
    setActiveMeeting(state);
    setIsMinimized(false);
  }, []);

  const endMeeting = useCallback(() => {
    setActiveMeeting(null);
    setIsMinimized(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  return (
    <ActiveMeetingContext.Provider value={{
      activeMeeting,
      isMinimized,
      startMeeting,
      endMeeting,
      toggleMinimize,
      setMinimized: setIsMinimized,
    }}>
      {children}
    </ActiveMeetingContext.Provider>
  );
};

export const useActiveMeeting = () => {
  const ctx = useContext(ActiveMeetingContext);
  if (!ctx) throw new Error('useActiveMeeting must be used within ActiveMeetingProvider');
  return ctx;
};
