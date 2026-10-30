import React from 'react';
import './globals.css';

export const metadata = {
  title: '3D Kitchen Furniture Configurator — Bucătărie 3D (Vinext)',
  description:
    'Interactive 3D CAD Kitchen Configurator with Custom Material Upload, Lighting Studio, and Dimensions in cm'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#121419" />
      </head>
      <body>{children}</body>
    </html>
  );
}
