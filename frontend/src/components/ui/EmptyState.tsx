'use client';

import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {icon ?? <Inbox size={24} style={{ color: 'var(--text-muted)' }} />}
      </div>
      <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>
        {title}
      </h3>
      {description && (
        <p
          className="text-xs leading-relaxed max-w-xs mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
