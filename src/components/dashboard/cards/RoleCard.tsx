import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}

export const RoleCard = ({ title, icon: Icon, children, className, accentColor }: RoleCardProps) => {
  return (
    <Card className={cn(
      "h-full transition-all hover:shadow-lg",
      className
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className={cn("h-5 w-5", accentColor)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
};
