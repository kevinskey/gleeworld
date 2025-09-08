import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  useGrid?: boolean;
  gridCols?: string;
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl' | '4xl' | '3xl' | '2xl' | 'xl' | 'lg' | 'md' | 'sm';
}

export const PageShell: React.FC<PageShellProps> = ({ 
  children, 
  title,
  subtitle,
  actions,
  className = "",
  contentClassName = "",
  useGrid = false,
  gridCols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  maxWidth = "7xl"
}) => {
  const maxWidthClasses = {
    full: "max-w-full",
    "7xl": "max-w-7xl",
    "6xl": "max-w-6xl", 
    "5xl": "max-w-5xl",
    "4xl": "max-w-4xl",
    "3xl": "max-w-3xl",
    "2xl": "max-w-2xl",
    xl: "max-w-xl",
    lg: "max-w-lg",
    md: "max-w-md",
    sm: "max-w-sm"
  };

  return (
    <div className={cn(
      "container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10",
      maxWidthClasses[maxWidth],
      className
    )}>
      {/* Page Header */}
      {(title || subtitle || actions) && (
        <div className="space-y-4 md:space-y-6 lg:space-y-8 mb-6 md:mb-8 lg:mb-12">
          {(title || subtitle) && (
            <div className="space-y-2 md:space-y-3">
              {title && (
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-base md:text-lg text-muted-foreground max-w-3xl">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          
          {actions && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className={cn(
        "space-y-4 md:space-y-6 lg:space-y-8",
        useGrid && `grid ${gridCols} gap-4 md:gap-6 lg:gap-8`,
        contentClassName
      )}>
        {children}
      </div>
    </div>
  );
};

interface PageCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export const PageCard: React.FC<PageCardProps> = ({
  children,
  className = "",
  title,
  description,
  actions
}) => {
  return (
    <div className={cn(
      "rounded-2xl border bg-card shadow-sm p-4 sm:p-5 lg:p-6 space-y-3 md:space-y-4",
      className
    )}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg md:text-xl font-semibold leading-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm md:text-base text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="space-y-3 md:space-y-4">
        {children}
      </div>
    </div>
  );
};

interface ProseWrapperProps {
  children: ReactNode;
  className?: string;
}

export const ProseWrapper: React.FC<ProseWrapperProps> = ({
  children,
  className = ""
}) => {
  return (
    <article className={cn(
      "prose md:prose-lg lg:prose-xl max-w-3xl",
      className
    )}>
      {children}
    </article>
  );
};