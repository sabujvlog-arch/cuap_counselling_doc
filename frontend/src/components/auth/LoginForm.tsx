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
    <div className="w-full max-w-[360px] animate-fade-in-up">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[14px] font-bold mb-4 transition cursor-pointer"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--text)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
        }}
      >
        <ArrowLeft size={14} /> Back to Portal Selection
      </button>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Portal header strip */}
        <div className="relative px-6 pt-5 pb-6" style={{ background: portal.gradientCss }}>
          <div
            className="absolute bottom-0 left-0 right-0 h-4 rounded-t-[20px]"
            style={{ background: 'var(--card)' }}
          />
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-[12px] bg-white/20 flex items-center justify-center">
              <Icon size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-[22px] font-bold text-white leading-tight">{portal.title}</h2>
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">
                {portal.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Form body */}
        <div className="px-6 pb-5 -mt-2">
          <ErrorAlert message={error} onClose={() => setError('')} className="mb-4" />

          {!requires2FA ? (
            /* ── Step 1: Credentials ── */
            <form onSubmit={handleLogin} className="space-y-[14px]">
              <div>
                <label
                  className="block text-[12px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text)' }}
                >
                  {portal.loginLabel}
                </label>
                <div className="relative h-[42px]">
                  <UserIcon
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    size={16}
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    id="login-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={portal.placeholder}
                    className="input w-full h-full pl-10 pr-4 text-[15px] placeholder:text-[13px] font-semibold rounded-[12px]"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-[12px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text)' }}
                >
                  Password
                </label>
                <div className="relative h-[42px]">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    size={16}
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input w-full h-full pl-10 pr-10 text-[15px] placeholder:text-[13px] font-semibold rounded-[12px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex justify-between items-center mt-[12px] px-0.5 text-[12px] font-bold">
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
                    className="cursor-pointer transition text-[12px]"
                    style={{ color: 'var(--primary)' }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="text-[10px] font-semibold text-slate-400 mt-2 px-0.5">
                  {portal.passwordHint}
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-[42px] text-[14px] font-bold mt-[16px] rounded-[12px] flex items-center justify-center animate-pulse"
              >
                {loading ? 'Signing In…' : `Enter ${portal.title} →`}
              </button>
            </form>
          ) : (
            /* ── Step 2: 2FA OTP ── */
            <form onSubmit={handle2FA} className="space-y-[14px]">
              <div
                className="p-3 rounded-[12px] text-[13px] leading-relaxed font-semibold"
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
                  className="block text-[12px] font-bold uppercase text-center tracking-wider mb-1.5"
                  style={{ color: 'var(--text)' }}
                >
                  6-Digit OTP Code
                </label>
                <div className="relative h-[42px]">
                  <KeyRound
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    size={16}
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
                    className="input w-full h-full text-center pl-10 pr-4 text-[16px] placeholder:text-[14px] font-bold font-mono tracking-widest rounded-[12px]"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-[16px]">
                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setError('');
                    setOtpCode('');
                  }}
                  className="btn-secondary w-1/3 h-[42px] text-[14px] font-bold rounded-[12px] flex items-center justify-center"
                >
                  Back
                </button>
                <button
                  id="otp-submit-btn"
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="btn-primary flex-1 h-[42px] text-[14px] font-bold rounded-[12px] flex items-center justify-center animate-pulse"
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
