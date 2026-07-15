"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import DashboardAdmin from '@/components/DashboardAdmin';
import DashboardProvider from '@/components/DashboardProvider';
import DashboardStudent from '@/components/DashboardStudent';
import { Lock, User as UserIcon, ShieldCheck, PhoneCall, HelpCircle, KeyRound, Sparkles, ChevronRight, Eye } from 'lucide-react';

export default function Home() {
  const [session, setSession] = useState<{ user: any; profile: any } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Login form states
  const [showPortal, setShowPortal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSentUser, setOtpSentUser] = useState('');

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.auth.me();
      setSession(data);
      setShowPortal(true);
    } catch (err) {
      console.error("Expired session token cleared.");
      api.clearToken();
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      const res = await api.auth.login({
        username,
        password
      });

      if (res.requires2FA) {
        setRequires2FA(true);
        setOtpSentUser(res.username);
      } else {
        // Fallback or immediate login
        const data = await api.auth.me();
        setSession(data);
        setShowPortal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setAuthLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      await api.auth.verify2FA(otpSentUser, otpCode);
      const data = await api.auth.me();
      setSession(data);
      setShowPortal(true);
      
      // Clear OTP form states
      setRequires2FA(false);
      setOtpCode('');
      setOtpSentUser('');
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Incorrect verification code. Please check server logs.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearToken();
    setSession(null);
    setShowPortal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center font-bold text-slate-500">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        Checking WCCMS Portal Session...
      </div>
    );
  }

  // Render dashboard depending on verified active session
  if (session) {
    const role = session.user.role;
    if (role === 'admin') {
      return <DashboardAdmin onLogout={handleLogout} adminUsername={session.user.username} />;
    } else if (role === 'provider') {
      return <DashboardProvider onLogout={handleLogout} providerProfile={session.profile} user={session.user} />;
    } else if (role === 'student') {
      return <DashboardStudent onLogout={handleLogout} studentProfile={session.profile} user={session.user} />;
    }
  }

  // Render Portal login or landing screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20 flex flex-col justify-between p-6">
      
      {/* Top Banner Branding */}
      <header className="flex justify-between items-center max-w-7xl mx-auto w-full mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 flex items-center justify-center font-bold text-white rounded-xl shadow-md">
            CUAP
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Central University of Andhra Pradesh</h1>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Wellness Counseling Centre</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <PhoneCall size={14} className="text-red-500" /> Helpline: 800-425-CUAP
        </div>
      </header>

      {/* Main landing cards layout */}
      <main className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto w-full py-6">
        
        {!showPortal ? (
          // Dynamic Landing Splash
          <div className="text-center space-y-6 max-w-2xl animate-fade-in-up">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-full text-blue-600 dark:text-blue-400 font-semibold text-xs mb-2">
              <Sparkles size={12} /> University EMHR Gateway
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              A Secure Portal for <br />
              <span className="text-blue-600 dark:text-blue-400">Mental Health & Wellness</span>
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-lg mx-auto">
              Welcome to the central counseling support ecosystem of Central University of Andhra Pradesh. Book slots, complete diagnostic screenings, and communicate securely with specialists.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={() => setShowPortal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition cursor-pointer"
              >
                Enter WCCMS Portal
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ) : (
          // Secure Gateway Forms Container
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-8 rounded-3xl shadow-xl animate-fade-in-up">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Secure Gateway Sign In</h3>
              <p className="text-xs text-slate-500 mt-1">Multi-factor encrypted credential authorization</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-semibold mb-4 leading-relaxed">
                {error}
              </div>
            )}

            {!requires2FA ? (
              // STEP 1: CREDENTIALS INPUT
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">University Registration No / Username</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g., admin or student reg no"
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Portal Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {authLoading ? 'Signing In...' : 'Verify Credentials'}
                </button>
              </form>
            ) : (
              // STEP 2: 2FA OTP CODE ENTRY
              <form onSubmit={handle2FAVerify} className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800 text-blue-900 dark:text-blue-300 rounded-xl text-xs leading-relaxed font-semibold mb-3">
                  Two-factor authentication code generated. Find the 6-digit OTP in your terminal logs / server logs.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase text-center">Enter 6-Digit OTP Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="000000"
                      className="w-full text-center pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-bold font-mono focus:outline-none bg-slate-50 dark:bg-slate-950 tracking-widest"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setRequires2FA(false); setError(''); }}
                    className="w-1/3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    {authLoading ? 'Verifying...' : 'Unlock Session'}
                  </button>
                </div>
              </form>
            )}

            <button
              onClick={() => { setShowPortal(false); setError(''); setRequires2FA(false); }}
              className="w-full text-center text-slate-450 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold mt-4 cursor-pointer block"
            >
              Return to Landing Portal
            </button>
          </div>
        )}
      </main>

      {/* Footer System Credits */}
      <footer className="text-center text-[10px] text-slate-400 uppercase tracking-widest max-w-7xl mx-auto w-full mt-8 border-t border-slate-200 dark:border-slate-900 pt-6">
        CUAP WCCMS &copy; 2026 | Built for Central University of Andhra Pradesh
      </footer>
    </div>
  );
}
