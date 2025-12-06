import React from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { LucideIcon, ArrowLeft } from "lucide-react";

interface ModulePageHeaderProps {
  title: string;
  icon?: LucideIcon;
  showBackButton?: boolean;
  backPath?: string;
  backLabel?: string;
}

export const ModulePageHeader: React.FC<ModulePageHeaderProps> = ({
  title,
  icon: Icon,
  showBackButton = true,
  backPath = "/dashboard",
  backLabel = "Back to Dashboard"
}) => {
  const navigate = useNavigate();
  const { themeName } = useTheme();

  // HBCU theme colors
  const isHbcuTheme = themeName === 'hbcu';
  const hbcuGold = '#FFDF00';
  const hbcuRed = '#8B0000';

  return (
    <div 
      className="relative z-10 rounded-lg border-2 shadow-lg py-3 px-4 sm:px-6"
      style={{
        background: isHbcuTheme 
          ? 'linear-gradient(to bottom, #1a1a1a, #0a0a0a)' 
          : 'linear-gradient(to bottom, #cbd5e1, #94a3b8, #64748b)',
        borderColor: isHbcuTheme ? hbcuRed : '#64748b'
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Back Button */}
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(backPath)} 
            className="flex items-center gap-1 shrink-0"
            style={{
              color: isHbcuTheme ? hbcuGold : '#1e293b',
              backgroundColor: 'transparent'
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Button>
        )}
        
        {/* Module Title */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          {Icon && (
            <Icon 
              className="h-5 w-5 shrink-0" 
              style={{ color: isHbcuTheme ? hbcuGold : '#dc2626' }} 
            />
          )}
          <h1 
            className="text-base sm:text-xl lg:text-2xl font-bold tracking-wide font-mono uppercase"
            style={{ color: isHbcuTheme ? hbcuGold : '#1e293b' }}
          >
            {title}
          </h1>
        </div>
        
        {/* Spacer for balance */}
        {showBackButton && <div className="w-20 sm:w-32 shrink-0"></div>}
      </div>
    </div>
  );
};
