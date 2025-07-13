import { createContext, useContext, ReactNode } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface TooltipContextType {
  enabled: boolean;
  delay: number;
  toggleTooltips: (enabled: boolean) => Promise<void>;
  updateDelay: (delay: number) => Promise<void>;
  loading: boolean;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

export const useTooltipContext = () => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error("useTooltipContext must be used within TooltipProvider");
  }
  return context;
};

interface TooltipProviderProps {
  children: ReactNode;
}

export const TooltipProvider = ({ children }: TooltipProviderProps) => {
  const { preferences, loading, updatePreferences } = useUserPreferences();

  const toggleTooltips = async (enabled: boolean) => {
    await updatePreferences({ tooltips_enabled: enabled });
  };

  const updateDelay = async (delay: number) => {
    await updatePreferences({ tooltip_delay: delay });
  };

  const value: TooltipContextType = {
    enabled: preferences.tooltips_enabled,
    delay: preferences.tooltip_delay,
    toggleTooltips,
    updateDelay,
    loading,
  };

  return (
    <TooltipContext.Provider value={value}>
      {children}
    </TooltipContext.Provider>
  );
};