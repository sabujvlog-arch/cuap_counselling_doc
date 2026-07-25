'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Bot, Send } from 'lucide-react';
import { api } from '@/lib/api';
import type { ChatMessage } from '@/types';
import { CHATBOT_WELCOME, CHATBOT_QUICK_PROMPTS, APP } from '@/constants/app';
import { useAuth } from '@/context/AuthContext';

/**
 * ChatbotWidget — Floating CUAP Wellness Assistant.
 * Extracted from page.tsx. Fully themed with CSS variables.
 */
export default function ChatbotWidget() {
  const { isAuthenticated, role, login, refreshSession } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([
    { sender: 'assistant', text: CHATBOT_WELCOME },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Booking states
  const [bookingDetails, setBookingDetails] = useState<{
    providerId: string;
    date: string;
    timeSlot: string;
  } | null>(null);
  const [bookingReason, setBookingReason] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const isLoggedInStudent = isAuthenticated && role === 'student';

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const updated = [...history, { sender: 'user' as const, text }];
    setHistory(updated);
    setInput('');
    setLoading(true);

    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < MAX_RETRIES) {
      try {
        const res = await api.auth.publicChat(text, history);
        setHistory([...updated, { sender: 'assistant', text: res.reply }]);
        setLoading(false);
        return; // success — exit
      } catch (err) {
        lastError = err;
        attempt++;
        if (attempt < MAX_RETRIES) {
          // Wait before retrying: 1s, 2s, 4s…
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    // All retries exhausted
    setHistory([
      ...updated,
      {
        sender: 'assistant',
        text: "I'm sorry, I'm experiencing connectivity issues right now. Please check your network and try again in a moment.",
      },
    ]);
    setLoading(false);
  };

  const handleInitiateBooking = (providerId: string, date: string, timeSlot: string) => {
    setBookingDetails({ providerId, date, timeSlot });
    setBookingReason('');
    setStudentUsername('');
    setStudentPassword('');
    setBookingSuccess(null);
    setBookingError(null);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDetails) return;
    setBookingLoading(true);
    setBookingError(null);

    try {
      if (!isLoggedInStudent) {
        // Perform inline authentication
        const loginRes = await login({ username: studentUsername, password: studentPassword });
        if (!loginRes.success) {
          throw new Error(loginRes.error || 'Invalid student credentials.');
        }
      }

      // Reserve slot
      const bookRes = await api.appointments.book({
        providerId: Number(bookingDetails.providerId),
        date: bookingDetails.date,
        timeSlot: bookingDetails.timeSlot,
        chiefComplaint: bookingReason,
      });

      setBookingSuccess(bookRes.message || 'Appointment reserved successfully!');

      // Refresh context session
      await refreshSession();
    } catch (err: any) {
      console.error(err);
      setBookingError(err.message || 'Failed to book slot.');
    } finally {
      setBookingLoading(false);
    }
  }; // ────────────────────────────────────────────────
  // Markdown-to-React converter (no extra dependency)
  // ────────────────────────────────────────────────
  const parseInline = (raw: string, keyPrefix: string): React.ReactNode[] => {
    // Split on **bold**, *italic*, keeping delimiters
    const tokens = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return tokens.map((tok, i) => {
      if (/^\*\*[^*]+\*\*$/.test(tok)) {
        return (
          <strong
            key={`${keyPrefix}-b${i}`}
            className="font-black text-slate-800 dark:text-slate-100"
          >
            {tok.slice(2, -2)}
          </strong>
        );
      }
      if (/^\*[^*]+\*$/.test(tok)) {
        return (
          <em key={`${keyPrefix}-i${i}`} className="italic text-slate-600 dark:text-slate-300">
            {tok.slice(1, -1)}
          </em>
        );
      }
      return tok;
    });
  };

  const renderMessageContent = (msg: ChatMessage) => {
    const text = msg.text;

    // ── Step 1: extract book:// links, split text into segments ──
    const bookRegex = /\[([^\]]+)\]\((book:\/\/[^)]+)\)/g;
    const segments: Array<
      { type: 'text'; content: string } | { type: 'book'; label: string; uri: string }
    > = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = bookRegex.exec(text)) !== null) {
      if (m.index > last) segments.push({ type: 'text', content: text.slice(last, m.index) });
      segments.push({ type: 'book', label: m[1], uri: m[2] });
      last = bookRegex.lastIndex;
    }
    if (last < text.length) segments.push({ type: 'text', content: text.slice(last) });

    // ── Step 2: render each segment ──
    const nodes: React.ReactNode[] = [];

    segments.forEach((seg, si) => {
      if (seg.type === 'book') {
        const parsed = seg.uri.match(/book:\/\/([^/]+)\/([^/]+)\/(.+)/);
        if (parsed) {
          nodes.push(
            <button
              key={`book-${si}`}
              type="button"
              onClick={() =>
                handleInitiateBooking(parsed[1], parsed[2], decodeURIComponent(parsed[3]))
              }
              className="mt-2 block w-full text-center py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-sm transition hover:scale-[1.02] cursor-pointer"
            >
              📅 Confirm Appointment Slot
            </button>,
          );
        }
        return;
      }

      // ── Step 3: parse plain text lines into markdown blocks ──
      const lines = seg.content.split('\n');
      let i = 0;
      while (i < lines.length) {
        const raw = lines[i];
        const trimmed = raw.trim();

        // Skip blank
        if (!trimmed) {
          i++;
          continue;
        }

        // Horizontal rule: --- or ***
        if (/^[-*]{3,}$/.test(trimmed)) {
          nodes.push(
            <hr key={`${si}-hr${i}`} className="my-2 border-slate-200 dark:border-slate-700" />,
          );
          i++;
          continue;
        }

        // Heading: ### / ## / #
        const headMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
        if (headMatch) {
          const level = headMatch[1].length;
          const cls =
            level === 1
              ? 'text-sm font-black text-slate-800 dark:text-white mt-3 mb-1'
              : level === 2
                ? 'text-xs font-black text-slate-700 dark:text-slate-100 mt-2 mb-0.5'
                : 'text-[11px] font-extrabold text-slate-600 dark:text-slate-200 mt-1.5 mb-0.5';
          nodes.push(
            <p key={`${si}-h${i}`} className={cls}>
              {parseInline(headMatch[2], `${si}-h${i}`)}
            </p>,
          );
          i++;
          continue;
        }

        // Numbered list block: collect consecutive lines starting with 1. 2. etc.
        if (/^\d+\.\s/.test(trimmed)) {
          const items: string[] = [];
          while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
            items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
            i++;
          }
          nodes.push(
            <ol key={`${si}-ol${i}`} className="list-decimal list-inside space-y-0.5 my-1 pl-1">
              {items.map((item, ii) => (
                <li
                  key={ii}
                  className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300"
                >
                  {parseInline(item, `${si}-oli${ii}`)}
                </li>
              ))}
            </ol>,
          );
          continue;
        }

        // Bullet list block: - or * or •
        if (/^[-*•]\s/.test(trimmed)) {
          const items: string[] = [];
          while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
            items.push(lines[i].trim().replace(/^[-*•]\s/, ''));
            i++;
          }
          nodes.push(
            <ul key={`${si}-ul${i}`} className="space-y-0.5 my-1 pl-3">
              {items.map((item, ii) => (
                <li
                  key={ii}
                  className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300"
                >
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                  <span>{parseInline(item, `${si}-uli${ii}`)}</span>
                </li>
              ))}
            </ul>,
          );
          continue;
        }

        // Normal paragraph line
        nodes.push(
          <p
            key={`${si}-p${i}`}
            className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 my-0.5"
          >
            {parseInline(trimmed, `${si}-p${i}`)}
          </p>,
        );
        i++;
      }
    });

    return nodes.length > 0 ? nodes : text;
  };

  return (
    <>
      {/* Toggle button */}
      <button
        id="chatbot-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 p-4 rounded-full z-50 cursor-pointer transition hover:scale-105"
        style={{
          background: 'var(--gradient-primary)',
          color: 'white',
          boxShadow: 'var(--shadow-blue)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        aria-label={open ? 'Close chat' : 'Open wellness chat'}
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[480px] rounded-3xl flex flex-col z-50 overflow-hidden animate-slide-in-right"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Header */}
          <div
            className="p-4 flex items-center gap-3"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <div className="p-2 rounded-xl bg-white/10">
              <Bot size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-sm text-white">{APP.name} Wellness Assistant</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold tracking-wide opacity-90 uppercase">
                  Active
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white cursor-pointer transition"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ background: 'var(--surface)' }}
          >
            {history.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[80%] p-3 rounded-2xl text-xs font-semibold leading-relaxed"
                  style={
                    msg.sender === 'user'
                      ? {
                          background: 'var(--gradient-primary)',
                          color: 'white',
                          borderRadius: '16px 16px 4px 16px',
                        }
                      : {
                          background: 'var(--card)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: '16px 16px 16px 4px',
                        }
                  }
                >
                  {renderMessageContent(msg)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="p-3 rounded-2xl flex items-center gap-1"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  {[0, 200, 400].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--text-muted)', animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {history.length === 1 && (
            <div
              className="px-4 py-2 flex flex-wrap gap-1.5"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              {CHATBOT_QUICK_PROMPTS.map((pill) => (
                <button
                  key={pill}
                  onClick={() => sendMessage(pill)}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer transition"
                  style={{
                    background: 'var(--primary-light)',
                    color: 'var(--primary-text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {pill}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-3 flex gap-2"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}
          >
            <input
              id="chatbot-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Type your message…"
              className="input flex-1 px-3.5 py-2 text-xs"
            />
            <button
              id="chatbot-send-btn"
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-primary p-2 flex items-center justify-center"
            >
              <Send size={13} />
            </button>
          </form>

          {/* Inline Booking Confirmation Modal */}
          {bookingDetails && (
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end"
              role="dialog"
            >
              <div
                className="bg-white dark:bg-slate-900 rounded-t-[28px] p-5 shadow-2xl space-y-4 max-h-[90%] overflow-y-auto animate-slide-in-up"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                    Confirm Appointment
                  </h3>
                  <button
                    type="button"
                    onClick={() => setBookingDetails(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {bookingSuccess ? (
                  <div className="space-y-4 py-2 text-center">
                    <span className="text-3xl">🎉</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      {bookingSuccess}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      You can now view your QR pass in your dashboard appointments list.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBookingDetails(null)}
                      className="btn-primary w-full py-2 text-xs font-bold rounded-xl"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConfirmBooking} className="space-y-3 text-left">
                    {bookingError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                        {bookingError}
                      </div>
                    )}

                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Selected Slot:{' '}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {bookingDetails.date} at {bookingDetails.timeSlot}
                      </strong>
                    </div>

                    {!isLoggedInStudent && (
                      <>
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-slate-850 text-blue-700 dark:text-blue-300 text-[10px] font-medium leading-relaxed">
                          Please enter your student credentials to log in and book this slot.
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                            Registration Number
                          </label>
                          <input
                            type="text"
                            required
                            value={studentUsername}
                            onChange={(e) => setStudentUsername(e.target.value)}
                            placeholder="e.g. 25bec01"
                            className="input w-full py-2 px-3 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                            Password
                          </label>
                          <input
                            type="password"
                            required
                            value={studentPassword}
                            onChange={(e) => setStudentPassword(e.target.value)}
                            placeholder="••••••••"
                            className="input w-full py-2 px-3 text-xs"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Chief Complaint / Reason
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={bookingReason}
                        onChange={(e) => setBookingReason(e.target.value)}
                        placeholder="Why are you booking this session? (e.g. exam stress)..."
                        className="input w-full py-2 px-3 text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="btn-primary w-full py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                    >
                      {bookingLoading
                        ? 'Processing...'
                        : isLoggedInStudent
                          ? 'Book Slot'
                          : 'Login & Book'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
