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

  // Use theme system via CSS classes - no hardcoded colors
  const isHbcuTheme = themeName === 'hbcu';

  return (
    <div 
      className={`relative z-10 rounded-lg border-2 shadow-lg py-3 px-4 sm:px-6 ${
        isHbcuTheme 
          ? 'bg-gradient-to-b from-neutral-900 to-black border-secondary' 
          : 'bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 border-slate-500'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Back Button */}
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(backPath)} 
            className={`flex items-center gap-1 shrink-0 ${
              isHbcuTheme ? 'text-primary hover:text-primary/80' : 'text-slate-800 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Button>
        )}
        
        {/* Module Title */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          {Icon && (
            <Icon 
              className={`h-5 w-5 shrink-0 ${isHbcuTheme ? 'text-primary' : 'text-destructive'}`}
            />
          )}
          <h1 
            className={`text-base sm:text-xl lg:text-2xl font-bold tracking-wide font-mono uppercase ${
              isHbcuTheme ? 'text-primary' : 'text-slate-800'
            }`}
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
