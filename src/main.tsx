
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('main.tsx: Starting app initialization');

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error('main.tsx: Root element not found!');
    throw new Error("Root element not found");
  }

  console.log('main.tsx: Root element found, creating React root');
  const root = createRoot(rootElement);

  console.log('main.tsx: Rendering App component');
  root.render(<App />);

  console.log('main.tsx: App rendered successfully');
} catch (error) {
  console.error('main.tsx: Failed to initialize app:', error);
  
  // Fallback error display
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        min-height: 100vh; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        background: linear-gradient(to bottom right, #1e3a8a, #1e40af, #334155);
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="text-align: center; padding: 2rem;">
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">Application Error</h1>
          <p style="margin-bottom: 1rem;">The application failed to load properly.</p>
          <p style="margin-bottom: 1rem; color: #ef4444;">Error: ${error.message}</p>
          <button onclick="window.location.reload()" style="
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 0.5rem 1rem; 
            border-radius: 0.375rem;
            cursor: pointer;
          ">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}
