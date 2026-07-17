import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { 
  Calendar, Clock, BookOpen, FileText, Send, Bell, User, MessageSquare, Plus,
  Download, Award, Shield, PhoneCall, Check, Heart, Clipboard, HelpCircle, Eye, Printer, Sparkles, Bot, AlertTriangle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AssessmentModule from './AssessmentModule';

interface StudentProps {
  onLogout: () => void;
  studentProfile: any;
  user: any;
}

export default function DashboardStudent({ onLogout, studentProfile, user }: StudentProps) {
  const [activeTab, setActiveTab] = useState<'appointments' | 'prescriptions' | 'documents' | 'assessment' | 'chat' | 'unimind' | 'feedback'>('appointments');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Booking states
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingReason, setBookingReason] = useState('');

  // Prescription, SOAP EMR history states
  const [emrRecords, setEmrRecords] = useState<any>(null);
  const [historicalAssessments, setHistoricalAssessments] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Document Centre states
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadCategory, setUploadCategory] = useState('consent');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Feedback states
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');

  // Notifications feed
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Secure Messaging states
  const [chatContacts, setChatContacts] = useState<any[]>([]);
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  // UniMind AI Wellbeing states
  const [uniMindMessages, setUniMindMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [uniMindInput, setUniMindInput] = useState('');
  const [uniMindLoading, setUniMindLoading] = useState(false);
  const uniMindBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAppointments();
    fetchEMR();
    fetchDocuments();
    fetchContacts();
    fetchProviders();
    fetchAnnouncements();
    fetchAssessments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.appointments.list();
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEMR = async () => {
    if (!studentProfile) return;
    try {
      const emr = await api.clinical.getEMR(studentProfile.id);
      setEmrRecords(emr);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssessments = async () => {
    try {
      const data = await api.assessments.list();
      setHistoricalAssessments(data);
      
      // Build Recharts timeline data
      // Group by date, find scores
      const dateMap: Record<string, { date: string; phq9?: number; gad7?: number }> = {};
      
      data.forEach((ass: any) => {
        const dateStr = new Date(ass.assessment_date).toLocaleDateString();
        const scoreVal = ass.scores?.totalScore || 0;
        
        if (!dateMap[dateStr]) {
          dateMap[dateStr] = { date: dateStr };
        }
        
        if (ass.type === 'PHQ-9') {
          dateMap[dateStr].phq9 = scoreVal;
        } else if (ass.type === 'GAD-7') {
          dateMap[dateStr].gad7 = scoreVal;
        }
      });
      
      const timelineData = Object.values(dateMap).sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      setChartData(timelineData);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDocuments = async () => {
    if (!studentProfile) return;
    try {
      const docs = await api.documents.list({ studentId: studentProfile.id });
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.admin.announcements();
      setAnnouncements(res);
    } catch (err) {
      console.error(err);
    }
  };

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

  const fetchProviders = async () => {
    try {
      const data = await api.providers.list();
      setProviders(data);
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

  useEffect(() => {
    if (selectedProviderId && bookingDate) {
      fetchSlots();
    }
  }, [selectedProviderId, bookingDate]);

  const fetchSlots = async () => {
    try {
      const res = await api.appointments.getAvailableSlots(parseInt(selectedProviderId), bookingDate);
      setAvailableSlots(res.slots || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId || !bookingDate || !selectedSlot || !bookingReason) {
      alert("All booking fields are required");
      return;
    }

    try {
      const res = await api.appointments.book({
        providerId: parseInt(selectedProviderId),
        date: bookingDate,
        timeSlot: selectedSlot,
        reason: bookingReason
      });

      alert(res.message);
      fetchAppointments();
      
      setSelectedProviderId('');
      setBookingDate('');
      setSelectedSlot('');
      setBookingReason('');
      setAvailableSlots([]);
    } catch (err: any) {
      alert(err.message || "Failed to book appointment");
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert("Please select a file to upload");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = (reader.result as string).split(',')[1];
      try {
        await api.documents.upload({
          studentId: studentProfile.id,
          category: uploadCategory,
          fileName: uploadFile.name,
          fileData: base64String
        });

        alert("File uploaded successfully!");
        setUploadFile(null);
        const fileInput = document.getElementById('file-uploader') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        fetchDocuments();
      } catch (err: any) {
        alert(err.message || "Upload failed");
      }
    };
    reader.readAsDataURL(uploadFile);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thank you for your valuable feedback! CUAP Counseling Centre aims to continuously improve student mental health support.");
    setFeedbackRating(5);
    setFeedbackComments('');
  };

  // UniMind chat handler
  const handleUniMindChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = uniMindInput.trim();
    if (!text || uniMindLoading) return;

    const userMsg = { sender: 'user' as const, text };
    const nextHistory = [...uniMindMessages, userMsg];
    setUniMindMessages(nextHistory);
    setUniMindInput('');
    setUniMindLoading(true);

    try {
      const res = await api.auth.studentChat(text, nextHistory);
      setUniMindMessages(prev => [...prev, { sender: 'ai', text: res.reply }]);
    } catch (err: any) {
      setUniMindMessages(prev => [
        ...prev,
        { sender: 'ai', text: '⚠️ I\'m having trouble connecting right now. Please try again in a moment.' }
      ]);
    } finally {
      setUniMindLoading(false);
    }
  };

  // Auto-scroll UniMind chat to bottom
  useEffect(() => {
    if (uniMindBottomRef.current) {
      uniMindBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [uniMindMessages, uniMindLoading]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      
      <aside className="w-full lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" className="w-10 h-10 object-contain" alt="CUAP Logo" />
            <div>
              <h1 className="text-xs font-black leading-tight text-slate-800 dark:text-slate-205">CUAP SWCC</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Student Dashboard</p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'appointments', label: 'Book Appointment', icon: Calendar },
              { id: 'prescriptions', label: 'Counseling & Rx Logs', icon: BookOpen },
              { id: 'documents', label: 'Document Centre', icon: FileText },
              { id: 'assessment', label: 'Assessments Desk', icon: Clipboard },
              { id: 'unimind', label: 'UniMind AI Wellbeing', icon: Sparkles },
              { id: 'chat', label: 'Secure Messenger', icon: MessageSquare },
              { id: 'feedback', label: 'Feedback & Emergency', icon: Heart }
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
              ST
            </div>
            <div>
              <p className="text-xs font-bold">{studentProfile?.name || user.username}</p>
              <p className="text-[10px] text-slate-400 font-mono">{studentProfile?.registration_number?.toUpperCase()}</p>
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

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-h-screen">
        
        {activeTab === 'appointments' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight font-sans">Book a Counseling Session</h2>
              <p className="text-xs text-slate-500 mt-1">Schedule a counseling session with one of the university counseling specialists</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm h-fit">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Request Slot</h3>
                <form onSubmit={handleBookAppointment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Counseling Specialist</label>
                    <select
                      required
                      value={selectedProviderId}
                      onChange={(e) => setSelectedProviderId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-medium"
                    >
                      <option value="">Select Counselor</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>
                          Dr. {p.name} ({p.specialization || 'Clinical Psychology'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Desired Date</label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-medium"
                    />
                  </div>

                  {availableSlots.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Available Time Slots</label>
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map(slot => (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`py-1.5 px-2 border text-xs font-semibold rounded-lg text-center cursor-pointer transition ${
                              selectedSlot === slot.time
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                : (slot.status === 'occupied' 
                                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-800 dark:text-amber-300' 
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50')
                            }`}
                          >
                            {slot.time}
                            {slot.status === 'occupied' && (
                              <span className="block text-[8px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">(Waitlist)</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Reason for Session</label>
                    <textarea
                      required
                      rows={3}
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                      placeholder="e.g., anxiety issues, sleep disturbances, study stress..."
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-sm cursor-pointer"
                  >
                    Request Counseling Booking
                  </button>
                </form>
              </div>

              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Your Session Statuses</h3>
                  {appointments.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">No scheduled sessions.</div>
                  ) : (
                    <div className="space-y-4">
                      {appointments.map((a, idx) => (
                        <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">Dr. {a.provider_name}</span>
                              <span className="text-xs text-slate-400 font-semibold">{a.provider_spec || 'Clinical Psychologist'}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1"><strong>Schedule:</strong> {a.slot_date} at {a.slot_time}</p>
                            <p className="text-xs text-slate-500 mt-0.5"><strong>Reason:</strong> {a.reason}</p>
                          </div>

                          <div className="flex items-center gap-4">
                            {a.status === 'approved' && (
                              <div className="text-center p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 shadow-sm shrink-0">
                                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center text-[8px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-1 select-none">
                                  [ QR ]
                                </div>
                                <span className="text-[8px] text-slate-400 block font-mono">{a.qr_code.substring(0, 12)}</span>
                              </div>
                            )}

                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                              a.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
                              a.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' :
                              a.status === 'waiting' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                              'bg-slate-100 text-slate-850 dark:bg-slate-800 dark:text-slate-355'
                            }`}>
                              {a.status}
                              {a.status === 'waiting' && ` (Pos: ${a.waitlist_position})`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {announcements.length > 0 && (
                  <div className="bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-blue-800 dark:text-blue-300 font-bold text-sm">
                      <Bell size={18} />
                      Central Counseling Announcement
                    </div>
                    <p className="text-xs text-blue-900 dark:text-blue-400 leading-relaxed font-semibold">
                      {announcements[0]?.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Your Counseling EMR & Prescriptions Logs</h2>
              <p className="text-xs text-slate-500 mt-1">Review counseling session history, diagnoses, and download prescriptions</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Prescription Records</h3>
              {!emrRecords || emrRecords.prescriptions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No prescriptions issued yet.</div>
              ) : (
                <div className="space-y-4">
                  {emrRecords.prescriptions.map((p: any, idx: number) => (
                    <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-sm block text-slate-900 dark:text-white">{p.diagnosis}</span>
                        <span className="text-xs text-slate-500">Issued by Dr. {p.provider_name} | {new Date(p.prescription_date).toLocaleDateString()}</span>
                      </div>
                      <button
                        onClick={() => window.open(api.clinical.getPrintUrl(p.id), '_blank')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        <Printer size={14} /> Print / Save PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight font-sans">Document Centre</h2>
              <p className="text-xs text-slate-500 mt-1">Upload signed digital consent forms, assessments, and medical reports</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm h-fit">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Upload Document</h3>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Document Classification</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-medium"
                    >
                      <option value="consent">Digital Consent Form</option>
                      <option value="report">Clinical Report</option>
                      <option value="certificate">Counseling Certificate</option>
                      <option value="session_doc">Assessment Sheet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Select File (PDF, Images)</label>
                    <input
                      id="file-uploader"
                      type="file"
                      required
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full text-xs font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-sm cursor-pointer"
                  >
                    Upload Document
                  </button>
                </form>
              </div>

              <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Active Documents</h3>
                {documents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">No documents uploaded.</div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((d, idx) => (
                      <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm block text-slate-900 dark:text-white">{d.file_name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded uppercase inline-block mt-1">
                            {d.category}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2 font-medium">Version: v{d.version}</span>
                        </div>
                        <a
                          href={api.documents.downloadUrl(d.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-500 hover:text-slate-800"
                          title="Download File"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessment' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight font-sans">Self-Screening Assessments Centre</h2>
              <p className="text-xs text-slate-500 mt-1">Complete screening tests and track score trends over time</p>
            </div>
            
            {studentProfile && (
              <AssessmentModule 
                studentId={studentProfile.id} 
                onSuccess={() => {
                  fetchEMR();
                  fetchAssessments();
                }} 
              />
            )}

            {/* Recharts Screening line charts */}
            {chartData.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Your Screening Score Progress Timeline</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                      <Legend />
                      <Line type="monotone" name="PHQ-9 (Depression)" dataKey="phq9" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5 }} connectNulls />
                      <Line type="monotone" name="GAD-7 (Anxiety)" dataKey="gad7" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Secure Messaging Portal</h2>
              <p className="text-xs text-slate-500 mt-1">Encrypted counseling dialogue channels with active specialists</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden h-[600px]">
              <div className="border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Active Counselors</h3>
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
                      <span className="font-bold text-sm block text-slate-900 dark:text-white">{c.display_name}</span>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{c.specialization || 'Clinical Counselor'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col justify-between h-full bg-slate-50/50 dark:bg-slate-900/10">
                {activeContactId ? (
                  <>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[480px]">
                      {messages.length === 0 ? (
                        <div className="py-24 text-center text-slate-400 text-sm">Send a message to initialize your counseling inquiry.</div>
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

                    <form onSubmit={handleSendChat} className="p-4 border-t border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-900 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write message..."
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
                    Select an available provider to start a secure counseling session thread.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Center Feedback & Emergency Support</h2>
              <p className="text-xs text-slate-500 mt-1">Submit feedback or consult emergency contact directories</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm h-fit">
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                  <Clipboard size={20} />
                  <h3 className="font-bold text-slate-900 dark:text-white">Submit Session Feedback</h3>
                </div>
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Service Rating (1 to 5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFeedbackRating(rating)}
                          className={`w-10 h-10 rounded-xl font-bold border text-sm transition cursor-pointer ${
                            feedbackRating === rating
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Comments / Experience</label>
                    <textarea
                      value={feedbackComments}
                      onChange={(e) => setFeedbackComments(e.target.value)}
                      placeholder="Share your thoughts about your counseling session..."
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Submit Feedback
                  </button>
                </form>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm text-slate-700 dark:text-slate-350">
                <div className="flex items-center gap-2 mb-4 text-red-600">
                  <PhoneCall size={20} className="animate-bounce" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Emergency Clinical Contacts</h3>
                </div>

                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-slate-500">
                    If you are experiencing severe distress, crisis thoughts, or self-harm concerns, please reach out to these emergency details immediately.
                  </p>

                  <div className="p-4 border border-red-100 dark:border-red-950/40 bg-red-50/50 dark:bg-red-950/10 rounded-xl space-y-2">
                    <p className="text-sm font-bold text-red-900 dark:text-red-300">CUAP Counseling Crisis Helpline</p>
                    <p className="text-lg font-black text-red-600 font-mono">+91 800-425-CUAP</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Available 24/7. Confidential and Free.</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p><strong>University Health Centre:</strong> +91 851-248-1009</p>
                    <p><strong>Vikas Hospital (Emergency Ambulance):</strong> +91 851-248-9111</p>
                    <p><strong>National Psych Counseling Line (KIRAN):</strong> 1800-599-0019</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: UniMind AI Wellbeing */}
        {activeTab === 'unimind' && (
          <div className="flex flex-col h-[calc(100vh-5rem)] animate-fade-in-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 mb-4 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">UniMind AI Wellbeing</h2>
                  <p className="text-purple-200 text-xs font-medium mt-0.5">Your 24/7 empathetic support companion — CBT, DBT & Mindfulness based</p>
                </div>
                <div className="ml-auto flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white text-xs font-bold">Active</span>
                </div>
              </div>
              {/* Suggested prompts */}
              {uniMindMessages.length === 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "I\'m feeling overwhelmed with exams",
                    "Help me with Box Breathing",
                    "I can\'t focus on my dissertation",
                    "I feel isolated on campus"
                  ].map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => { setUniMindInput(prompt); }}
                      className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl border border-white/20 transition cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat messages area */}
            <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-2">
              {uniMindMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-400 space-y-3">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-950/40 dark:to-purple-950/40 flex items-center justify-center">
                    <Bot size={36} className="text-violet-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Hello, I\'m UniMind 👋</p>
                    <p className="text-xs mt-1 max-w-xs">Your private AI wellbeing companion. Start a conversation or pick a topic above — I\'m here to help.</p>
                  </div>
                </div>
              )}

              {uniMindMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.sender === 'ai'
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm'
                      : 'bg-blue-100 dark:bg-slate-700'
                  }`}>
                    {msg.sender === 'ai'
                      ? <Sparkles size={14} className="text-white" />
                      : <User size={14} className="text-blue-600 dark:text-slate-300" />
                    }
                  </div>
                  {/* Bubble */}
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                  }`}>
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {uniMindLoading && (
                <div className="flex gap-3 flex-row">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <div className="flex gap-1.5 items-center h-4">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={uniMindBottomRef} />
            </div>

            {/* Safety disclaimer */}
            <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl mb-3 text-amber-700 dark:text-amber-400">
              <AlertTriangle size={13} className="shrink-0" />
              <p className="text-[10px] font-semibold">UniMind is an AI assistant, not a licensed therapist. For emergencies call <strong>Tele-MANAS: 14416</strong> or visit the CUAP Health Centre.</p>
            </div>

            {/* Input bar */}
            <form onSubmit={handleUniMindChat} className="flex gap-3">
              <input
                type="text"
                value={uniMindInput}
                onChange={e => setUniMindInput(e.target.value)}
                placeholder="Share what\'s on your mind..."
                disabled={uniMindLoading}
                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-600 transition disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={uniMindLoading || !uniMindInput.trim()}
                className="px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-2xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
