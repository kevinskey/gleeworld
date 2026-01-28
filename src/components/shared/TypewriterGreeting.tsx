import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import gleeAssistantAvatar from '@/assets/glee-assistant-avatar.png';

interface TypewriterGreetingProps {
  firstName: string;
  onClose?: () => void;
  autoHideAfter?: number; // milliseconds to auto-hide after typing completes
}

export const TypewriterGreeting = ({ 
  firstName, 
  onClose,
  autoHideAfter = 5000 
}: TypewriterGreetingProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  const fullText = `Hello ${firstName}! Welcome back, Sister. ✨`;

  useEffect(() => {
    if (!isVisible) return;

    let index = 0;
    const typingInterval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
        
        // Auto-hide after specified duration
        if (autoHideAfter > 0) {
          setTimeout(() => {
            setIsVisible(false);
            onClose?.();
          }, autoHideAfter);
        }
      }
    }, 60); // Typing speed: 60ms per character

    return () => clearInterval(typingInterval);
  }, [fullText, autoHideAfter, onClose, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative max-w-2xl mx-4 p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-[#003666] via-[#1a3a5c] to-[#003666] border border-white/20 shadow-2xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="absolute top-3 right-3 text-white/60 hover:text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Decorative elements */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />

        {/* Assistant Avatar */}
        <div className="relative z-10 flex justify-center mb-6">
          <img 
            src={gleeAssistantAvatar} 
            alt="Glee Assistant" 
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white/30 shadow-xl object-cover"
          />
        </div>

        {/* Greeting text with typewriter effect */}
        <div className="relative z-10 text-center">
          <p 
            className="text-2xl sm:text-3xl md:text-4xl font-dancing text-white leading-relaxed"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
          >
            {displayedText}
            {isTyping && (
              <span className="inline-block w-0.5 h-8 sm:h-10 bg-amber-400 ml-1 animate-pulse" />
            )}
          </p>
        </div>

        {/* Tap to dismiss hint */}
        {!isTyping && (
          <p className="text-center text-white/50 text-sm mt-6 animate-in fade-in duration-500">
            Tap anywhere or wait to continue
          </p>
        )}
      </div>

      {/* Click anywhere to dismiss */}
      <div 
        className="absolute inset-0 -z-10" 
        onClick={() => {
          if (!isTyping) {
            setIsVisible(false);
            onClose?.();
          }
        }}
      />
    </div>
  );
};
