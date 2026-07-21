'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Bot, Send } from 'lucide-react';
import { api } from '@/lib/api';
import type { ChatMessage } from '@/types';
import { CHATBOT_WELCOME, CHATBOT_QUICK_PROMPTS, APP } from '@/constants/app';

/**
 * ChatbotWidget — Floating CUAP Wellness Assistant.
 * Extracted from page.tsx. Fully themed with CSS variables.
 */
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([
    { sender: 'assistant', text: CHATBOT_WELCOME },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const updated = [...history, { sender: 'user' as const, text }];
    setHistory(updated);
    setInput('');
    setLoading(true);
    try {
      const res = await api.auth.publicChat(text, history);
      setHistory([...updated, { sender: 'assistant', text: res.reply }]);
    } catch {
      setHistory([
        ...updated,
        {
          sender: 'assistant',
          text: "I'm sorry, I'm having connectivity issues. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
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
                  {msg.text}
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
        </div>
      )}
    </>
  );
}
