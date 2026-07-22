'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import {
  Lock,
  ChevronRight,
  Eye,
  EyeOff,
  Shield,
  Mail,
  User as UserIcon,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { APP } from '@/constants/app';
import type { PortalId } from '@/constants/app';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ChatbotWidget from '@/components/auth/ChatbotWidget';
import ErrorAlert from '@/components/ui/ErrorAlert';
import PortalSelector from '@/components/auth/PortalSelector';
import LoginForm from '@/components/auth/LoginForm';

// ── Lazy-loaded role dashboards ─────────────────────────────────
const DashboardAdmin = lazy(() => import('@/components/DashboardAdmin'));
const DashboardProvider = lazy(() => import('@/components/DashboardProvider'));
const DashboardStudent = lazy(() => import('@/components/DashboardStudent'));
const DashboardFrontDesk = lazy(() => import('@/components/DashboardFrontDesk'));
const DashboardTechnician = lazy(() => import('@/components/DashboardTechnician'));
const DashboardDeptHead = lazy(() => import('@/components/DashboardDeptHead'));

// ─────────────────────────────────────────────────────────────────
// Dashboard router
// ─────────────────────────────────────────────────────────────────
function DashboardRouter() {
  const { role, user, profile, logout } = useAuth();
  const sharedProps = { onLogout: logout, user };

  switch (role) {
    case 'admin':
    case 'super-admin':
      return <DashboardAdmin {...sharedProps} adminUsername={user?.username ?? ''} />;
    case 'provider':
    case 'clinician':
      return <DashboardProvider {...sharedProps} providerProfile={profile} />;
    case 'student':
      return <DashboardStudent {...sharedProps} studentProfile={profile} />;
    case 'front-desk':
      return <DashboardFrontDesk {...sharedProps} />;
    case 'technician':
      return <DashboardTechnician {...sharedProps} />;
    case 'dept-head':
      return <DashboardDeptHead {...sharedProps} providerProfile={profile} />;
    default:
      return (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--bg)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Unknown role: <code>{role}</code>. Please contact your system administrator.
          </p>
        </div>
      );
  }
}

// ─────────────────────────────────────────────────────────────────
// Security Login Card  (matches reference screenshot style)
// ─────────────────────────────────────────────────────────────────
function SecurityLoginCard() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpUser, setOtpUser] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

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
        setError(result.error ?? 'Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpLoading(true);
    try {
      const { api } = await import('@/lib/api');
      await api.auth.verify2FA(otpUser, otpCode);
      // AuthContext will detect the token and redirect
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-[420px] rounded-2xl overflow-hidden animate-fade-in-up"
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.6)',
      }}
    >
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-5">
        {/* CUAP Brand Row */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
          <Image
            src="/logo.png"
            alt="CUAP Emblem"
            width={52}
            height={52}
            className="object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
              ಕೇಂದ್ರ ವಿಶ್ವವಿದ್ಯಾಲಯ · ಆಂಧ್ರ ಪ್ರದೇಶ
            </p>
            <p className="text-[11px] font-black text-blue-700 uppercase tracking-wide leading-tight">
              Central University of Andhra Pradesh
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Established by an act of Parliament in 2009.
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-xl bg-blue-50">
            <Shield size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 leading-tight">Security Portal</h1>
            <p className="text-[11px] text-slate-400 font-semibold">{APP.systemFull}</p>
          </div>
        </div>

        <ErrorAlert message={error} onClose={() => setError('')} className="mb-4" />

        {/* ── Login Form ── */}
        {!requires2FA ? (
          <form onSubmit={handleLogin} className="space-y-3">
            {/* Username */}
            <div className="relative">
              <UserIcon
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username / Registration Number"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={{
                  background: '#F1F5F9',
                  border: '1.5px solid #E2E8F0',
                  color: '#0F172A',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.background = '#F1F5F9';
                }}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password / PIN"
                className="w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={{
                  background: '#F1F5F9',
                  border: '1.5px solid #E2E8F0',
                  color: '#0F172A',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.background = '#F1F5F9';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer"
              style={{
                background: loading
                  ? '#93C5FD'
                  : 'linear-gradient(135deg, #2563EB 0%, #3B82F6 60%, #60A5FA 100%)',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                opacity: !username || !password ? 0.6 : 1,
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </span>
              ) : (
                <>
                  <Lock size={14} />
                  Unlock Portal
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* ── 2FA Form ── */
          <form onSubmit={handleOtp} className="space-y-3">
            <div
              className="p-3 rounded-xl text-xs font-semibold leading-relaxed"
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}
            >
              A 6-digit code has been sent. Enter it below to unlock your session.
            </div>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="otp-input"
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-center text-lg font-black tracking-[0.4em] outline-none transition-all"
                style={{ background: '#F1F5F9', border: '1.5px solid #E2E8F0', color: '#0F172A' }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.background = '#F1F5F9';
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setError('');
                  setOtpCode('');
                }}
                className="w-1/3 py-2.5 rounded-xl text-xs font-bold border text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                style={{ border: '1.5px solid #E2E8F0' }}
              >
                Back
              </button>
              <button
                id="otp-submit-btn"
                type="submit"
                disabled={otpLoading || otpCode.length < 6}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                  opacity: otpCode.length < 6 ? 0.6 : 1,
                }}
              >
                {otpLoading ? 'Verifying…' : 'Unlock Session →'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Footer Contact ── */}
      <div className="px-8 py-5 text-center border-t border-slate-100">
        <p className="text-[10px] text-slate-400 mb-1">Contact developer for help:</p>
        <a
          href="mailto:admin@cuap.edu.in"
          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition flex items-center justify-center gap-1 mb-1"
        >
          <Mail size={10} />
          admin@cuap.edu.in
        </a>
        <p className="text-[10px] font-semibold text-slate-500">Shri Abhishek More Tripathi</p>
        <p className="text-[10px] text-slate-400">Analyst and Lead Developer — Data Centre, CUAP</p>
      </div>

      {/* ── Theme toggle inside card ── */}
      <div className="flex justify-center pb-4">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, role, loading } = useAuth();
  const { mode, toggleTheme, isDark } = useTheme();
  const [selectedPortal, setSelectedPortal] = useState<PortalId | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated && role) {
      if (role === 'student') {
        router.push('/student/dashboard');
      } else if (role === 'provider' || role === 'clinician' || role === 'dept-head') {
        router.push('/counselor/dashboard');
      } else if (role === 'admin' || role === 'super-admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [isAuthenticated, role, loading, router]);

  if (loading) {
    return <LoadingSpinner fullPage label="Checking session…" size="lg" />;
  }

  // If already authenticated and redirected, show loading
  if (isAuthenticated && role) {
    return <LoadingSpinner fullPage label="Redirecting to dashboard…" size="lg" />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-200 transition-colors duration-200">
      {/* ── Left Pane: Branding & Rotating Features (Desktop only) ── */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-12 text-white flex-col justify-between relative overflow-hidden shrink-0">
        {/* Background decorative glowing shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* University logo block */}
        <div className="flex items-center gap-4 relative z-10">
          <Image
            src="/logo.png"
            alt="CUAP Emblem"
            width={56}
            height={56}
            priority
            className="object-contain bg-white/10 p-1 rounded-full backdrop-blur-md"
          />
          <div>
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest leading-none mb-0.5">
              ಕೇಂದ್ರ ವಿಶ್ವವಿದ್ಯಾಲಯ · ಆಂಧ್ರ ಪ್ರದೇಶ
            </p>
            <p className="text-sm font-extrabold text-white leading-tight">
              Central University of Andhra Pradesh
            </p>
            <p className="text-[9.5px] text-blue-200/70">
              Established by an Act of Parliament in 2009.
            </p>
          </div>
        </div>

        {/* Dynamic / Testimonial & System features area */}
        <div className="my-auto space-y-8 relative z-10 max-w-md">
          <div>
            <span className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Counselling E-Portal
            </span>
            <h2 className="text-3xl font-black mt-4 leading-tight">
              Wellness Counseling Centre Management System
            </h2>
            <p className="text-sm text-blue-100/80 mt-2 font-medium">
              Empowering the student community with confidential EMR support, online counseling
              appointments, and AI-enabled diagnostics.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 shrink-0 h-10 w-10 flex items-center justify-center">
                <Shield size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Confidential Clinical EMR</h4>
                <p className="text-xs text-blue-100/75 mt-0.5">
                  Secure SOAP notes, MSE evaluations, and history logs fully encrypted at rest.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 shrink-0 h-10 w-10 flex items-center justify-center">
                <Lock size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Role-Based Access Control</h4>
                <p className="text-xs text-blue-100/75 mt-0.5">
                  Dedicated gates for Students, Staff, and Administrators to safeguard clinical
                  boundaries.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 shrink-0 h-10 w-10 flex items-center justify-center">
                <Mail size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">UniMind AI Support</h4>
                <p className="text-xs text-blue-100/75 mt-0.5">
                  AI-assisted appointment reservations, and real-time clinical suggestions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-blue-200/50 relative z-10 flex justify-between">
          <span>{APP.copyright}</span>
          <span>Version {APP.version}</span>
        </div>
      </div>

      {/* ── Right Pane: Form selectors (All devices) ── */}
      <div className="flex-1 flex flex-col justify-between min-h-screen">
        {/* Header for mobile view / Top Bar for desktop */}
        <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-850/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="CUAP Logo"
              width={34}
              height={34}
              priority
              className="rounded-full lg:hidden"
            />
            <h1 className="text-xs md:text-sm font-extrabold text-slate-800 dark:text-white tracking-tight">
              WCCMS Portal Gateway
            </h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Form Container */}
        <main className="flex-1 flex items-center justify-center p-6 md:p-12">
          {!selectedPortal ? (
            <PortalSelector onSelect={setSelectedPortal} />
          ) : (
            <LoginForm portalId={selectedPortal} onBack={() => setSelectedPortal(null)} />
          )}
        </main>

        {/* Footer for mobile/tablet */}
        <footer className="lg:hidden text-center py-4 border-t border-slate-100 dark:border-slate-850 px-6 text-[10px] text-slate-400">
          {APP.copyright}
        </footer>
      </div>

      {/* Floating ChatbotWidget */}
      <div className="relative z-20">
        <ChatbotWidget />
      </div>
    </div>
  );
}
