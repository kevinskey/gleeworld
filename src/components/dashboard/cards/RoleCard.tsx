import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LucideIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
interface RoleCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  defaultOpen?: boolean;
}
export const RoleCard = ({
  title,
  icon: Icon,
  children,
  className,
  accentColor,
  defaultOpen = true
}: RoleCardProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className={cn("cursor-pointer flex flex-row items-center justify-between", accentColor)}>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};