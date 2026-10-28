'use client';

import React from 'react';

export default function FlatPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: '#111317' }}>
      <a
        href="/"
        style={{
          position: 'fixed',
          top: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(20, 23, 29, 0.92)',
          border: '1px solid #d4a359',
          color: '#f3f4f6',
          padding: '7px 14px',
          borderRadius: '11px',
          fontSize: '0.78rem',
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)'
        }}
      >
        ⬅️ Înapoi la Configurator Bucătărie 3D
      </a>
      <iframe
        src="/flat-viewer.html"
        title="Apartament 3D Complet"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
    </div>
  );
}
