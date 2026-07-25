'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandaloneApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandaloneApp) {
      setIsStandalone(true);
      return;
    }

    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem('cuap_pwa_dismissed');
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (days < 7) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('cuap_pwa_dismissed', Date.now().toString());
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-md w-full p-4 bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl animate-fade-in flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/10 p-1.5 flex items-center justify-center shrink-0 border border-white/10">
          <Image
            src="/logo.png"
            alt="CUAP Logo"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
        <div>
          <h4 className="text-xs font-black tracking-wide text-white flex items-center gap-1.5">
            CUAP E-Campus App
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold">
              PWA
            </span>
          </h4>
          <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1">
            <Monitor size={11} className="text-blue-400" /> Desktop & Mobile Instant Access
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold transition shadow-md hover:shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer"
        >
          <Download size={13} />
          Install App
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          title="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
