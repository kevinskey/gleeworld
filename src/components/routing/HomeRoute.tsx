import React from 'react';

export const HomeRoute = () => {
  console.log('🏠 HomeRoute: ULTRA SIMPLE VERSION LOADING');
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a, #1e40af, #334155)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          Welcome to GleeWorld
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '2rem' }}>
          The official digital platform of the Spelman College Glee Club
        </p>
        <button 
          onClick={() => window.location.href = '/auth'}
          style={{
            background: 'white',
            color: '#1e3a8a',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
};