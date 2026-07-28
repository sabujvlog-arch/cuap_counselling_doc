'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Users,
  Stethoscope,
  Calendar,
  FileText,
  BarChart3,
  Folder,
  HelpCircle,
  Bell,
  Shield,
  AppWindow,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

interface GlobalSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({
    students: [],
    providers: [],
    appointments: [],
    soapNotes: [],
    reports: [],
    documents: [],
    assessments: [],
    announcements: [],
    auditLogs: [],
    systemModules: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open trigger
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({
        students: [],
        providers: [],
        appointments: [],
        soapNotes: [],
        reports: [],
        documents: [],
        assessments: [],
        announcements: [],
        auditLogs: [],
        systemModules: [],
      });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('cuap_wccms_token');
        const res = await fetch(
          `${API_BASE}/global-search?q=${encodeURIComponent(query)}&category=${activeCategory}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeCategory]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Modules' },
    { id: 'students', label: 'Students' },
    { id: 'counselors', label: 'Counselors' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'soapNotes', label: 'SOAP Notes' },
    { id: 'reports', label: 'Reports' },
    { id: 'documents', label: 'Documents' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'auditLogs', label: 'Audit Logs' },
  ];

  const totalResults =
    (results.students?.length || 0) +
    (results.providers?.length || 0) +
    (results.appointments?.length || 0) +
    (results.soapNotes?.length || 0) +
    (results.reports?.length || 0) +
    (results.documents?.length || 0) +
    (results.assessments?.length || 0) +
    (results.announcements?.length || 0) +
    (results.auditLogs?.length || 0) +
    (results.systemModules?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Students, Counselors, SOAP Notes, Appointments, Documents..."
            className="w-full py-4 px-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden text-base font-medium"
          />
          {loading ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg shrink-0"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          ) : null}
          <button
            onClick={onClose}
            className="ml-2 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded-md shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar bg-slate-100/50 dark:bg-slate-900/50">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Results Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {query && totalResults === 0 && !loading && (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No results found for &quot;{query}&quot;</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching with a registration number, counselor name, or clinical keyword.
              </p>
            </div>
          )}

          {!query && (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Type keywords to perform an instant universal search across all 10 system modules.
            </div>
          )}

          {/* System Modules */}
          {results.systemModules?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                <AppWindow className="w-3.5 h-3.5 text-blue-500" /> System Modules
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {results.systemModules.map((mod: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors group"
                  >
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {mod.name}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Students */}
          {results.students?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500" /> Students (
                {results.students.length})
              </h3>
              <div className="space-y-1.5">
                {results.students.map((st: any) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {st.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Reg: {st.registration_number} • Dept: {st.department || 'N/A'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md">
                      Student
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Providers */}
          {results.providers?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-blue-500" /> Counselors & Doctors (
                {results.providers.length})
              </h3>
              <div className="space-y-1.5">
                {results.providers.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {p.specialization} • Room: {p.room_number || 'Main Clinic'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md">
                      Provider
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointments */}
          {results.appointments?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" /> Appointments (
                {results.appointments.length})
              </h3>
              <div className="space-y-1.5">
                {results.appointments.map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Student: {a.student_name} with {a.provider_name || 'Counselor'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Date: {a.slot_date} at {a.time_slot} • Status: {a.status}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-md uppercase">
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SOAP Notes & Sessions */}
          {results.soapNotes?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-500" /> SOAP Notes & Sessions (
                {results.soapNotes.length})
              </h3>
              <div className="space-y-1.5">
                {results.soapNotes.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Session #{s.session_number} for {s.student_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Counselor: {s.provider_name} • Stage: {s.workflow_stage}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-md">
                      SOAP Note
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Announcements */}
          {results.announcements?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-rose-500" /> Announcements (
                {results.announcements.length})
              </h3>
              <div className="space-y-1.5">
                {results.announcements.map((ann: any) => (
                  <div
                    key={ann.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {ann.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {ann.content}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-md uppercase">
                      {ann.priority || 'Medium'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Logs */}
          {results.auditLogs?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-500" /> Audit Logs (
                {results.auditLogs.length})
              </h3>
              <div className="space-y-1.5">
                {results.auditLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {log.action}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{log.details}</p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                      Audit Log
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
