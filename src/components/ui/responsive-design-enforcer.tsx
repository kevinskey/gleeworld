/**
 * Responsive Design Enforcer
 * Ensures consistent responsive behavior across all viewports
 */

import { useEffect } from 'react';

export const ResponsiveDesignEnforcer = () => {
  useEffect(() => {
    // Apply responsive design fixes
    const style = document.createElement('style');
    style.id = 'responsive-design-enforcer';
    style.textContent = `
      /* Mobile viewport fixes (320px - 768px) */
      @media (max-width: 768px) {
        /* Ensure proper touch targets */
        button:not(.btn-sm):not(.btn-xs), 
        [role="button"]:not(.btn-sm):not(.btn-xs),
        .touch-target {
          min-height: 44px !important;
          min-width: 44px !important;
        }
        
        /* Consistent spacing on mobile */
        .container, .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
        
        /* Mobile typography scaling */
        .mobile-text-scale h1 { font-size: 1.75rem !important; }
        .mobile-text-scale h2 { font-size: 1.5rem !important; }
        .mobile-text-scale h3 { font-size: 1.25rem !important; }
        .mobile-text-scale h4 { font-size: 1.125rem !important; }
        .mobile-text-scale h5 { font-size: 1rem !important; }
        .mobile-text-scale h6 { font-size: 0.875rem !important; }
        
        /* Card responsive adjustments */
        .card, [data-component="card"] {
          margin: 0.5rem !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
        }
        
        /* Form element consistency */
        input, textarea, select {
          height: 2.75rem !important;
          padding: 0.75rem !important;
          font-size: 0.875rem !important;
        }
        
        /* Navigation responsive fixes */
        nav button, nav a {
          padding: 0.75rem !important;
          font-size: 0.875rem !important;
        }
      }
      
      /* Tablet viewport fixes (769px - 1024px) */
      @media (min-width: 769px) and (max-width: 1024px) {
        .container, .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
          padding-left: 1.5rem !important;
          padding-right: 1.5rem !important;
        }
        
        /* Tablet typography scaling */
        .tablet-text-scale h1 { font-size: 2.25rem !important; }
        .tablet-text-scale h2 { font-size: 1.875rem !important; }
        .tablet-text-scale h3 { font-size: 1.5rem !important; }
        .tablet-text-scale h4 { font-size: 1.25rem !important; }
        .tablet-text-scale h5 { font-size: 1.125rem !important; }
        .tablet-text-scale h6 { font-size: 1rem !important; }
        
        /* Button sizing for tablets */
        button:not(.btn-sm):not(.btn-xs) {
          height: 2.5rem !important;
          padding: 0.5rem 1rem !important;
          font-size: 0.875rem !important;
        }
        
        /* Card tablet adjustments */
        .card, [data-component="card"] {
          padding: 1.25rem !important;
          border-radius: 0.75rem !important;
        }
      }
      
      /* Desktop viewport (1025px+) */
      @media (min-width: 1025px) {
        .container, .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
          padding-left: 2rem !important;
          padding-right: 2rem !important;
        }
        
        /* Desktop typography scaling */
        .desktop-text-scale h1 { font-size: 2.5rem !important; }
        .desktop-text-scale h2 { font-size: 2rem !important; }
        .desktop-text-scale h3 { font-size: 1.75rem !important; }
        .desktop-text-scale h4 { font-size: 1.5rem !important; }
        .desktop-text-scale h5 { font-size: 1.25rem !important; }
        .desktop-text-scale h6 { font-size: 1.125rem !important; }
        
        /* Button sizing for desktop */
        button:not(.btn-sm):not(.btn-xs) {
          height: 2.25rem !important;
          padding: 0.5rem 1.5rem !important;
          font-size: 0.875rem !important;
        }
        
        /* Card desktop adjustments */
        .card, [data-component="card"] {
          padding: 1.5rem !important;
          border-radius: 0.75rem !important;
        }
      }
      
      /* Color consistency enforcement */
      * {
        color: hsl(var(--foreground)) !important;
      }
      
      /* Background color fixes */
      .bg-white { background-color: hsl(var(--background)) !important; }
      .bg-gray-50, .bg-gray-100 { background-color: hsl(var(--muted)) !important; }
      .bg-gray-900, .bg-black { background-color: hsl(var(--foreground)) !important; }
      
      /* Text color fixes */
      .text-white { color: hsl(var(--background)) !important; }
      .text-black, .text-gray-900 { color: hsl(var(--foreground)) !important; }
      .text-gray-500, .text-gray-600 { color: hsl(var(--muted-foreground)) !important; }
      
      /* Border color fixes */
      .border-gray-200, .border-gray-300 { border-color: hsl(var(--border)) !important; }
      
      /* Font family consistency */
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Bebas Neue', cursive !important;
        font-weight: 400 !important;
        letter-spacing: 0.025em !important;
      }
      
      body, p, span, div, button, input, textarea, select {
        font-family: 'Roboto', sans-serif !important;
      }
      
      /* Ensure dropdowns have proper background and z-index */
      [data-radix-popper-content-wrapper] {
        background: hsl(var(--background)) !important;
        border: 1px solid hsl(var(--border)) !important;
        z-index: 1000 !important;
      }
      
      /* Navigation consistency */
      nav, [role="navigation"] {
        background: hsl(var(--background)) !important;
        border-color: hsl(var(--border)) !important;
      }
      
      /* Header consistency */
      header {
        background: hsl(var(--background)) !important;
        border-color: hsl(var(--border)) !important;
      }
      
      /* Footer consistency */
      footer {
        background: hsl(var(--background)) !important;
        border-color: hsl(var(--border)) !important;
      }
    `;
    
    // Only add if not already present
    if (!document.getElementById('responsive-design-enforcer')) {
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById('responsive-design-enforcer');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);
  
  return null;
};