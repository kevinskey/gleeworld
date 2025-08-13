/**
 * Global Design System Fixes
 * This component applies comprehensive design fixes across the application
 */

import { useEffect } from 'react';

export const GlobalDesignFixes = () => {
  useEffect(() => {
    // Apply global design fixes
    const style = document.createElement('style');
    style.textContent = `
      /* Override hardcoded colors globally */
      .text-gray-900, .text-gray-800, .text-gray-700, .text-gray-600 {
        color: hsl(var(--foreground)) !important;
      }
      
      .text-gray-500, .text-gray-400 {
        color: hsl(var(--muted-foreground)) !important;
      }
      
      .bg-gray-50, .bg-gray-100, .bg-gray-200 {
        background-color: hsl(var(--muted)) !important;
      }
      
      .bg-white {
        background-color: hsl(var(--background)) !important;
      }
      
      .text-white {
        color: hsl(var(--primary-foreground)) !important;
      }
      
      .border-gray-200, .border-gray-300 {
        border-color: hsl(var(--border)) !important;
      }
      
      /* Ensure all headings use proper font */
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Bebas Neue', cursive !important;
        font-weight: 400 !important;
        letter-spacing: 0.025em !important;
      }
      
      /* Fix dropdown visibility issues */
      [data-radix-popper-content-wrapper] {
        z-index: 1000 !important;
      }
      
      /* Ensure consistent button styling */
      button[data-radix-dropdown-menu-trigger] {
        background: hsl(var(--background));
        border: 1px solid hsl(var(--border));
        color: hsl(var(--foreground));
      }
      
      button[data-radix-dropdown-menu-trigger]:hover {
        background: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
      }
      
      /* Mobile-first responsive improvements */
      @media (max-width: 768px) {
        .card {
          margin: 0.5rem !important;
          padding: 0.75rem !important;
        }
        
        .text-4xl {
          font-size: 1.75rem !important;
        }
        
        .text-3xl {
          font-size: 1.5rem !important;
        }
        
        .text-2xl {
          font-size: 1.25rem !important;
        }
        
        .text-xl {
          font-size: 1.125rem !important;
        }
        
        .text-lg {
          font-size: 1rem !important;
        }
        
        .text-base {
          font-size: 0.875rem !important;
        }
        
        .text-sm {
          font-size: 0.75rem !important;
        }
        
        /* Ensure buttons and interactive elements have min touch targets */
        button, a, [role="button"] {
          min-height: 44px !important;
          min-width: 44px !important;
        }
        
        /* Fix padding on small screens */
        .p-6, .px-6, .py-6 {
          padding: 1rem !important;
        }
        
        .p-4, .px-4, .py-4 {
          padding: 0.75rem !important;
        }
      }
      
      /* Tablet-specific improvements */
      @media (min-width: 769px) and (max-width: 1024px) {
        .text-4xl {
          font-size: 2.25rem !important;
        }
        
        .text-3xl {
          font-size: 1.875rem !important;
        }
        
        .text-2xl {
          font-size: 1.5rem !important;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return null;
};