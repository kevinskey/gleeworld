import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface ModuleWrapperProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function ModuleWrapper({
  title,
  icon: Icon,
  children,
  className = ""
}: ModuleWrapperProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Metal Plate Header with Rivets */}
      <div className="relative bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 dark:from-slate-600 dark:via-slate-500 dark:to-slate-700 rounded-lg border-2 border-slate-400 dark:border-slate-500 shadow-lg px-12 py-4">
        {/* Left Rivet */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
          <div className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        {/* Right Rivet */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
          <div className="w-2 h-2 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Icon className="h-6 w-6 text-slate-700 dark:text-slate-200" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-wide">
            {title}
          </h1>
        </div>
      </div>
      {children}
    </div>
  );
}