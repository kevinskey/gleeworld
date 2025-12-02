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
  return <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-secondary-foreground">{title}</h1>
      </div>
      {children}
    </div>;
}