'use client';

import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — Catches unhandled React errors and shows a safe fallback UI.
 * Wrap each major dashboard section with this to prevent the whole app crashing.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production: send to error reporting service (Sentry, etc.)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="min-h-[300px] flex flex-col items-center justify-center gap-4 p-8 rounded-2xl"
          style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--card)' }}
          >
            <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--danger-text)' }}>
              Something went wrong
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            style={{ background: 'var(--danger)', color: 'white' }}
          >
            <RefreshCw size={13} /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
