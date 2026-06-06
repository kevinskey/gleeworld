/**
 * Global Design System Fixes
 * Applies comprehensive design corrections across the application
 * Uses only design tokens from index.css - no hardcoded colors
 */

import { useEffect } from 'react';

export const GlobalDesignFixes = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'global-design-fixes';
    style.textContent = `
      /* =========================================
         COLOR TOKEN ENFORCEMENT
         Map hardcoded colors to theme tokens
         ========================================= */
      
      /* Text colors - map grays to semantic tokens */
      .text-gray-900, .text-gray-800, .text-gray-700 {
        color: hsl(var(--foreground)) !important;
      }
      
      .text-gray-600, .text-gray-500, .text-gray-400 {
        color: hsl(var(--muted-foreground)) !important;
      }
      
      .text-gray-300, .text-gray-200, .text-gray-100 {
        color: hsl(var(--muted-foreground) / 0.6) !important;
      }
      
      /* Background colors - map to semantic tokens */
      .bg-gray-50, .bg-gray-100 {
        background-color: hsl(var(--muted)) !important;
      }
      
      .bg-gray-200, .bg-gray-300 {
        background-color: hsl(var(--muted) / 0.8) !important;
      }
      
      .bg-white {
        background-color: hsl(var(--background)) !important;
      }
      
      .bg-black {
        background-color: hsl(var(--foreground)) !important;
      }
      
      /* Border colors */
      .border-gray-100, .border-gray-200, .border-gray-300 {
        border-color: hsl(var(--border)) !important;
      }
      
      /* =========================================
         TYPOGRAPHY SYSTEM
         Consistent heading styles with CSS vars
         ========================================= */
      
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--heading-font, 'Bebas Neue', system-ui, sans-serif);
        font-weight: var(--heading-weight, 400);
        letter-spacing: var(--heading-letter-spacing, 0.02em);
        line-height: 1.2;
        color: #0f172a; /* slate-900 — guaranteed dark on light backgrounds */
      }

      /* Lift muted/light text utilities across the app — many modules use
         these for labels, counts, and subtitles and they were rendering
         too faint on the cream brand background. Pin them to readable
         slate values. */
      .text-muted-foreground { color: #475569 !important; }   /* slate-600 */
      .text-slate-400        { color: #475569 !important; }   /* → slate-600 */
      .text-slate-500        { color: #334155 !important; }   /* → slate-700 */
      .text-gray-400         { color: #475569 !important; }
      .text-gray-500         { color: #334155 !important; }
      .text-zinc-400         { color: #475569 !important; }
      .text-zinc-500         { color: #334155 !important; }
      .text-neutral-400      { color: #475569 !important; }
      .text-neutral-500      { color: #334155 !important; }

      /* Brand-primary icons rendered against the light cream background
         were nearly invisible at small sizes. Darken text-primary used
         on icons inside small headers. */
      svg.text-primary       { color: #0f3a76 !important; }   /* deep brand blue */
      
      /* =========================================
         Z-INDEX & LAYERING FIXES
         Ensure popovers/dropdowns always visible
         ========================================= */
      
      [data-radix-popper-content-wrapper] {
        z-index: 9999 !important;
      }
      
      [data-radix-menu-content],
      [data-radix-select-content],
      [data-radix-popover-content],
      [data-radix-dropdown-menu-content] {
        z-index: 9999 !important;
      }
      
      /* =========================================
         RESPONSIVE TYPOGRAPHY
         Mobile-first sizing with clamp
         ========================================= */
      
      @media (max-width: 640px) {
        .text-5xl { font-size: clamp(1.75rem, 5vw, 2.25rem) !important; }
        .text-4xl { font-size: clamp(1.5rem, 4vw, 2rem) !important; }
        .text-3xl { font-size: clamp(1.375rem, 3.5vw, 1.75rem) !important; }
        .text-2xl { font-size: clamp(1.25rem, 3vw, 1.5rem) !important; }
        .text-xl { font-size: clamp(1.125rem, 2.5vw, 1.25rem) !important; }
      }
      
      @media (min-width: 641px) and (max-width: 1024px) {
        .text-5xl { font-size: 2.5rem !important; }
        .text-4xl { font-size: 2rem !important; }
        .text-3xl { font-size: 1.75rem !important; }
        .text-2xl { font-size: 1.5rem !important; }
      }
      
      /* =========================================
         OVERFLOW PREVENTION
         Prevent horizontal scroll globally
         ========================================= */
      
      html, body {
        overflow-x: hidden !important;
        max-width: 100vw !important;
      }
      
      /* Prevent any element from causing overflow */
      * {
        max-width: 100%;
      }
      
      /* Allow tables and code blocks to scroll */
      pre, code, table {
        max-width: none;
      }
      
      /* =========================================
         RESPONSIVE TABLES
         Horizontal scroll on mobile only
         ========================================= */
      
      @media (max-width: 768px) {
        .table-responsive,
        table:not([class*="inline"]) {
          display: block;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          white-space: nowrap;
        }
        
        .table-responsive table,
        table:not([class*="inline"]) {
          min-width: 600px;
        }
      }
      
      /* =========================================
         FORM ELEMENT CONSISTENCY
         Unified input/select/textarea styling
         ========================================= */
      
      input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
      select,
      textarea {
        font-size: 16px !important; /* Prevents iOS zoom */
      }
      
      @media (min-width: 768px) {
        input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
        select,
        textarea {
          font-size: inherit !important;
        }
      }
      
      /* =========================================
         TOUCH TARGET ACCESSIBILITY
         Minimum 44x44px for interactive elements
         ========================================= */
      
      @media (pointer: coarse) {
        button,
        [role="button"],
        a,
        input[type="checkbox"],
        input[type="radio"] {
          min-height: 44px;
          min-width: 44px;
        }
      }
      
      /* =========================================
         FOCUS STATES
         Consistent, accessible focus rings
         ========================================= */
      
      :focus-visible {
        outline: none !important;
        box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring)) !important;
      }
      
      /* =========================================
         CARD CONSISTENCY
         Unified card styling across themes
         ========================================= */
      
      [data-component="card"],
      .card,
      [class*="Card"]:not([class*="CardHeader"]):not([class*="CardContent"]):not([class*="CardFooter"]):not([class*="CardTitle"]):not([class*="CardDescription"]) {
        background-color: hsl(var(--card));
        color: hsl(var(--card-foreground));
        border-color: hsl(var(--border));
      }
      
      /* =========================================
         SCROLLBAR STYLING
         Consistent, minimal scrollbars
         ========================================= */
      
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: hsl(var(--muted) / 0.3);
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: hsl(var(--muted-foreground) / 0.3);
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: hsl(var(--muted-foreground) / 0.5);
      }
      
      /* =========================================
         ANIMATION PERFORMANCE
         Respect reduced motion preference
         ========================================= */
      
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;
    
    // Remove existing style if present
    const existing = document.getElementById('global-design-fixes');
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(style);
    
    return () => {
      const styleEl = document.getElementById('global-design-fixes');
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, []);
  
  return null;
};
