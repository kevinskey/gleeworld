/**
 * Design System Enforcer
 * Minimal enforcement of semantic tokens for legacy gray classes only.
 * Components should use semantic tokens directly (bg-card, text-foreground, etc.)
 * rather than relying on this enforcer.
 */

import { useEffect } from 'react';

export const DesignSystemEnforcer = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'design-system-enforcer';
    style.textContent = `
      /* === LEGACY GRAY CLASS MAPPINGS === */
      /* Only maps old gray- classes to semantic tokens */
      /* New code should use semantic classes directly */
      
      .text-gray-900, .text-gray-800, .text-gray-700 {
        color: hsl(var(--foreground));
      }
      
      .text-gray-600, .text-gray-500 {
        color: hsl(var(--muted-foreground));
      }
      
      .text-gray-400, .text-gray-300 {
        color: hsl(var(--muted-foreground) / 0.7);
      }
      
      .bg-gray-50, .bg-gray-100 {
        background-color: hsl(var(--muted));
      }
      
      .bg-gray-200, .bg-gray-300 {
        background-color: hsl(var(--muted) / 0.8);
      }
      
      .border-gray-200, .border-gray-300, .border-gray-400 {
        border-color: hsl(var(--border));
      }
      
      /* === HOVER STATE MAPPINGS === */
      
      .hover\\:bg-gray-50:hover {
        background-color: hsl(var(--muted));
      }
      
      .hover\\:bg-gray-100:hover {
        background-color: hsl(var(--muted) / 0.8);
      }
      
      .hover\\:text-gray-900:hover {
        color: hsl(var(--foreground));
      }
      
      /* === FOCUS STATE MAPPINGS === */
      
      .focus\\:border-gray-400:focus {
        border-color: hsl(var(--ring));
      }
      
      /* === PLACEHOLDER TEXT === */
      
      ::placeholder {
        color: hsl(var(--muted-foreground) / 0.6);
      }
    `;
    
    const existing = document.getElementById('design-system-enforcer');
    if (!existing) {
      document.head.appendChild(style);
    }
    
    return () => {
      // Keep style persistent to avoid flicker
    };
  }, []);
  
  return null;
};
