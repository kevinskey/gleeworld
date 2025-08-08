import React from 'react';
import { useLocation } from 'react-router-dom';

export const RouteDebugger = () => {
  const location = useLocation();
  
  return (
    <div className="fixed top-0 right-0 bg-red-500 text-white p-2 z-[999] text-xs">
      <div>Route: {location.pathname}</div>
      <div>Component: RouteDebugger Active</div>
      <div>Time: {new Date().toLocaleTimeString()}</div>
    </div>
  );
};