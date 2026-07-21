import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function OPDRegister() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await api.admin.opdRegister(date);
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [date]);

  const handleExport = () => {
    window.open(api.admin.opdExportUrl(date), '_blank');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            Daily OPD Patient Register
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track and export outpatient counseling register logs
          </p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-slate-500">
          Loading Register Logs...
        </div>
      ) : records.length === 0 ? (
        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          No patients registered for this date.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-bold uppercase">
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Student (Reg No)</th>
                <th className="py-3 px-4">Dept / Sem</th>
                <th className="py-3 px-4">Assigned Counselor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Diagnosis</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300 text-sm transition"
                >
                  <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">
                    #{r.token}
                  </td>
                  <td className="py-3.5 px-4 font-medium">{r.time}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold">{r.student_name}</span>
                    <span className="block text-xs text-slate-400 font-mono mt-0.5">
                      {r.registration_number?.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold">
                    {r.department} (Sem {r.semester})
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                    Dr. {r.provider_name}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        r.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                          : r.status === 'approved'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-500 italic">
                    {r.diagnosis || 'Pending Notes'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
