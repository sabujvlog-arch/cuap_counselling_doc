import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ThemeToggle from './ui/ThemeToggle';
import { ClipboardList, CheckCircle, Search, Edit3, LogOut, Loader2, Sparkles } from 'lucide-react';

interface DashboardTechnicianProps {
  onLogout: () => void;
  user: any;
}

export default function DashboardTechnician({ onLogout, user }: DashboardTechnicianProps) {
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected order for logging results
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [resultsRaw, setResultsRaw] = useState('');
  const [technicianReport, setTechnicianReport] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending
      const pendingData = await api.clinical.getPendingTests();
      setPendingOrders(pendingData || []);

      // 2. We can load completed tests by querying students or loading all test logs if there is an endpoint, or filter.
      // Since technician lists pending, they can also look at general history. Let's just track pending and keep completed in local state, or query them.
      // For general list of completed tests, we can list pending and completed locally.
    } catch (err) {
      console.error('Failed to load tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !resultsRaw) {
      alert('Please fill in the test findings/scores.');
      return;
    }

    setSubmitting(true);
    try {
      await api.clinical.submitTestResults(activeOrder.id, {
        results: resultsRaw,
        report:
          technicianReport ||
          `Rating scale details entered for ${activeOrder.test_name}: ${resultsRaw}`,
      });

      alert(`Submitted results for ${activeOrder.student_name}`);
      setCompletedOrders((prev) => [
        { ...activeOrder, status: 'completed', report: technicianReport || resultsRaw },
        ...prev,
      ]);
      setPendingOrders((prev) => prev.filter((o) => o.id !== activeOrder.id));

      // Clear forms
      setActiveOrder(null);
      setResultsRaw('');
      setTechnicianReport('');
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to submit test findings');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
              LT
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                Lab & Rating Scale Diagnostics
              </h1>
              <p className="text-[10px] text-slate-500 font-bold">Logged in: {user.username}</p>
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

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending list and completed logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-155 dark:border-slate-800 flex justify-between items-center bg-slate-50/45 dark:bg-slate-950/20">
              <h3 className="font-bold text-slate-905 dark:text-white text-xs uppercase tracking-wider">
                Pending Rating Scale & Test Orders
              </h3>
              {loading && <Loader2 className="animate-spin text-purple-650" size={16} />}
            </div>

            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 font-bold text-slate-400 text-xs">
                No pending laboratory or psychological test orders.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {pendingOrders.map((o) => (
                  <div
                    key={o.id}
                    className="p-5 flex justify-between items-start hover:bg-slate-50/30"
                  >
                    <div className="space-y-1.5">
                      <div className="flex gap-2 items-center">
                        <span className="font-extrabold text-slate-850 dark:text-white text-xs">
                          {o.test_name}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-55 dark:bg-purple-950/35 text-purple-600 dark:text-purple-400 font-bold rounded text-[9px] uppercase tracking-wide">
                          {o.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">
                        Student:{' '}
                        <strong className="text-slate-700 dark:text-slate-350">
                          {o.student_name}
                        </strong>{' '}
                        ({o.registration_number.toUpperCase()})
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Ordered by: Dr. {o.provider_name || 'Clinician'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveOrder(o);
                        setResultsRaw('');
                        setTechnicianReport('');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-750 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Edit3 size={12} /> Enter Findings
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History of Completed Tests in this session */}
          {completedOrders.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-155 dark:border-slate-800 bg-slate-50/45">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Completed Logs (Current Session)
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {completedOrders.map((o) => (
                  <div key={o.id} className="p-5 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 dark:text-white text-xs">
                        {o.test_name}
                      </span>
                      <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-bold uppercase">
                        Completed
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Student: {o.student_name} ({o.registration_number.toUpperCase()})
                    </p>
                    <p className="text-xs text-slate-650 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 mt-2 font-mono">
                      {o.report}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action input panel */}
        <div className="lg:col-span-1">
          {activeOrder ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-5 animate-fade-in-up">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Submit Test Findings
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Recording details for {activeOrder.test_name}
                </p>
              </div>

              <form onSubmit={handleSubmitResults} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1.5 uppercase">
                    Results / Numerical Scores*
                  </label>
                  <textarea
                    required
                    value={resultsRaw}
                    onChange={(e) => setResultsRaw(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. PHQ-9 Score: 18 (Severe depression). Intact attention..."
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1.5 uppercase">
                    Technician Report Description (Optional)
                  </label>
                  <textarea
                    value={technicianReport}
                    onChange={(e) => setTechnicianReport(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Provide description of results or interpretive text..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveOrder(null)}
                    className="w-1/3 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 font-bold rounded-xl hover:bg-slate-55 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-750 text-white font-bold rounded-xl shadow cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 p-8 rounded-2xl text-center space-y-2 text-slate-400 font-semibold text-xs border-dashed">
              <ClipboardList size={40} className="mx-auto text-slate-350" />
              <p>Select a pending order to record clinical findings.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
