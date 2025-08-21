import React from 'react';
import { TypingIndicator as TypingIndicatorType } from '@/hooks/useMessaging';

interface TypingIndicatorProps {
  users: TypingIndicatorType[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].user_name} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].user_name} and ${users[1].user_name} are typing...`;
    } else {
      return `${users[0].user_name} and ${users.length - 1} others are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-3 px-2 py-1">
      <div className="w-8 h-8" /> {/* Spacer for avatar alignment */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="italic">{getTypingText()}</span>
      </div>
    </div>
  );
};