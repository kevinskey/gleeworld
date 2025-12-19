import React, { createContext, useContext, useState, useCallback } from 'react';

interface MessengerContextType {
  isOpen: boolean;
  hasUnsavedChanges: boolean;
  openMessenger: () => void;
  closeMessenger: () => void;
  toggleMessenger: () => void;
  setHasUnsavedChanges: (value: boolean) => void;
  requestClose: () => void; // This will trigger warning if unsaved
  confirmClose: () => void; // Force close without warning
  showCloseWarning: boolean;
  setShowCloseWarning: (value: boolean) => void;
}

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  const openMessenger = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeMessenger = useCallback(() => {
    setIsOpen(false);
    setHasUnsavedChanges(false);
    setShowCloseWarning(false);
  }, []);

  const toggleMessenger = useCallback(() => {
    if (isOpen) {
      // Trying to close
      if (hasUnsavedChanges) {
        setShowCloseWarning(true);
      } else {
        closeMessenger();
      }
    } else {
      openMessenger();
    }
  }, [isOpen, hasUnsavedChanges, openMessenger, closeMessenger]);

  const requestClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCloseWarning(true);
    } else {
      closeMessenger();
    }
  }, [hasUnsavedChanges, closeMessenger]);

  const confirmClose = useCallback(() => {
    setShowCloseWarning(false);
    closeMessenger();
  }, [closeMessenger]);

  return (
    <MessengerContext.Provider
      value={{
        isOpen,
        hasUnsavedChanges,
        openMessenger,
        closeMessenger,
        toggleMessenger,
        setHasUnsavedChanges,
        requestClose,
        showCloseWarning,
        setShowCloseWarning,
        confirmClose,
      }}
    >
      {children}
    </MessengerContext.Provider>
  );
};

export const useMessenger = () => {
  const context = useContext(MessengerContext);
  if (context === undefined) {
    throw new Error('useMessenger must be used within a MessengerProvider');
  }
  return context;
};
