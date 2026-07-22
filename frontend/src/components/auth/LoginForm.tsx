'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User as UserIcon, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { PORTALS } from '@/constants/app';
import type { PortalId } from '@/constants/app';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import ErrorAlert from '@/components/ui/ErrorAlert';
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';

interface LoginFormProps {
  portalId: PortalId;
  onBack: () => void;
}

/**
 * LoginForm — handles credentials + 2FA steps for any portal type.
 * Extracted from page.tsx. Consumes AuthContext.
 */
export default function LoginForm({ portalId, onBack }: LoginFormProps) {
  // ── All hooks at top level (React rules) ───────────────────────
  const { login, refreshSession } = useAuth();
  const router = useRouter();
  const portal = PORTALS.find((p) => p.id === portalId)!;

  // Step 1 — credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load saved username
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cuap_remembered_username_' + portalId);
      if (saved) {
        setUsername(saved);
        setRememberMe(true);
      }
    }
  }, [portalId]);

  // Step 2 — 2FA
  const [requires2FA, setRequires2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpUser, setOtpUser] = useState('');

  // Forgot password modal
  const [showForgot, setShowForgot] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login({ username, password });
      if (result.requires2FA) {
        setRequires2FA(true);
        setOtpUser(result.username ?? username);
      } else if (!result.success) {
        setError(result.error ?? 'Invalid username or password.');
      } else {
        // Save or clear username
        if (rememberMe) {
          localStorage.setItem('cuap_remembered_username_' + portalId, username);
        } else {
          localStorage.removeItem('cuap_remembered_username_' + portalId);
        }

        // Redirect on successful login
        if (portalId === 'student') {
          router.push('/student/dashboard');
        } else if (portalId === 'provider') {
          router.push('/counselor/dashboard');
        } else if (portalId === 'admin') {
          router.push('/admin/dashboard');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.verify2FA(otpUser, otpCode);
      await refreshSession(); // refreshSession is already destructured at top level ✓

      // Save username if rememberMe was checked
      if (rememberMe) {
        localStorage.setItem('cuap_remembered_username_' + portalId, username);
      } else {
        localStorage.removeItem('cuap_remembered_username_' + portalId);
      }

      // Redirect on successful 2FA
      if (portalId === 'student') {
        router.push('/student/dashboard');
      } else if (portalId === 'provider') {
        router.push('/counselor/dashboard');
      } else if (portalId === 'admin') {
        router.push('/admin/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Incorrect verification code.');
    } finally {
      setLoading(false);
    }
  };

  const Icon = portal.icon;

  return (
    <div className="w-full max-w-[380px] animate-fade-in-up">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[16px] font-bold mb-6 transition cursor-pointer"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--text)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
        }}
      >
        <ArrowLeft size={16} /> Back to Portal Selection
      </button>

      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Portal header strip */}
        <div className="relative px-6 pt-6 pb-8" style={{ background: portal.gradientCss }}>
          <div
            className="absolute bottom-0 left-0 right-0 h-6 rounded-t-[28px]"
            style={{ background: 'var(--card)' }}
          />
          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 rounded-[14px] bg-white/20 flex items-center justify-center">
              <Icon size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-[28px] font-bold text-white leading-tight">{portal.title}</h2>
              <p className="text-white/70 text-[13px] font-semibold uppercase tracking-wider">
                {portal.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Form body */}
        <div className="px-6 pb-6 -mt-4">
          <ErrorAlert message={error} onClose={() => setError('')} className="mb-4" />

          {!requires2FA ? (
            /* ── Step 1: Credentials ── */
            <form onSubmit={handleLogin} className="space-y-[20px]">
              <div>
                <label
                  className="block text-[14px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text)' }}
                >
                  {portal.loginLabel}
                </label>
                <div className="relative h-[48px]">
                  <UserIcon
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    size={20}
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    id="login-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={portal.placeholder}
                    className="input w-full h-full pl-12 pr-4 text-[18px] placeholder:text-[16px] font-medium rounded-[14px]"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-[14px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text)' }}
                >
                  Password
                </label>
                <div className="relative h-[48px]">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    size={20}
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input w-full h-full pl-12 pr-12 text-[18px] placeholder:text-[16px] font-medium rounded-[14px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div className="flex justify-between items-center mt-[16px] px-0.5 text-[14px] font-bold">
                  <label
                    className="flex items-center gap-2 cursor-pointer select-none"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500/20"
                    />
                    Remember Me
                  </label>
                  <button
                    type="button"
                    id="forgot-password-btn"
                    onClick={() => setShowForgot(true)}
                    className="cursor-pointer transition text-[14px]"
                    style={{ color: 'var(--primary)' }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-2 px-0.5">
                  {portal.passwordHint}
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-[48px] text-[16px] font-bold mt-[20px] rounded-[14px] flex items-center justify-center"
              >
                {loading ? 'Signing In…' : `Enter ${portal.title} →`}
              </button>
            </form>
          ) : (
            /* ── Step 2: 2FA OTP ── */
            <form onSubmit={handle2FA} className="space-y-[20px]">
              <div
                className="p-3 rounded-[14px] text-[15px] leading-relaxed font-semibold"
                style={{
                  background: 'var(--info-bg)',
                  border: '1px solid var(--info-border)',
                  color: 'var(--info-text)',
                }}
              >
                Two-factor authentication required. Check the server terminal for your 6-digit OTP
                code.
              </div>
              <div>
                <label
                  className="block text-[14px] font-bold uppercase text-center tracking-wider mb-2"
                  style={{ color: 'var(--text)' }}
                >
                  6-Digit OTP Code
                </label>
                <div className="relative h-[48px]">
                  <KeyRound
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    size={20}
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    id="otp-input"
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="input w-full h-full text-center pl-12 pr-4 text-[18px] placeholder:text-[16px] font-bold font-mono tracking-widest rounded-[14px]"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-[20px]">
                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setError('');
                    setOtpCode('');
                  }}
                  className="btn-secondary w-1/3 h-[48px] text-[16px] font-bold rounded-[14px] flex items-center justify-center"
                >
                  Back
                </button>
                <button
                  id="otp-submit-btn"
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="btn-primary flex-1 h-[48px] text-[16px] font-bold rounded-[14px] flex items-center justify-center"
                >
                  {loading ? 'Verifying…' : 'Unlock Session'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {showForgot && (
        <ForgotPasswordModal initialUsername={username} onClose={() => setShowForgot(false)} />
      )}
    </div>
  );
}
