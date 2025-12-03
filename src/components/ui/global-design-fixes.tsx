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
      
      /* Default heading styling via CSS variables (allow overrides) */
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--heading-font, 'Bebas Neue', cursive);
        font-weight: var(--heading-weight, 400);
        letter-spacing: var(--heading-letter-spacing, 0.025em);
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
      @media (max-width: 640px) {
        .text-4xl {
          font-size: 1.5rem !important;
        }
        
        .text-3xl {
          font-size: 1.375rem !important;
        }
        
        .text-2xl {
          font-size: 1.25rem !important;
        }
        
        .text-xl {
          font-size: 1.125rem !important;
        }
      }
      
      @media (min-width: 641px) and (max-width: 768px) {
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
      
      /* Ensure all containers are responsive */
      * {
        max-width: 100%;
      }
      
      /* Fix horizontal overflow */
      body, html {
        overflow-x: hidden !important;
      }
      
      /* Make tables responsive */
      @media (max-width: 768px) {
        table {
          display: block;
          overflow-x: auto;
          white-space: nowrap;
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