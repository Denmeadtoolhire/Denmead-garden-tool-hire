import React from 'react';

export const Card = ({ children }: { children: React.ReactNode }) => {
  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      {children}
    </div>
  );
};