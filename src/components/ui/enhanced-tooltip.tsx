import React, { ReactElement, cloneElement } from "react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { cn } from "@/lib/utils";

interface EnhancedTooltipProps {
  content: string;
  children: ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  disabled?: boolean;
  className?: string;
  maxWidth?: number;
}

export const EnhancedTooltip = ({ 
  content, 
  children, 
  placement = 'top',
  disabled = false,
  className,
  maxWidth = 250
}: EnhancedTooltipProps) => {
  const enabled = true;
  const delay = 300;

  // If tooltips are globally disabled or locally disabled, just return the children
  if (!enabled || disabled || !content) {
    return children;
  }

  // Ensure content is under 50 characters as requested
  const truncatedContent = content.length > 50 ? content.substring(0, 47) + "..." : content;

  return (
    <Tippy
      content={truncatedContent}
      placement={placement}
      delay={[delay, 0]}
      duration={[200, 100]}
      arrow={true}
      theme="custom"
      maxWidth={maxWidth}
      touch={['hold', 500]} // Mobile tap-hold
      className={cn("tooltip-enhanced", className)}
    >
      {children}
    </Tippy>
  );
};

// Higher-order component for adding tooltips to any component
export const withTooltip = (
  WrappedComponent: React.ComponentType<any>,
  tooltipContent: string,
  tooltipProps?: Partial<EnhancedTooltipProps>
) => {
  return React.forwardRef((props: any, ref) => (
    <EnhancedTooltip content={tooltipContent} {...tooltipProps}>
      <WrappedComponent {...props} ref={ref} />
    </EnhancedTooltip>
  ));
};

// Utility component for simple title-based tooltips
interface SimpleTitleTooltipProps {
  title: string;
  children: ReactElement;
}

export const SimpleTitleTooltip = ({ title, children }: SimpleTitleTooltipProps) => {
  const enabled = true;
  
  if (!enabled || !title) {
    return children;
  }

  // Add title attribute for simple tooltips
  return cloneElement(children, {
    ...children.props,
    title: title.length > 50 ? title.substring(0, 47) + "..." : title,
  });
};