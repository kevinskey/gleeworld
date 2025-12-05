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
      {/* Standardized Header */}
      <div className={`${headerClass} border-l-4 border-primary pl-2 md:pl-4`} style={stickyHeader ? { top: 'var(--app-header-offset)' } : undefined}>
        <div className="flex items-center justify-between card-spacing">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            {showBack && (
              <Button variant="outline" size="sm" onClick={onBack} aria-label="Go back" className="touch-target bg-background text-foreground border-border">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {Icon && <Icon className={`h-4 w-4 md:h-5 md:w-5 text-${iconColor}-600 flex-shrink-0`} />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 md:gap-2">
                <h2 className="page-header truncate">{title}</h2>
                {isNew && <Badge variant="secondary" className="text-xs">New</Badge>}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {headerActions}
            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                aria-controls={`${id}-content`}
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((v) => !v)}
                title={collapsed ? 'Expand module' : 'Collapse module'}
                className="touch-target"
              >
                <span className="hidden sm:inline">{collapsed ? 'Expand' : 'Collapse'}</span>
                {collapsed ? <ChevronDown className="h-4 w-4 sm:hidden" /> : <ChevronUp className="h-4 w-4 sm:hidden" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Module Content */}
      {!collapsed && (
        <div id={`${id}-content`} className="section-spacing pt-2 md:pt-4">
          {isLoading ? (
            <Card>
              <CardContent className="card-compact">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary"></div>
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

  return fullPage ? content : <div className="section-spacing">{content}</div>;
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
      <CardHeader className="card-header-compact">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
            {Icon && <Icon className={`h-3 w-3 md:h-4 md:w-4 text-${iconColor}-600 flex-shrink-0`} />}
            <span className="mobile-text-lg truncate">{title}</span>
            {isNew && <Badge variant="secondary" className="text-xs">New</Badge>}
          </div>
          {actions && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {actions}
            </div>
          )}
        </CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}
      </CardHeader>
      {children && (
        <CardContent className="card-compact pt-0">
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
      <CardContent className="card-compact">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mobile-text-xl font-semibold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
            )}
          </div>
          {Icon && (
            <Icon className={`h-5 w-5 md:h-6 md:w-6 text-${iconColor}-600 flex-shrink-0`} />
          )}
        </div>
        {trend && (
          <div className="mt-1 md:mt-2 flex items-center gap-1">
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