import React, { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LucideIcon, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

interface ModuleWrapperProps {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: ReactNode;
  isNew?: boolean;
  isLoading?: boolean;
  headerActions?: ReactNode;
  className?: string;
  fullPage?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  stickyHeader?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const ModuleWrapper = ({
  id,
  title,
  description,
  icon: Icon,
  iconColor = "primary",
  children,
  isNew = false,
  isLoading = false,
  headerActions,
  className = "",
  fullPage = false,
  showBack = false,
  onBack,
  stickyHeader = false,
  collapsible = true,
  defaultOpen = true,
}: ModuleWrapperProps) => {
  const containerClass = fullPage 
    ? "min-h-screen space-y-4" 
    : "space-y-4";
  const headerClass = stickyHeader
    ? "sticky z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    : "";

  const [collapsed, setCollapsed] = useState(collapsible ? !(defaultOpen ?? true) : false);

  const content = (
    <div className={`${containerClass} ${className}`}>
      {/* Mobile Header Spacer/Bumper */}

      {/* Standardized Header */}
      <div className={`${headerClass} border-l-4 border-primary pl-4`} style={stickyHeader ? { top: 'var(--app-header-offset)' } : undefined}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && (
              <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {Icon && <Icon className={`h-5 w-5 text-${iconColor}-600`} />}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{title}</h2>
                {isNew && <Badge variant="secondary" className="text-xs">New</Badge>}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                aria-controls={`${id}-content`}
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((v) => !v)}
                title={collapsed ? 'Expand module' : 'Collapse module'}
              >
                {collapsed ? 'Expand' : 'Collapse'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Module Content */}
      {!collapsed && (
        <div id={`${id}-content`} className="space-y-4 pt-4 sm:pt-0">
          {isLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          ) : (
            children
          )}
        </div>
      )}

    </div>
  );

  return fullPage ? content : <div className="space-y-4">{content}</div>;
};

// Standardized module card component for sub-features
interface ModuleCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  isNew?: boolean;
}

export const ModuleCard = ({
  title,
  description,
  icon: Icon,
  iconColor = "primary",
  onClick,
  children,
  actions,
  className = "",
  isNew = false
}: ModuleCardProps) => {
  return (
    <Card className={`hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-primary/20' : ''} ${className}`} onClick={onClick}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`h-4 w-4 text-${iconColor}-600`} />}
            <span className="text-sm">{title}</span>
            {isNew && <Badge variant="secondary" className="text-xs">New</Badge>}
          </div>
          {actions && (
            <div className="flex items-center gap-1">
              {actions}
            </div>
          )}
        </CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      {children && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
};

// Standardized stats card component
interface ModuleStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const ModuleStatsCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "primary",
  trend
}: ModuleStatsCardProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-semibold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {Icon && (
            <Icon className={`h-6 w-6 text-${iconColor}-600`} />
          )}
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <span className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground">from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};