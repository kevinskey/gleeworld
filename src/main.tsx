import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AudioCompanionProvider } from './contexts/AudioCompanionContext'

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AudioCompanionProvider>
      <App />
    </AudioCompanionProvider>
  </React.StrictMode>
);
