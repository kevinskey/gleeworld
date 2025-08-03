import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { NowPlayingStrip } from '@/components/radio/NowPlayingStrip';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showHeader?: boolean;
}

export const AppLayout = ({ 
  children, 
  activeTab = '', 
  onTabChange = () => {}, 
  showHeader = true 
}: AppLayoutProps) => {
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);

  // Listen for radio state changes from localStorage or context
  useEffect(() => {
    const checkRadioState = () => {
      const radioState = localStorage.getItem('gleeworld-radio-playing');
      setIsRadioPlaying(radioState === 'true');
    };

    // Check initial state
    checkRadioState();

    // Listen for storage changes
    window.addEventListener('storage', checkRadioState);
    
    // Listen for custom radio events
    const handleRadioToggle = (event: CustomEvent) => {
      setIsRadioPlaying(event.detail.isPlaying);
    };

    window.addEventListener('radio-toggle', handleRadioToggle as EventListener);

    return () => {
      window.removeEventListener('storage', checkRadioState);
      window.removeEventListener('radio-toggle', handleRadioToggle as EventListener);
    };
  }, []);

  const handleRadioToggle = () => {
    const newState = !isRadioPlaying;
    setIsRadioPlaying(newState);
    localStorage.setItem('gleeworld-radio-playing', newState.toString());
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('radio-toggle', { 
      detail: { isPlaying: newState } 
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {showHeader && (
        <Header 
          activeTab={activeTab} 
          onTabChange={onTabChange}
          isRadioPlaying={isRadioPlaying}
          onRadioToggle={handleRadioToggle}
        />
      )}
      <NowPlayingStrip isVisible={isRadioPlaying} />
      <main className={isRadioPlaying ? 'pt-0' : ''}>
        {children}
      </main>
    </div>
  );
};