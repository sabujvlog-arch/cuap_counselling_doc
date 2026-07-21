'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  fullPage?: boolean;
}

const sizeMap = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4',
};

export default function LoadingSpinner({
  size = 'md',
  label,
  fullPage = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizeMap[size]} rounded-full border-[var(--primary-light)] border-t-[var(--primary)] animate-spin`}
        style={{
          borderColor: 'var(--primary-light)',
          borderTopColor: 'var(--primary)',
        }}
        role="status"
        aria-label={label ?? 'Loading…'}
      />
      {label && (
        <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
