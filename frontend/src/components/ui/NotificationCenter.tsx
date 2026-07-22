'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X, Check, Calendar, MessageSquare, Shield, Activity, Info } from 'lucide-react';
import { api } from '@/lib/api';

interface Notification {
  id: number;
  type: string;
  message: string;
  is_read: number;
  created_at: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateCount?: (count: number) => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  onUpdateCount,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.notifications.list();
      if (Array.isArray(res)) {
        setNotifications(res);
        const unreadCount = res.filter((n) => n.is_read === 0).length;
        if (onUpdateCount) onUpdateCount(unreadCount);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load initially & poll for unread count in background
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      // Background poll (silent fetch)
      api.notifications
        .list()
        .then((res) => {
          if (Array.isArray(res)) {
            setNotifications(res);
            const unreadCount = res.filter((n) => n.is_read === 0).length;
            if (onUpdateCount) onUpdateCount(unreadCount);
          }
        })
        .catch((err) => {
          console.error('Silent notification poll failed:', err);
        });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [onUpdateCount]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markRead();
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      if (onUpdateCount) onUpdateCount(0);
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  // Mark single as read
  const handleMarkRead = async (id: number) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      // Re-calculate unread count
      const updated = notifications.map((n) => (n.id === id ? { ...n, is_read: 1 } : n));
      const unreadCount = updated.filter((n) => n.is_read === 0).length;
      if (onUpdateCount) onUpdateCount(unreadCount);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  if (!isOpen) return null;

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMin = Math.round(diffMs / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.round(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch (_) {
      return '';
    }
  };

  // Return icons based on notification type
  const getIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'appointment':
        return <Calendar size={15} className="text-blue-500" />;
      case 'message':
        return <MessageSquare size={15} className="text-emerald-500" />;
      case 'system':
        return <Shield size={15} className="text-slate-500" />;
      case 'clinical':
        return <Activity size={15} className="text-rose-500" />;
      default:
        return <Info size={15} className="text-indigo-500" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 dark:bg-[#090D1A]/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-sm bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[60] flex flex-col backdrop-blur-xl animate-fade-in-left"
        style={{ animationDuration: '0.2s' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => n.is_read === 0) && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-450 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-slate-400">Loading alerts...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400">
                <Bell size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">All Caught Up!</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  You have no unread notification logs.
                </p>
              </div>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`group flex items-start gap-3.5 p-3 rounded-2xl border transition-all relative ${
                  notif.is_read === 0
                    ? 'bg-blue-50/30 dark:bg-blue-950/10 border-blue-100/50 dark:border-blue-900/10'
                    : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-850'
                }`}
              >
                {/* Icon wrapper */}
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {getIcon(notif.type)}
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0 pr-6">
                  <p
                    className={`text-xs leading-relaxed ${
                      notif.is_read === 0
                        ? 'font-bold text-slate-800 dark:text-white'
                        : 'font-semibold text-slate-650 dark:text-slate-400'
                    }`}
                  >
                    {notif.message}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 block">
                    {formatTimeAgo(notif.created_at)}
                  </span>
                </div>

                {/* Mark as read tick button */}
                {notif.is_read === 0 && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-450 cursor-pointer"
                    title="Mark as read"
                  >
                    <Check size={12} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
