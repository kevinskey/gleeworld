import { useState, useEffect } from 'react';

interface UserPreferences {
  tooltips_enabled: boolean;
  tooltip_delay: number;
}

const defaultPreferences: UserPreferences = {
  tooltips_enabled: true,
  tooltip_delay: 300,
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(false);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    setLoading(true);
    try {
      const newPreferences = { ...preferences, ...updates };
      setPreferences(newPreferences);
      // Store in localStorage for persistence
      localStorage.setItem('user-preferences', JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Error updating preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load preferences from localStorage on mount
    try {
      const stored = localStorage.getItem('user-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, []);

  return {
    preferences,
    loading,
    updatePreferences,
  };
};