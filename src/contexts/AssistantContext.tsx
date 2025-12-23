import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AssistantContextType {
  isWakeWordActive: boolean;
  isAssistantOpen: boolean;
  wakeWordStatus: 'inactive' | 'listening' | 'activated';
  toggleWakeWord: () => Promise<void>;
  openAssistant: () => void;
  closeAssistant: () => void;
  setWakeWordStatus: (status: 'inactive' | 'listening' | 'activated') => void;
  setIsWakeWordActive: (active: boolean) => void;
  setIsAssistantOpen: (open: boolean) => void;
}

const AssistantContext = createContext<AssistantContextType | null>(null);

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};

interface AssistantProviderProps {
  children: ReactNode;
}

export const AssistantProvider = ({ children }: AssistantProviderProps) => {
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [wakeWordStatus, setWakeWordStatus] = useState<'inactive' | 'listening' | 'activated'>('inactive');

  const toggleWakeWord = useCallback(async () => {
    // This will be overridden by GleeAssistant when it mounts
    // But provides a default implementation
    setIsWakeWordActive(prev => !prev);
  }, []);

  const openAssistant = useCallback(() => {
    setIsAssistantOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsAssistantOpen(false);
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        isWakeWordActive,
        isAssistantOpen,
        wakeWordStatus,
        toggleWakeWord,
        openAssistant,
        closeAssistant,
        setWakeWordStatus,
        setIsWakeWordActive,
        setIsAssistantOpen,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};
