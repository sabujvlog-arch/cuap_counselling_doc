'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface ErrorAlertProps {
  message: string;
  variant?: AlertVariant;
  onClose?: () => void;
  className?: string;
}

const config: Record<
  AlertVariant,
  {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }
> = {
  error: {
    bg: 'var(--danger-bg)',
    border: 'var(--danger-border)',
    text: 'var(--danger-text)',
    icon: AlertCircle,
  },
  success: {
    bg: 'var(--success-bg)',
    border: 'var(--success-border)',
    text: 'var(--success-text)',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'var(--warning-bg)',
    border: 'var(--warning-border)',
    text: 'var(--warning-text)',
    icon: AlertTriangle,
  },
  info: {
    bg: 'var(--info-bg)',
    border: 'var(--info-border)',
    text: 'var(--info-text)',
    icon: Info,
  },
};

export default function ErrorAlert({
  message,
  variant = 'error',
  onClose,
  className = '',
}: ErrorAlertProps) {
  if (!message) return null;
  const { bg, border, text, icon: Icon } = config[variant];

  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-xl text-xs font-semibold leading-relaxed ${className}`}
      style={{ background: bg, border: `1px solid ${border}`, color: text }}
      role="alert"
    >
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
