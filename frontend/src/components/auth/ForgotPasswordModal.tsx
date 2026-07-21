'use client';

import React, { useState } from 'react';
import { Mail, User as UserIcon, X } from 'lucide-react';
import { api } from '@/lib/api';
import ErrorAlert from '@/components/ui/ErrorAlert';

interface ForgotPasswordModalProps {
  initialUsername?: string;
  onClose: () => void;
}

export default function ForgotPasswordModal({
  initialUsername = '',
  onClose,
}: ForgotPasswordModalProps) {
  const [forgotUsername, setForgotUsername] = useState(initialUsername);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(forgotUsername);
      setSuccess(res.message ?? 'If the username is registered, a reset link has been sent.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative rounded-3xl max-w-md w-full p-6"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 transition cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl" style={{ background: 'var(--primary-light)' }}>
            <Mail size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h3 className="font-extrabold text-lg" style={{ color: 'var(--text)' }}>
              Password Recovery
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Request a secure reset link
            </p>
          </div>
        </div>

        <ErrorAlert message={error} onClose={() => setError('')} className="mb-4" />
        <ErrorAlert message={success} variant="success" className="mb-4" />

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-bold uppercase mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Username / Reg Number
              </label>
              <div className="relative">
                <UserIcon
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  size={15}
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  id="forgot-username-input"
                  type="text"
                  required
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  placeholder="e.g. 23BEC04 or admin"
                  className="input w-full pl-10 pr-3 py-2.5 text-sm font-medium"
                />
              </div>
            </div>
            <button
              id="forgot-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm font-bold"
            >
              {loading ? 'Requesting…' : 'Send Recovery Email'}
            </button>
          </form>
        ) : (
          <button onClick={onClose} className="btn-secondary w-full py-2.5 text-sm font-bold">
            Close
          </button>
        )}
      </div>
    </div>
  );
}
