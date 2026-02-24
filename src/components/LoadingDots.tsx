import React from 'react';

export default function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
          style={{
            animation: `momo-dots 0.6s ${i * 0.2}s ease-in-out infinite`,
          }}
        />
      ))}
    </span>
  );
}
