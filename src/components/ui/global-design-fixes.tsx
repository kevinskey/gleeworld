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
          padding: 1rem !important;
        }
        
        .text-4xl {
          font-size: 2rem !important;
        }
        
        .text-3xl {
          font-size: 1.75rem !important;
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