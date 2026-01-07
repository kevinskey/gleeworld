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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("overflow-hidden", className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", accentColor)} />
                <span>{title}</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};