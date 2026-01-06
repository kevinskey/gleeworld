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
  return;
};