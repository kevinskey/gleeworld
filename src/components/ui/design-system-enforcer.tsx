/**
 * Design System Enforcer
 * This component systematically applies semantic color tokens across the app
 * replacing hardcoded gray, white, and black colors with theme-aware tokens
 */

import { useEffect } from 'react';

export const DesignSystemEnforcer = () => {
  useEffect(() => {
    // Apply comprehensive design system fixes
    const style = document.createElement('style');
    style.id = 'design-system-enforcer';
    style.textContent = `
      /* === CRITICAL COLOR SYSTEM FIXES === */
      
      /* Fix hardcoded text colors */
      .text-gray-900, .text-gray-800, .text-gray-700 {
        color: hsl(var(--foreground)) !important;
      }
      
      .text-gray-600, .text-gray-500 {
        color: hsl(var(--muted-foreground)) !important;
      }
      
      .text-gray-400, .text-gray-300 {
        color: hsl(var(--muted-foreground) / 0.7) !important;
      }
      
      /* Fix hardcoded background colors */
      .bg-gray-50, .bg-gray-100 {
        background-color: hsl(var(--muted)) !important;
      }
      
      .bg-gray-200, .bg-gray-300 {
        background-color: hsl(var(--muted) / 0.8) !important;
      }
      
      .bg-white {
        background-color: hsl(var(--background)) !important;
      }
      
      .text-white {
        color: hsl(var(--primary-foreground)) !important;
      }
      
      .text-black {
        color: hsl(var(--foreground)) !important;
      }
      
      .bg-black {
        background-color: hsl(var(--foreground)) !important;
      }
      
      /* Fix hardcoded border colors */
      .border-gray-200, .border-gray-300, .border-gray-400 {
        border-color: hsl(var(--border)) !important;
      }
      
      /* === RESPONSIVE TYPOGRAPHY FIXES === */
      
      /* Ensure consistent heading fonts */
      h1, h2, h3, h4, h5, h6, .font-bebas {
        font-family: 'Bebas Neue', cursive !important;
        font-weight: 400 !important;
        letter-spacing: 0.025em !important;
        color: hsl(var(--foreground)) !important;
      }
      
      /* Ensure consistent body fonts */
      p, div, span, input, button:not(.font-bebas) {
        font-family: 'Roboto', sans-serif !important;
      }
      
      /* === COMPONENT-SPECIFIC FIXES === */
      
      /* Button consistency */
      button[class*="bg-brand"] {
        background-color: hsl(var(--primary)) !important;
        color: hsl(var(--primary-foreground)) !important;
      }
      
      button[class*="bg-brand"]:hover {
        background-color: hsl(var(--primary) / 0.9) !important;
      }
      
      /* Card consistency */
      .card, [data-component="card"] {
        background-color: hsl(var(--card)) !important;
        color: hsl(var(--card-foreground)) !important;
        border-color: hsl(var(--border)) !important;
      }
      
      /* Input consistency */
      input, textarea, select {
        background-color: hsl(var(--input)) !important;
        color: hsl(var(--foreground)) !important;
        border-color: hsl(var(--border)) !important;
      }
      
      input:focus, textarea:focus, select:focus {
        border-color: hsl(var(--ring)) !important;
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2) !important;
      }
      
      /* Dropdown and popover consistency */
      [data-radix-popper-content-wrapper] [role="menu"],
      [data-radix-popper-content-wrapper] [role="listbox"],
      .dropdown-content {
        background-color: hsl(var(--popover)) !important;
        color: hsl(var(--popover-foreground)) !important;
        border-color: hsl(var(--border)) !important;
      }
      
      /* === RESPONSIVE TYPOGRAPHY FIXES === */
      
      @media (max-width: 768px) {
        /* Mobile text size consistency */
        h1 { font-size: 1.5rem !important; }
        h2 { font-size: 1.25rem !important; }
        h3 { font-size: 1.125rem !important; }
      }
      
      @media (min-width: 769px) and (max-width: 1024px) {
        h1 { font-size: 2rem !important; }
        h2 { font-size: 1.75rem !important; }
        h3 { font-size: 1.5rem !important; }
      }
      
      @media (min-width: 1025px) {
        h1 { font-size: 2.5rem !important; }
        h2 { font-size: 2rem !important; }
        h3 { font-size: 1.75rem !important; }
      }
      
      /* === HOVER STATE FIXES === */
      
      .hover\\:bg-gray-50:hover {
        background-color: hsl(var(--muted)) !important;
      }
      
      .hover\\:bg-gray-100:hover {
        background-color: hsl(var(--muted) / 0.8) !important;
      }
      
      .hover\\:text-gray-900:hover {
        color: hsl(var(--foreground)) !important;
      }
      
      /* === FOCUS STATE FIXES === */
      
      .focus\\:border-gray-400:focus {
        border-color: hsl(var(--ring)) !important;
      }
      
      .focus\\:ring-gray-200:focus {
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2) !important;
      }
      
      /* === ACCESSIBILITY FIXES === */
      
      /* Ensure minimum contrast ratios */
      .text-muted {
        color: hsl(var(--muted-foreground)) !important;
      }
      
      /* Fix placeholder text */
      ::placeholder {
        color: hsl(var(--muted-foreground) / 0.6) !important;
      }
      
      /* === SHADOW SYSTEM === */
      
      .shadow {
        box-shadow: var(--shadow-card) !important;
      }
      
      .shadow-md {
        box-shadow: var(--shadow-depth-1) !important;
      }
      
      .shadow-lg {
        box-shadow: var(--shadow-depth-2) !important;
      }
      
      .shadow-xl {
        box-shadow: var(--shadow-depth-3) !important;
      }
    `;
    
    // Idempotent append without removal to prevent flicker in StrictMode/dev
    const existing = document.getElementById('design-system-enforcer');
    if (!existing) {
      document.head.appendChild(style);
    }
    
    // Keep the style tag persistent across mounts to avoid visual blinking
    return () => {
      // no-op
    };
  }, []);
  
  return null;
};