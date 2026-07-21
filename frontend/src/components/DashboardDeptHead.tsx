import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ThemeToggle from './ui/ThemeToggle';
import {
  Users,
  ShieldAlert,
  Award,
  FileText,
  CheckSquare,
  Search,
  LogOut,
  Loader2,
  Sparkles,
  Printer,
  UserCheck,
  AlertTriangle,
  Database,
  X,
} from 'lucide-react';

interface DashboardDeptHeadProps {
  onLogout: () => void;
  user: any;
  providerProfile?: any;
}

export default function DashboardDeptHead({
  onLogout,
  user,
  providerProfile,
}: DashboardDeptHeadProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [cosigningId, setCosigningId] = useState<number | null>(null);
  const [viewSession, setViewSession] = useState<any | null>(null);

  // EMR Repository states
  const [repository, setRepository] = useState<any[]>([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [repoProvider, setRepoProvider] = useState('');
  const [repoDept, setRepoDept] = useState('');
  const [repoSeverity, setRepoSeverity] = useState('');
  const [repoDiagnosis, setRepoDiagnosis] = useState('');
  const [repoDate, setRepoDate] = useState('');
  const [selectedRepoSession, setSelectedRepoSession] = useState<any>(null);

  useEffect(() => {
    fetchHighRiskData();
    fetchRepository();
  }, []);

  const fetchRepository = async () => {
    try {
      const data = await api.clinical.getAllAssessments();
      setRepository(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHighRiskData = async () => {
    setLoading(true);
    try {
      const data = await api.clinical.getHighRiskSessions();
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load sessions data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCosign = async (id: number) => {
    setCosigningId(id);
    try {
      await api.clinical.cosignSession(id);
      alert('Clinical record successfully co-signed & authorized.');

      // Update local state
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            return { ...s, cosigned_by: user.id, cosigned_at: new Date().toISOString() };
          }
          return s;
        }),
      );
      if (viewSession && viewSession.id === id) {
        setViewSession((prev: any) => ({
          ...prev,
          cosigned_by: user.id,
          cosigned_at: new Date().toISOString(),
        }));
      }
      fetchHighRiskData();
    } catch (err: any) {
      alert(err.message || 'Co-signature failed.');
    } finally {
      setCosigningId(null);
    }
  };

  // Filter queue logic: High-risk or severe files
  const pendingCosignQueue = sessions.filter(
    (s) => !s.cosigned_by && (s.risk_assessment || '').toLowerCase().trim().length > 0,
  );

  const completedCosignLogs = sessions.filter((s) => !!s.cosigned_by);

  const filteredPending = pendingCosignQueue.filter(
    (s) =>
      (s.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.registration_number || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-650 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
              DH
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                WCCMS Department Head Dashboard
              </h1>
              <p className="text-[10px] text-slate-500 font-bold">
                Logged in: {providerProfile?.name || user.username} (
                {providerProfile?.department || 'Psychiatry'})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-55 dark:bg-slate-800 dark:hover:bg-red-950/20 text-slate-600 hover:text-red-650 dark:text-slate-350 dark:hover:text-red-400 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Oversight widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                Department Cases
              </span>
              <h2 className="text-xl font-black text-slate-909 mt-0.5">{sessions.length}</h2>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 rounded-xl flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                High-Risk Queue
              </span>
              <h2 className="text-xl font-black text-slate-909 mt-0.5">
                {pendingCosignQueue.length}
              </h2>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
              <UserCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                Co-signed Files
              </span>
              <h2 className="text-xl font-black text-slate-909 mt-0.5">
                {completedCosignLogs.length}
              </h2>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 text-blue-650 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                Oversight Rate
              </span>
              <h2 className="text-xl font-black text-slate-909 mt-0.5">
                {sessions.length > 0
                  ? Math.round((completedCosignLogs.length / sessions.length) * 100)
                  : 100}
                %
              </h2>
            </div>
          </div>
        </div>

        {/* Oversight Layout split queue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Pending queue */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-155 dark:border-slate-800 flex justify-between items-center bg-slate-50/45 dark:bg-slate-950/20">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Clinical Files Requiring Co-Signature
                </h3>
                {loading && <Loader2 className="animate-spin text-indigo-600" size={16} />}
              </div>

              <div className="p-4 border-b border-slate-100 dark:border-slate-850">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by student name or registration..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs"
                  />
                </div>
              </div>

              {filteredPending.length === 0 ? (
                <div className="text-center py-10 font-bold text-slate-400 text-xs">
                  No pending high-risk clinical files await co-signature.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-850">
                  {filteredPending.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setViewSession(s)}
                      className={`p-4 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer transition ${
                        viewSession?.id === s.id
                          ? 'bg-indigo-50/20 border-l-4 border-indigo-650'
                          : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <span className="font-bold text-slate-800 dark:text-white">
                            {s.student_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({s.registration_number.toUpperCase()})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {' '}
                          Clinician: Dr. {s.provider_name}
                        </p>
                        <p className="text-[10px] text-red-600 font-semibold bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-lg inline-block">
                          ⚠️ Elevated Crisis Indicator
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-450 font-bold">
                        {new Date(s.session_date || s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed logs roster */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-155 dark:border-slate-800 bg-slate-50/45">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Completed Co-Signature Logs
                </h3>
              </div>

              {completedCosignLogs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-bold">
                  No co-signed logs on record.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-850">
                  {completedCosignLogs.map((s) => (
                    <div key={s.id} className="p-4 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {s.student_name}
                        </span>
                        <p className="text-slate-500 mt-0.5">
                          Clinician: Dr. {s.provider_name} | Co-signed by: You
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-green-105 text-green-700 font-bold rounded uppercase text-[9px]">
                        Authorized
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details Overview Panel */}
          <div className="lg:col-span-1">
            {viewSession ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 animate-fade-in-up text-xs font-medium">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Encounter Review Panel
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Review clinical entries before authorization.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="border-b border-slate-100 dark:border-slate-850 pb-1.5">
                    <strong>Client/Student:</strong> {viewSession.student_name} (
                    {viewSession.registration_number.toUpperCase()})
                  </p>
                  <p className="border-b border-slate-100 dark:border-slate-850 pb-1.5">
                    <strong>Primary Clinician:</strong> Dr. {viewSession.provider_name}
                  </p>
                  <p className="border-b border-slate-100 dark:border-slate-850 pb-1.5 text-blue-600 dark:text-blue-450 font-bold">
                    <strong>Diagnosis:</strong> {viewSession.diagnosis || 'None entered'}
                  </p>
                  <div className="p-3 bg-red-50 dark:bg-red-955/20 border border-red-200 rounded-xl space-y-1">
                    <span className="font-bold text-red-700 dark:text-red-400 block uppercase text-[10px] tracking-wide">
                      Risk Assessment:
                    </span>
                    <p className="text-red-900 dark:text-red-300 leading-relaxed font-semibold">
                      {viewSession.risk_assessment || 'Crisis keywords detected'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
                    <span className="font-bold text-slate-500 block uppercase text-[10px]">
                      Chief Complaint Notes:
                    </span>
                    <p className="text-slate-650 dark:text-slate-350 leading-relaxed">
                      {viewSession.presenting_complaint || 'None'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <a
                    href={api.clinical.getCompiledReportUrl(viewSession.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-2 border border-slate-200 dark:border-slate-855 rounded-xl font-bold hover:bg-slate-50 text-slate-600 cursor-pointer text-center"
                  >
                    <Printer size={14} /> Full Report
                  </a>
                  {!viewSession.cosigned_by && (
                    <button
                      onClick={() => handleCosign(viewSession.id)}
                      disabled={cosigningId === viewSession.id}
                      className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded-xl shadow cursor-pointer disabled:opacity-50"
                    >
                      {cosigningId === viewSession.id ? 'Signing...' : 'Co-Sign & Approve'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 p-8 rounded-2xl text-center space-y-2 text-slate-400 font-semibold text-xs border-dashed">
                <CheckSquare size={40} className="mx-auto text-slate-350" />
                <p>Select an encounter file from the queue to review details.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Assessment Data Repository Section ── */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 mt-12 space-y-6">
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-slate-850 dark:text-white">
              <Database size={20} className="text-indigo-600" />
              Assessment Data Repository
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Search and review historical clinical encounters across all departments
            </p>
          </div>

          {/* Filter Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                Search Patient
              </label>
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Name or Reg No"
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                Clinician
              </label>
              <input
                type="text"
                value={repoProvider}
                onChange={(e) => setRepoProvider(e.target.value)}
                placeholder="Counselor Name"
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                Department
              </label>
              <select
                value={repoDept}
                onChange={(e) => setRepoDept(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Biotechnology">Biotechnology</option>
                <option value="Business Administration">Business Administration</option>
                <option value="Applied Psychology">Applied Psychology</option>
                <option value="English (UG)">English (UG)</option>
                <option value="Science & Physics">Science & Physics</option>
                <option value="Applied Sciences">Applied Sciences</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                Severity
              </label>
              <select
                value={repoSeverity}
                onChange={(e) => setRepoSeverity(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="">All Severity</option>
                <option value="low">Mild</option>
                <option value="medium">Moderate</option>
                <option value="high">Severe</option>
                <option value="severe">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                Diagnosis
              </label>
              <input
                type="text"
                value={repoDiagnosis}
                onChange={(e) => setRepoDiagnosis(e.target.value)}
                placeholder="Search Diagnosis"
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                Date
              </label>
              <input
                type="date"
                value={repoDate}
                onChange={(e) => setRepoDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                    <th className="py-4 px-6">Assessment Date</th>
                    <th className="py-4 px-6">Patient</th>
                    <th className="py-4 px-6">Assigned Clinician</th>
                    <th className="py-4 px-6">Department</th>
                    <th className="py-4 px-6">Diagnosis</th>
                    <th className="py-4 px-6">Severity</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                  {(() => {
                    const filteredRepo = repository.filter((item: any) => {
                      const matchesPatient =
                        repoSearch === '' ||
                        item.student_name.toLowerCase().includes(repoSearch.toLowerCase()) ||
                        item.registration_number.toLowerCase().includes(repoSearch.toLowerCase());

                      const matchesProvider =
                        repoProvider === '' ||
                        item.provider_name.toLowerCase().includes(repoProvider.toLowerCase());

                      const matchesDept = repoDept === '' || item.student_dept === repoDept;

                      const matchesSeverity =
                        repoSeverity === '' ||
                        (item.risk_level || 'low').toLowerCase() === repoSeverity.toLowerCase();

                      const matchesDiag =
                        repoDiagnosis === '' ||
                        (item.diagnosis || '').toLowerCase().includes(repoDiagnosis.toLowerCase());

                      const matchesDate =
                        repoDate === '' || item.session_date.split('T')[0] === repoDate;

                      return (
                        matchesPatient &&
                        matchesProvider &&
                        matchesDept &&
                        matchesSeverity &&
                        matchesDiag &&
                        matchesDate
                      );
                    });

                    if (filteredRepo.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400">
                            No clinical assessment records found matching current filter criteria.
                          </td>
                        </tr>
                      );
                    }

                    return filteredRepo.map((item: any) => {
                      const risk = (item.risk_level || 'low').toLowerCase();
                      let badgeColor =
                        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400';
                      let label = 'Mild';
                      if (risk === 'medium') {
                        badgeColor =
                          'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400';
                        label = 'Moderate';
                      } else if (risk === 'high') {
                        badgeColor = 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400';
                        label = 'Severe';
                      } else if (risk === 'severe') {
                        badgeColor = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
                        label = 'Critical';
                      }
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition"
                        >
                          <td className="py-4 px-6 font-mono text-slate-500">
                            {new Date(item.session_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-bold">{item.student_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {item.registration_number.toUpperCase()}
                            </p>
                          </td>
                          <td className="py-4 px-6 text-slate-650 dark:text-slate-300">
                            {item.provider_name}
                          </td>
                          <td className="py-4 px-6 text-slate-505">{item.student_dept}</td>
                          <td className="py-4 px-6 italic text-slate-650 dark:text-slate-300">
                            {item.diagnosis || 'No diagnosis recorded'}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badgeColor}`}
                            >
                              {label}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setSelectedRepoSession(item)}
                              className="px-3 py-1.5 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 text-[10px] font-bold rounded-xl transition cursor-pointer"
                            >
                              View Record
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Details Modal */}
        {selectedRepoSession && (
          <div className="fixed inset-0 bg-black/60 backdrop-filter blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-slate-805 dark:text-white">
                    Clinical Assessment Details
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Session Date:{' '}
                    {new Date(selectedRepoSession.session_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRepoSession(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-750 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-700 dark:text-slate-200">
                {/* Patient / Provider Profile Box */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Patient Information
                    </p>
                    <p className="text-sm font-black mt-1">{selectedRepoSession.student_name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {selectedRepoSession.registration_number.toUpperCase()} ·{' '}
                      {selectedRepoSession.student_dept}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Clinical Counselor
                    </p>
                    <p className="text-sm font-black mt-1">{selectedRepoSession.provider_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Role:{' '}
                      {selectedRepoSession.clinician_mode === 'doctor'
                        ? 'Medical Doctor'
                        : 'Therapist/Counselor'}
                    </p>
                  </div>
                </div>

                {/* Clinical Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                      Subjective Findings (Complaints)
                    </h4>
                    <p className="text-sm whitespace-pre-line leading-relaxed">
                      {selectedRepoSession.subjective || 'No subjective details recorded'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                      Objective Observations (MSE/Evaluation)
                    </h4>
                    <p className="text-sm whitespace-pre-line leading-relaxed">
                      {selectedRepoSession.objective || 'No objective details recorded'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                      Clinical Diagnosis
                    </h4>
                    <p className="text-sm font-bold italic">
                      {selectedRepoSession.diagnosis || 'No diagnosis recorded'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                      Treatment & Follow-up Plan
                    </h4>
                    <p className="text-sm whitespace-pre-line leading-relaxed">
                      {selectedRepoSession.plan || 'No treatment plan details recorded'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedRepoSession(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
