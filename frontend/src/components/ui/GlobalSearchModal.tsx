import React, { useState, useEffect } from 'react';
import { Search, X, User, Calendar, Shield, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { formatProviderTitle } from '@/utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent?: (student: any) => void;
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
  onSelectStudent,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    students: any[];
    providers: any[];
    appointments: any[];
  }>({
    students: [],
    providers: [],
    appointments: [],
  });

  // Global Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ students: [], providers: [], appointments: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.appointments.globalSearch(query);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalCount =
    results.students.length + results.providers.length + results.appointments.length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-16 px-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-950/40">
          <Search size={20} className="text-blue-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students by name or reg no (e.g. 23P1TL01S), counselors, appointments..."
            className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 uppercase"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading && (
            <div className="py-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Searching records across university databases...
            </div>
          )}

          {!loading && query.length >= 2 && totalCount === 0 && (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              No matching students, counselors, or appointments found for &ldquo;
              <strong className="text-slate-600 dark:text-slate-300">{query}</strong>&rdquo;.
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="py-10 text-center text-xs font-bold text-slate-400">
              Type at least 2 characters to search across all portals.
              <div className="text-[10px] text-slate-400 font-normal mt-1">
                Press{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-mono">
                  Ctrl+K
                </kbd>{' '}
                anytime to open global search.
              </div>
            </div>
          )}

          {!loading && results.students.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <User size={14} /> Students ({results.students.length})
              </div>
              <div className="grid grid-cols-1 gap-2">
                {results.students.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => {
                      if (onSelectStudent) onSelectStudent(st);
                      onClose();
                    }}
                    className="p-3 bg-slate-50 dark:bg-slate-850 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-2xl border border-slate-150 dark:border-slate-800/80 transition flex items-center justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="text-xs font-black text-slate-800 dark:text-white group-hover:text-blue-600 transition">
                        {st.name}
                      </div>
                      <div className="text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400">
                        {st.registration_number?.toUpperCase()} &bull; {st.department || 'General'}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-slate-400 group-hover:translate-x-1 transition"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && results.providers.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Shield size={14} /> Counselors ({results.providers.length})
              </div>
              <div className="grid grid-cols-1 gap-2">
                {results.providers.map((pr) => (
                  <div
                    key={pr.id}
                    className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-black text-slate-800 dark:text-white">
                        {formatProviderTitle(pr.name)}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500">
                        ID: {pr.employee_id} &bull; {pr.specialization || 'Clinical Psychology'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && results.appointments.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Calendar size={14} /> Appointments ({results.appointments.length})
              </div>
              <div className="grid grid-cols-1 gap-2">
                {results.appointments.map((ap) => (
                  <div
                    key={ap.id}
                    className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white">
                        {ap.student_name} ({ap.registration_number}) &rarr;{' '}
                        {formatProviderTitle(ap.provider_name)}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500">
                        {ap.slot_date} at {ap.time_slot} &bull; Status:{' '}
                        <span className="uppercase font-bold text-blue-600">{ap.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
