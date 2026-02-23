import React from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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

  return (
    <div className="relative z-10 rounded-lg border-2 shadow-lg h-12 sm:h-14 px-3 sm:px-6 flex items-center bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 border-slate-500">
      <div className="flex items-center justify-between gap-2 w-full">
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(backPath)} 
            className="flex items-center gap-1 shrink-0 h-8 px-2 text-slate-800 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Button>
        )}
        
        <div className="flex items-center gap-2 flex-1 justify-center">
          {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-destructive" />}
          <h1 className="text-sm sm:text-xl lg:text-2xl font-bold tracking-wide font-mono uppercase text-slate-800">
            {title}
          </h1>
        </div>
        
        {showBackButton && <div className="w-16 sm:w-32 shrink-0"></div>}
      </div>
    </div>
  );
};
