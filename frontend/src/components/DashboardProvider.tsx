import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Calendar as CalendarIcon, Clock, Users, FileText, Send, Bell, Calendar as CalendarWidget,
  CheckCircle, Plus, Trash2, Download, Printer, User, MessageSquare, ShieldAlert
} from 'lucide-react';
import SOAPEditor from './SOAPEditor';

interface ProviderProps {
  onLogout: () => void;
  providerProfile: any;
  user: any;
}

export default function DashboardProvider({ onLogout, providerProfile, user }: ProviderProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'clinical' | 'prescription' | 'chat' | 'availability' | 'notifications'>('schedule');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeApp, setActiveApp] = useState<any>(null); // Active appointment for writing SOAP notes
  const [loading, setLoading] = useState(false);

  // Reschedule modal state
  const [rescheduleApp, setRescheduleApp] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'pending' | 'approved' | 'completed' | 'cancelled'>('all');
  
  // Prescription builder state
  const [presStudentId, setPresStudentId] = useState('');
  const [presDiagnosis, setPresDiagnosis] = useState('');
  const [presAdvice, setPresAdvice] = useState('');
  const [presLifestyle, setPresLifestyle] = useState('');
  const [presFollowUp, setPresFollowUp] = useState('');
  const [presItems, setPresItems] = useState<any[]>([{ medicineName: '', dose: '', frequency: '', duration: '' }]);
  const [prescriptionList, setPrescriptionList] = useState<any[]>([]);

  // Notifications & Messages state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [chatContacts, setChatContacts] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  // Availability schedule states
  const [availabilityDays, setAvailabilityDays] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchAppointments();
    fetchNotifications();
    fetchContacts();
    fetchAvailability();
    fetchAllStudents();
  }, []);

  const fetchAllStudents = async () => {
    try {
      const data = await api.appointments.list({});
      const uniqueMap = new Map();
      data.forEach((app: any) => {
        if (!uniqueMap.has(app.student_id)) {
          uniqueMap.set(app.student_id, {
            id: app.id,
            student_id: app.student_id,
            student_name: app.student_name,
            registration_number: app.registration_number
          });
        }
      });
      setAllStudents(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.appointments.listAll(); // Load ALL appointments, not just today
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.admin.announcements(); // Gets announcements
      setNotifications(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAvailability = async () => {
    if (!providerProfile) return;
    try {
      // Fetch availability records for provider
      const res = await api.appointments.getAvailableSlots(providerProfile.id, new Date().toISOString().split('T')[0]);
      // Mock days array since availability created during registration
      setAvailabilityDays([
        { day: 'Monday', hours: '09:00 - 17:00', break: '13:00 - 14:00' },
        { day: 'Tuesday', hours: '09:00 - 17:00', break: '13:00 - 14:00' },
        { day: 'Wednesday', hours: '09:00 - 17:00', break: '13:00 - 14:00' },
        { day: 'Thursday', hours: '09:00 - 17:00', break: '13:00 - 14:00' },
        { day: 'Friday', hours: '09:00 - 17:00', break: '13:00 - 14:00' }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  // Secure Chat Messaging Handlers
  const fetchContacts = async () => {
    try {
      const contacts = await api.messages.contacts();
      setChatContacts(contacts);
      if (contacts.length > 0 && !activeContactId) {
        setActiveContactId(contacts[0].id);
        loadChatHistory(contacts[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadChatHistory = async (otherId: number) => {
    try {
      const history = await api.messages.history(otherId);
      setMessages(history);
      await api.messages.markAsRead(otherId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContactId || !replyText.trim()) return;

    try {
      await api.messages.send({
        receiverId: activeContactId,
        content: replyText
      });
      setReplyText('');
      loadChatHistory(activeContactId);
    } catch (err) {
      alert("Failed to send message");
    }
  };

  // Prescription builder handlers
  const handleAddPresItem = () => {
    setPresItems([...presItems, { medicineName: '', dose: '', frequency: '', duration: '' }]);
  };

  const handleRemovePresItem = (idx: number) => {
    setPresItems(presItems.filter((_, i) => i !== idx));
  };

  const handlePresItemChange = (idx: number, field: string, val: string) => {
    const updated = [...presItems];
    updated[idx][field] = val;
    setPresItems(updated);
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presStudentId || !presDiagnosis) {
      alert("Please provide Student Profile ID and Diagnosis");
      return;
    }

    try {
      const res = await api.clinical.createPrescription({
        studentId: parseInt(presStudentId),
        diagnosis: presDiagnosis,
        advice: presAdvice,
        lifestyleRecommendations: presLifestyle,
        followUpDate: presFollowUp || null,
        items: presItems
      });

      alert("Prescription generated successfully!");
      // Open print layout in new tab
      window.open(api.clinical.getPrintUrl(res.id), '_blank');
      
      // Reset prescription form
      setPresStudentId('');
      setPresDiagnosis('');
      setPresAdvice('');
      setPresLifestyle('');
      setPresFollowUp('');
      setPresItems([{ medicineName: '', dose: '', frequency: '', duration: '' }]);
    } catch (err: any) {
      alert(err.message || "Failed to create prescription");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" className="w-10 h-10 object-contain" alt="CUAP Logo" />
            <div>
              <h1 className="text-xs font-black leading-tight text-slate-800 dark:text-slate-205">CUAP SWCC</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Provider Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'schedule', label: 'Today\'s Schedule', icon: Clock },
              { id: 'clinical', label: 'Clinical SOAP Notes', icon: FileText },
              { id: 'prescription', label: 'Prescription Desk', icon: Printer },
              { id: 'chat', label: 'Secure Messenger', icon: MessageSquare },
              { id: 'availability', label: 'Working Schedule', icon: CalendarWidget },
              { id: 'notifications', label: 'Announcements', icon: Bell }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                    activeTab === item.id 
                      ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400' 
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold font-mono">
              DR
            </div>
            <div>
              <p className="text-xs font-bold">{providerProfile?.name || user.username}</p>
              <p className="text-[10px] text-slate-400 font-mono">{providerProfile?.specialization || 'Clinical Psychologist'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace content */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-h-screen">
        
        {/* TAB 1: SCHEDULE – full appointment management */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Appointment Management</h2>
                <p className="text-xs text-slate-500 mt-1">View, approve, reject and reschedule patient bookings</p>
              </div>
              {/* Status filter */}
              <div className="flex gap-2 flex-wrap">
                {(['all', 'pending', 'approved', 'completed', 'cancelled'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setScheduleFilter(f)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      scheduleFilter === f
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
              {appointments.filter(a => scheduleFilter === 'all' || a.status === scheduleFilter).length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <CalendarIcon size={48} className="mx-auto text-slate-300 mb-3" />
                  No {scheduleFilter === 'all' ? '' : scheduleFilter} appointments.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {appointments
                    .filter(a => scheduleFilter === 'all' || a.status === scheduleFilter)
                    .map((a, idx) => (
                      <div key={idx} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{a.student_name}</span>
                            <span className="text-xs text-slate-400 font-mono">({(a.registration_number || '').toUpperCase()})</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            <strong>Date:</strong> {a.slot_date} &nbsp;|&nbsp;
                            <strong>Time:</strong> {a.slot_time} &nbsp;|&nbsp;
                            <strong>Dept:</strong> {a.student_dept || '—'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5"><strong>Reason:</strong> {a.reason}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center shrink-0">
                          {/* Status badge */}
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            a.status === 'approved'   ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
                            a.status === 'completed'  ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' :
                            a.status === 'pending'    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                            a.status === 'waiting'    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' :
                                                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {a.status}
                          </span>

                          {/* Approve (only when pending) */}
                          {a.status === 'pending' && (
                            <button
                              disabled={actionLoading}
                              onClick={async () => {
                                setActionLoading(true);
                                try {
                                  await api.appointments.updateStatus(a.id, { status: 'approved' });
                                  fetchAppointments();
                                } finally { setActionLoading(false); }
                              }}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                            >
                              ✓ Approve
                            </button>
                          )}

                          {/* Reject (pending or approved) */}
                          {(a.status === 'pending' || a.status === 'approved') && (
                            <button
                              disabled={actionLoading}
                              onClick={async () => {
                                if (!confirm(`Cancel appointment for ${a.student_name}?`)) return;
                                setActionLoading(true);
                                try {
                                  await api.appointments.updateStatus(a.id, { status: 'cancelled' });
                                  fetchAppointments();
                                } finally { setActionLoading(false); }
                              }}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition cursor-pointer disabled:opacity-50"
                            >
                              ✕ Cancel
                            </button>
                          )}

                          {/* Reschedule (pending or approved) */}
                          {(a.status === 'pending' || a.status === 'approved') && (
                            <button
                              onClick={() => { setRescheduleApp(a); setRescheduleDate(a.slot_date); setRescheduleTime(a.slot_time); }}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              ↻ Reschedule
                            </button>
                          )}

                          {/* Open SOAP editor (approved) */}
                          {a.status === 'approved' && (
                            <button
                              onClick={() => { setActiveApp(a); setActiveTab('clinical'); }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              Open Notes
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Reschedule Modal */}
            {rescheduleApp && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-full max-w-md">
                  <h3 className="text-lg font-black mb-1">Reschedule Appointment</h3>
                  <p className="text-xs text-slate-500 mb-5">Patient: <strong>{rescheduleApp.student_name}</strong></p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">New Date</label>
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={e => setRescheduleDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">New Time Slot</label>
                      <input
                        type="time"
                        value={rescheduleTime}
                        onChange={e => setRescheduleTime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setRescheduleApp(null)}
                      className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={actionLoading || !rescheduleDate || !rescheduleTime}
                      onClick={async () => {
                        setActionLoading(true);
                        try {
                          await api.appointments.updateStatus(rescheduleApp.id, {
                            status: 'rescheduled',
                            date: rescheduleDate,
                            timeSlot: rescheduleTime
                          });
                          setRescheduleApp(null);
                          fetchAppointments();
                        } finally { setActionLoading(false); }
                      }}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      Confirm Reschedule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CLINICAL SOAP NOTES */}
        {activeTab === 'clinical' && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Clinical EMR & SOAP Notes Desk</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {activeApp 
                    ? `Writing notes for: ${activeApp.student_name} (${activeApp.registration_number.toUpperCase()})` 
                    : "Select an appointment from Today's Schedule to write session notes."}
                </p>
              </div>
              {activeApp && (
                <button
                  onClick={() => setActiveApp(null)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {activeApp ? (
              <SOAPEditor 
                studentId={activeApp.student_id} 
                appointmentId={activeApp.id} 
                onSaved={() => {
                  fetchAppointments();
                  setActiveApp(null);
                  setActiveTab('schedule');
                }} 
              />
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-12 text-center rounded-2xl shadow-sm text-slate-400 space-y-4">
                <FileText size={48} className="mx-auto text-slate-300 mb-1" />
                <p className="text-sm">Please select a student from the Schedule tab to initialize the clinical notes editor.</p>
                {allStudents.length > 0 && (
                  <div className="max-w-md mx-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Or open EMR directly for an existing student:</label>
                    <select
                      onChange={(e) => {
                        const studentId = parseInt(e.target.value);
                        if (studentId) {
                          const selected = allStudents.find(s => s.student_id === studentId);
                          if (selected) {
                            setActiveApp({
                              id: selected.id,
                              student_id: selected.student_id,
                              student_name: selected.student_name,
                              registration_number: selected.registration_number
                            });
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- Choose student from directory --</option>
                      {allStudents.map((stud) => (
                        <option key={stud.student_id} value={stud.student_id}>
                          {stud.student_name} ({stud.registration_number.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRESCRIPTION MODULE */}
        {activeTab === 'prescription' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Prescription Board</h2>
              <p className="text-xs text-slate-500 mt-1">Issue official prescriptions with branding, lifestyle advice, and digital signature</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm">
              <form onSubmit={handleCreatePrescription} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Student DB ID / Patient ID</label>
                    <input
                      type="number"
                      required
                      value={presStudentId}
                      onChange={(e) => setPresStudentId(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Clinical Diagnosis</label>
                    <input
                      type="text"
                      required
                      value={presDiagnosis}
                      onChange={(e) => setPresDiagnosis(e.target.value)}
                      placeholder="Major Depressive Disorder (F32.9)"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                </div>

                {/* Prescription Items list */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Prescribed Medicines</label>
                    <button
                      type="button"
                      onClick={handleAddPresItem}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <Plus size={14} /> Add Medicine
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {presItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                        <input
                          type="text"
                          required
                          placeholder="Medicine name"
                          value={item.medicineName}
                          onChange={(e) => handlePresItemChange(idx, 'medicineName', e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 focus:outline-none"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Dose (e.g. 50mg)"
                          value={item.dose}
                          onChange={(e) => handlePresItemChange(idx, 'dose', e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 focus:outline-none"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Frequency (e.g. Once daily)"
                          value={item.frequency}
                          onChange={(e) => handlePresItemChange(idx, 'frequency', e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Duration (e.g. 3 weeks)"
                            value={item.duration}
                            onChange={(e) => handlePresItemChange(idx, 'duration', e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 focus:outline-none"
                          />
                          {presItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePresItem(idx)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">General Advice / Instructions</label>
                    <textarea
                      value={presAdvice}
                      onChange={(e) => setPresAdvice(e.target.value)}
                      placeholder="Take after meals, avoid alcohol..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Lifestyle Recommendations</label>
                    <textarea
                      value={presLifestyle}
                      onChange={(e) => setPresLifestyle(e.target.value)}
                      placeholder="8 hours sleep, morning meditation, daily walking..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Follow-up Date</label>
                  <input
                    type="date"
                    value={presFollowUp}
                    onChange={(e) => setPresFollowUp(e.target.value)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-sm cursor-pointer"
                >
                  Generate Prescription PDF
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: MESSENGER */}
        {activeTab === 'chat' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Secure Communications Portal</h2>
              <p className="text-xs text-slate-500 mt-1">End-to-end encrypted medical messaging with clients and admins</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden h-[600px]">
              {/* Contact list side */}
              <div className="border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Contacts</h3>
                <div className="space-y-2">
                  {chatContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveContactId(c.id);
                        loadChatHistory(c.id);
                      }}
                      className={`w-full text-left p-3 rounded-xl transition cursor-pointer ${
                        activeContactId === c.id 
                          ? 'bg-blue-50 dark:bg-slate-800/80 border-l-4 border-blue-600' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'
                      }`}
                    >
                      <span className="font-bold text-sm block text-slate-900 dark:text-white">{c.display_name || c.username}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{c.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat pane side */}
              <div className="md:col-span-2 flex flex-col justify-between h-full bg-slate-50/50 dark:bg-slate-900/10">
                {activeContactId ? (
                  <>
                    {/* Thread history */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[480px]">
                      {messages.length === 0 ? (
                        <div className="py-24 text-center text-slate-400 text-sm">No message records. Write a greeting to start chatting.</div>
                      ) : (
                        messages.map((m, idx) => {
                          const isMe = m.sender_id === user.id;
                          return (
                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-3.5 max-w-sm rounded-2xl shadow-sm text-sm ${
                                isMe 
                                  ? 'bg-blue-600 text-white rounded-tr-none' 
                                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-800'
                              }`}>
                                <p>{m.content}</p>
                                <span className={`block text-[9px] mt-1.5 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Sender text box */}
                    <form onSubmit={handleSendChat} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a message..."
                        className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                      <button
                        type="submit"
                        className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition cursor-pointer"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center text-slate-400">
                    Select a contact to view secure message conversation history.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AVAILABILITY SCHEDULER */}
        {activeTab === 'availability' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Provider Working Hours & Slots</h2>
              <p className="text-xs text-slate-500 mt-1">Configure your weekly availability patterns and holiday schedules</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Your Weekly Hours</h3>
              <div className="space-y-3">
                {availabilityDays.map((d, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-sm block text-slate-900 dark:text-white">{d.day}</span>
                      <span className="text-xs text-slate-500">Working Hours: {d.hours}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-400 block">Break Time: {d.break}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-bold mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Schedule
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: NOTIFICATIONS / ANNOUNCEMENTS */}
        {activeTab === 'notifications' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight">University Announcements Feed</h2>
              <p className="text-xs text-slate-500 mt-1">Read central counseling notification boards and bulletins</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No bulletins or announcements posted.</div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((n, idx) => (
                    <div key={idx} className="p-4 border-l-4 border-blue-500 bg-slate-50 dark:bg-slate-950 rounded-r-xl">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{n.message}</p>
                      <span className="block text-[10px] text-slate-400 font-medium mt-2">
                        Posted by Operator ({n.author || 'Admin'}) | {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
