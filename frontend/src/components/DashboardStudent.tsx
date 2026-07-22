import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
  Calendar,
  Clock,
  BookOpen,
  FileText,
  Send,
  Bell,
  User,
  MessageSquare,
  Plus,
  Download,
  Award,
  Shield,
  PhoneCall,
  Check,
  Heart,
  Clipboard,
  HelpCircle,
  Eye,
  Printer,
  Sparkles,
  Bot,
  AlertTriangle,
  Menu,
  Trash2,
  AlertCircle,
  X,
  LayoutDashboard,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import AssessmentModule from './AssessmentModule';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ui/ThemeToggle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSidebar } from '@/hooks/useSidebar';
import Sidebar from './ui/Sidebar';
import Breadcrumbs from './ui/Breadcrumbs';
import NotificationCenter from './ui/NotificationCenter';

interface StudentProps {
  onLogout: () => void;
  studentProfile: any;
  user: any;
}

// Helper: Coming Soon card for future modules
function ComingSoonCard({
  icon,
  color,
  title,
  desc,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  desc: string;
}) {
  const bgMap: Record<string, string> = {
    orange: 'bg-orange-50',
    teal: 'bg-teal-50',
    amber: 'bg-amber-50',
    indigo: 'bg-indigo-50',
    pink: 'bg-pink-50',
    green: 'bg-green-50',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left opacity-70">
      <div
        className={`w-10 h-10 rounded-xl ${bgMap[color] || 'bg-slate-100'} flex items-center justify-center mb-4`}
      >
        {icon}
      </div>
      <h4 className="font-black text-slate-900 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">{desc}</p>
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold">
        🕐 Coming Soon
      </span>
    </div>
  );
}

export default function DashboardStudent({ onLogout, studentProfile, user }: StudentProps) {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'appointments'
    | 'prescriptions'
    | 'documents'
    | 'assessment'
    | 'chat'
    | 'unimind'
    | 'feedback'
  >('overview');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);

  const isMobile = useMediaQuery('(max-width: 1023px)');

  // Sidebar state hook
  const sidebar = useSidebar();
  const { sidebarCollapsed } = sidebar;

  const [isStatusAccordionOpen, setIsStatusAccordionOpen] = useState(false);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const tabLabels: Record<string, string> = {
    overview: 'Dashboard Overview',
    appointments: 'Request Appointment',
    prescriptions: 'Counselling & Rx Logs',
    documents: 'Document Centre',
    assessment: 'Assessments Desk',
    chat: 'Secure Messenger',
    feedback: 'Feedback & Emergency',
  };

  // Auth context for refreshing profile state
  const { refreshSession } = useAuth();

  // Booking states
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<number[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // Redesigned booking form intake states
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [reasonReferral, setReasonReferral] = useState('');
  const [presentingProblem, setPresentingProblem] = useState('');
  const [durationProblem, setDurationProblem] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Prescription, SOAP EMR history states
  const [emrRecords, setEmrRecords] = useState<any>(null);
  const [historicalAssessments, setHistoricalAssessments] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Document Centre states
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadCategory, setUploadCategory] = useState('consent');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Digital Consent Form states
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  // Document upload states
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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
  const [uniMindMessages, setUniMindMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>(
    [],
  );
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
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchPermissions = async () => {
    try {
      const res = await api.auth.getPermissions();
      setPermissions(res);
    } catch (err) {
      console.error(err);
    }
  };

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

      const sorted = [...data].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const formatted = sorted.map((item) => ({
        date: new Date(item.created_at).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        }),
        phq9: item.type === 'phq9' ? item.score : null,
        gad7: item.type === 'gad7' ? item.score : null,
      }));
      setChartData(formatted);
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

  const handleSubmitConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAccepted || !signatureName.trim()) {
      showToast(
        'You must accept the counseling consent and provide your digital signature.',
        'error',
      );
      return;
    }
    try {
      const res = await api.documents.submitConsent({
        signature: signatureName,
        date: new Date().toISOString(),
      });
      showToast(res.message || 'Consent form submitted successfully!', 'success');
      await refreshSession();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit consent form.', 'error');
    }
  };

  const handleDeleteDocument = async (id: number, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This action cannot be undone.`)) return;
    try {
      await api.documents.delete(id);
      fetchDocuments();
      showToast('Document deleted successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document.', 'error');
    }
  };

  const handleDropUpload = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContactId || !replyText.trim()) return;

    try {
      await api.messages.send({
        receiverId: activeContactId,
        content: replyText,
      });
      setReplyText('');
      loadChatHistory(activeContactId);
    } catch (err) {
      showToast('Failed to send message', 'error');
    }
  };

  useEffect(() => {
    if (selectedProviderId && bookingDate) {
      fetchSlots();
    }
  }, [selectedProviderId, bookingDate]);

  const fetchSlots = async () => {
    try {
      const res = await api.appointments.getAvailableSlots(
        parseInt(selectedProviderId),
        bookingDate,
      );
      setAvailableSlots(res.slots || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId || !bookingDate || !selectedSlot || !chiefComplaint) {
      showToast('Specialist, Date, Time Slot, and Chief Complaint are required.', 'error');
      return;
    }

    try {
      const res = await api.appointments.book({
        providerId: parseInt(selectedProviderId),
        date: bookingDate,
        timeSlot: selectedSlot,
        chiefComplaint,
        reasonReferral,
        presentingProblem,
        durationProblem,
        additionalNotes,
      });

      showToast(
        `Appointment successfully requested for ${bookingDate} at ${selectedSlot}.`,
        'success',
      );
      fetchAppointments();

      setSelectedProviderId('');
      setBookingDate(new Date().toISOString().split('T')[0]);
      setSelectedSlot('');
      setChiefComplaint('');
      setReasonReferral('');
      setPresentingProblem('');
      setDurationProblem('');
      setAdditionalNotes('');
      setAvailableSlots([]);
    } catch (err: any) {
      showToast(err.message || 'Failed to book appointment', 'error');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = (reader.result as string).split(',')[1];
      try {
        setUploadProgress(30);
        await api.documents.upload({
          studentId: studentProfile.id,
          category: uploadCategory,
          fileName: uploadFile.name,
          fileData: base64String,
        });
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(null), 1200);
        setUploadFile(null);
        const fileInput = document.getElementById('file-uploader') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchDocuments();
        showToast('Document uploaded successfully.', 'success');
      } catch (err: any) {
        setUploadProgress(null);
        showToast(err.message || 'Upload failed', 'error');
      }
    };
    reader.readAsDataURL(uploadFile);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(
      'Thank you for your valuable feedback! CUAP Counseling Centre aims to continuously improve student mental health support.',
      'success',
    );
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
      setUniMindMessages((prev) => [...prev, { sender: 'ai', text: res.reply }]);
    } catch (err: any) {
      setUniMindMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: "⚠️ I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setUniMindLoading(false);
    }
  };

  useEffect(() => {
    if (uniMindBottomRef.current) {
      uniMindBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [uniMindMessages, uniMindLoading]);

  const upcomingCount = appointments.filter(
    (a) => a.status === 'approved' || a.status === 'waiting',
  ).length;
  const scheduledCount = appointments.filter((a) => a.status === 'pending').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const cancelledCount = appointments.filter(
    (a) => a.status === 'cancelled' || a.status === 'rejected',
  ).length;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Backdrop overlay for mobile drawer */}
      {!sidebarCollapsed && isMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-45 transition-opacity duration-300"
          onClick={() => sidebar.toggleCollapse()}
        />
      )}

      <Sidebar
        navItems={[
          { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
          { id: 'appointments', label: 'Book Appointment', icon: Calendar },
          { id: 'prescriptions', label: 'Counseling & Rx Logs', icon: BookOpen },
          { id: 'documents', label: 'Document Centre', icon: FileText },
          { id: 'assessment', label: 'Assessments Desk', icon: Clipboard },
          { id: 'chat', label: 'Secure Messenger', icon: MessageSquare },
          { id: 'feedback', label: 'Feedback & Emergency', icon: Heart },
        ]}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        userName={studentProfile?.name || user?.username || 'Student'}
        userRoleLabel="Student Portal"
        userSubLabel={studentProfile?.registration_number?.toUpperCase()}
        {...sidebar}
      />

      <main className="flex-1 min-w-0 overflow-y-auto max-h-screen flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 h-16 flex justify-between items-center px-6 lg:px-10 shrink-0 z-40 sticky top-0">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button
                onClick={() => sidebar.toggleCollapse()}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                <Menu size={18} />
              </button>
            )}
            <h1 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-2">
              Student Wellness Hub · {activeTab.toUpperCase()}
            </h1>
          </div>

          <div className="flex items-center gap-4 mr-2 lg:mr-4">
            <div className="text-right hidden sm:block mr-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                {studentProfile?.name || user?.username}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {studentProfile?.registration_number?.toUpperCase()}
              </span>
            </div>
            <ThemeToggle />

            {/* Notification Bell */}
            <button
              onClick={() => setNotifCenterOpen(true)}
              className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-450 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition relative cursor-pointer"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/20 text-slate-600 hover:text-red-650 dark:text-slate-350 dark:hover:text-red-400 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-10 space-y-8">
          <Breadcrumbs
            portalName="Student Portal"
            activeTabLabel={tabLabels[activeTab] || activeTab}
          />

          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight font-sans">
                  Welcome to Student Wellness Hub 👋
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Access counseling schedules, EMR summaries, self-screenings, and AI helpers in one
                  workspace
                </p>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* KPI 1: Next Session */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                      Next Appointment
                    </span>
                    <h3 className="text-base font-extrabold text-slate-855 dark:text-slate-100 mt-2 leading-snug">
                      {appointments.find((a) => a.status === 'approved')
                        ? `Dr. ${appointments.find((a) => a.status === 'approved').provider_name}`
                        : 'No active session'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {appointments.find((a) => a.status === 'approved')
                        ? `${appointments.find((a) => a.status === 'approved').slot_date} at ${appointments.find((a) => a.status === 'approved').slot_time}`
                        : 'Schedule a session below'}
                    </p>
                  </div>
                  {appointments.find((a) => a.status === 'approved') && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-4">
                      ✓ Confirmed
                    </span>
                  )}
                </div>

                {/* KPI 2: Consent */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                      Counseling Consent
                    </span>
                    <h3 className="text-base font-extrabold text-slate-855 dark:text-slate-100 mt-2 leading-snug">
                      {studentProfile?.informed_consent_signed
                        ? 'Signed & Submitted'
                        : 'Pending signature'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {studentProfile?.informed_consent_signed
                        ? `Consent date: ${new Date(studentProfile.consent_date).toLocaleDateString()}`
                        : 'Action required in Document Centre'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider mt-4 ${
                      studentProfile?.informed_consent_signed
                        ? 'text-emerald-600'
                        : 'text-amber-500 animate-pulse'
                    }`}
                  >
                    {studentProfile?.informed_consent_signed ? '✓ Compliant' : '⚠️ Unsigned'}
                  </span>
                </div>

                {/* KPI 3: Screenings */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                      Self-Assessments
                    </span>
                    <h3 className="text-base font-extrabold text-slate-855 dark:text-slate-100 mt-2 leading-snug">
                      {historicalAssessments.length} Completed
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Take mental health quizzes (PHQ-9, GAD-7)
                    </p>
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-4">
                    Track Severity
                  </span>
                </div>

                {/* KPI 4: Unread messages */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                      Announcements
                    </span>
                    <h3 className="text-base font-extrabold text-slate-855 dark:text-slate-100 mt-2 leading-snug">
                      {announcements.length} Published
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Latest:{' '}
                      {announcements[0]
                        ? announcements[0].message.substring(0, 30) + '...'
                        : 'None'}
                    </p>
                  </div>
                  <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold uppercase tracking-wider mt-4">
                    Central Bulletins
                  </span>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-855 border border-blue-200/50 dark:border-slate-800 rounded-2xl text-left cursor-pointer transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <Calendar className="text-blue-600 dark:text-blue-400 mb-3" size={20} />
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">Book Session</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Find an available slot</p>
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className="p-4 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-slate-900 dark:to-slate-855 border border-violet-200/50 dark:border-slate-800 rounded-2xl text-left cursor-pointer transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <FileText className="text-violet-600 dark:text-violet-400 mb-3" size={20} />
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">
                    Consent & Files
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Upload history records</p>
                </button>
                <button
                  onClick={() => setActiveTab('assessment')}
                  className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-slate-900 dark:to-slate-855 border border-emerald-200/50 dark:border-slate-800 rounded-2xl text-left cursor-pointer transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <Clipboard className="text-emerald-600 dark:text-emerald-400 mb-3" size={20} />
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">
                    Start Screening
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Analyze mood patterns</p>
                </button>
                <button
                  onClick={() => setActiveTab('feedback')}
                  className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-slate-900 dark:to-slate-855 border border-rose-200/50 dark:border-slate-800 rounded-2xl text-left cursor-pointer transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <Heart className="text-rose-600 dark:text-rose-400 mb-3" size={20} />
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">
                    Crisis Support
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Emergency direct numbers</p>
                </button>
              </div>

              {/* Line Chart */}
              {historicalAssessments && historicalAssessments.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 mb-6 uppercase tracking-wider text-[10px]">
                    📊 Self-Screening Score Progression
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeOpacity={0.5} />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} fontStyle="bold" />
                        <YAxis stroke="#94A3B8" fontSize={10} fontStyle="bold" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--card)',
                            borderColor: 'var(--border)',
                            borderRadius: '12px',
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="phq9"
                          stroke="#3B82F6"
                          strokeWidth={3}
                          connectNulls
                          activeDot={{ r: 6 }}
                          name="PHQ-9 (Depression)"
                        />
                        <Line
                          type="monotone"
                          dataKey="gad7"
                          stroke="#10B981"
                          strokeWidth={3}
                          connectNulls
                          activeDot={{ r: 6 }}
                          name="GAD-7 (Anxiety)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-12 rounded-2xl text-center text-slate-400 text-xs font-semibold">
                  No screening assessments completed yet. Take your first self-quiz in the
                  "Assessments Desk" tab to map your progress!
                </div>
              )}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight font-sans">
                  Book a Counseling Session
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Schedule a counseling session with one of the university counseling specialists
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Main Content Area: 75% width */}
                <div className="lg:col-span-9 space-y-6 min-w-0">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-xl shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider text-[11px]">
                      Request Appointment
                    </h3>
                    <form onSubmit={handleBookAppointment} className="space-y-6">
                      {/* 1. Counselor Selector Grid */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Select Counselor *
                        </label>
                        {providers.length === 0 ? (
                          <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 p-4 border rounded-xl">
                            No counselors currently available.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {providers.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => setSelectedProviderId(String(p.id))}
                                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-center select-none ${
                                  selectedProviderId === String(p.id)
                                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm ring-1 ring-blue-500/20'
                                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                }`}
                              >
                                <p className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                                  Dr. {p.name}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                                  {p.specialization || 'Clinical Psychology'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        <input type="hidden" required value={selectedProviderId} />
                      </div>

                      {/* 2. Date & Time Selection Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                            Preferred Date *
                          </label>
                          <input
                            type="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                            Preferred Time Slot *
                          </label>
                          <select
                            required
                            value={selectedSlot}
                            onChange={(e) => setSelectedSlot(e.target.value)}
                            disabled={!selectedProviderId || !bookingDate}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-white"
                          >
                            <option value="">
                              {!selectedProviderId || !bookingDate
                                ? 'Select counselor & date first'
                                : availableSlots.length === 0
                                  ? 'No slots available'
                                  : 'Select Time Slot'}
                            </option>
                            {availableSlots.map((slot) => (
                              <option
                                key={slot.time}
                                value={slot.time}
                                disabled={slot.status === 'occupied'}
                              >
                                {slot.time} {slot.status === 'occupied' ? '(Booked)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                            Chief Complaint *
                          </label>
                          <textarea
                            required
                            rows={3}
                            value={chiefComplaint}
                            onChange={(e) => setChiefComplaint(e.target.value)}
                            placeholder="Describe your primary complaint (anxiety, sleep issue, academic stress)..."
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-200"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                            Reason for Referral
                          </label>
                          <textarea
                            rows={3}
                            value={reasonReferral}
                            onChange={(e) => setReasonReferral(e.target.value)}
                            placeholder="Who referred you or why? (Optional)"
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 text-slate-855 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                            Presenting Problem
                          </label>
                          <textarea
                            rows={2}
                            value={presentingProblem}
                            onChange={(e) => setPresentingProblem(e.target.value)}
                            placeholder="Describe the presenting symptoms..."
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 text-slate-855 dark:text-slate-200"
                          />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                              Duration of Problem
                            </label>
                            <input
                              type="text"
                              value={durationProblem}
                              onChange={(e) => setDurationProblem(e.target.value)}
                              placeholder="e.g., 3 weeks, since exams"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                              Additional Notes (Optional)
                            </label>
                            <input
                              type="text"
                              value={additionalNotes}
                              onChange={(e) => setAdditionalNotes(e.target.value)}
                              placeholder="Any extra info..."
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-sm cursor-pointer"
                      >
                        Request Appointment
                      </button>
                    </form>
                  </div>
                </div>

                {/* Session Status Sidebar: 25% width */}
                <div className="lg:col-span-3 lg:sticky lg:top-20 h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-4 pr-1">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-sm overflow-hidden">
                    <div
                      onClick={() => setIsStatusAccordionOpen(!isStatusAccordionOpen)}
                      className="p-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 lg:cursor-default cursor-pointer bg-slate-50/50 dark:bg-slate-950/20"
                    >
                      <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                        <span>🗓️ Session Statuses</span>
                      </h3>
                      <span className="lg:hidden text-slate-400 font-bold text-xs">
                        {isStatusAccordionOpen ? '▲' : '▼'}
                      </span>
                    </div>

                    <div
                      className={`${isStatusAccordionOpen ? 'block' : 'hidden lg:block'} p-3 space-y-3`}
                    >
                      {/* Metric Counts */}
                      <div className="grid grid-cols-2 gap-1.5 text-center">
                        <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30">
                          <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider block">
                            Upcoming
                          </span>
                          <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                            {upcomingCount}
                          </span>
                        </div>
                        <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30">
                          <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider block">
                            Scheduled
                          </span>
                          <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                            {scheduledCount}
                          </span>
                        </div>
                        <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30">
                          <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider block">
                            Completed
                          </span>
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                            {completedCount}
                          </span>
                        </div>
                        <div className="p-1.5 rounded bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30">
                          <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider block">
                            Cancelled
                          </span>
                          <span className="text-xs font-black text-rose-700 dark:text-rose-300">
                            {cancelledCount}
                          </span>
                        </div>
                      </div>

                      {/* Compact List */}
                      <div className="space-y-2">
                        {appointments.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs">
                            No appointments scheduled.
                          </div>
                        ) : (
                          appointments.map((a, idx) => (
                            <div
                              key={idx}
                              className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900/80 shadow-xs space-y-1.5 text-xs transition hover:shadow-sm"
                            >
                              <div className="flex justify-between items-start gap-1">
                                <div>
                                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-[11px] leading-tight">
                                    Dr. {a.provider_name}
                                  </h4>
                                  <p className="text-[9px] text-slate-400 font-medium">
                                    {a.provider_spec || 'Clinical Psychologist'}
                                  </p>
                                </div>
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ${
                                    a.status === 'approved'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-300'
                                      : a.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300'
                                        : a.status === 'waiting'
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300'
                                          : a.status === 'rejected'
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-300'
                                            : 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {a.status === 'pending'
                                    ? 'Pending'
                                    : a.status === 'approved'
                                      ? 'Accepted'
                                      : a.status}
                                  {a.status === 'waiting' && ` (Pos: ${a.waitlist_position})`}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-1.5">
                                <div>
                                  <span className="text-[8px] text-slate-400 block uppercase font-bold">
                                    Date
                                  </span>
                                  <span className="font-semibold">{a.slot_date}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-400 block uppercase font-bold">
                                    Time
                                  </span>
                                  <span className="font-semibold">{a.slot_time}</span>
                                </div>
                              </div>

                              {a.chief_complaint && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-1">
                                  <span className="text-[8px] text-slate-400 block uppercase font-bold">
                                    Chief Complaint
                                  </span>
                                  <p className="truncate font-medium">{a.chief_complaint}</p>
                                </div>
                              )}

                              {a.status === 'approved' && a.qr_code && (
                                <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                                  <div className="px-1 py-0.5 bg-slate-200 dark:bg-slate-850 rounded text-[7px] font-bold font-mono text-slate-500 uppercase tracking-widest shrink-0">
                                    [QR]
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-mono truncate">
                                    {a.qr_code.substring(0, 12)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {announcements.length > 0 &&
                    !dismissedAnnouncements.includes(announcements[0].id) && (
                      <div className="bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 p-4 rounded-xl shadow-sm text-xs relative pr-8">
                        <div className="flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300 font-bold">
                          <Bell size={16} className="shrink-0" />
                          <span>Central Announcement</span>
                        </div>
                        <p className="text-blue-900 dark:text-blue-400 leading-relaxed font-semibold">
                          {announcements[0]?.message.replace(/^CUAP Announcement:\s*/, '')}
                        </p>
                        <button
                          onClick={() =>
                            setDismissedAnnouncements([
                              ...dismissedAnnouncements,
                              announcements[0].id,
                            ])
                          }
                          className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none"
                          aria-label="Dismiss announcement"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prescriptions' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  Your Counseling EMR & Prescriptions Logs
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Review counseling session history, diagnoses, and download prescriptions
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 p-6 rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
                  Prescription Records
                </h3>
                {!emrRecords || emrRecords.prescriptions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    No prescriptions issued yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emrRecords.prescriptions.map((p: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-sm block text-slate-900 dark:text-white">
                            {p.masked ? '🔒 Prescription Not Yet Released' : p.diagnosis}
                          </span>
                          <span className="text-xs text-slate-500">
                            {p.masked
                              ? 'Your counselor has not yet released your prescription for viewing.'
                              : `Issued by Dr. ${p.provider_name} | ${new Date(p.prescription_date).toLocaleDateString()}`}
                          </span>
                        </div>
                        {!p.masked && (
                          <button
                            onClick={() => window.open(api.clinical.getPrintUrl(p.id), '_blank')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                          >
                            <Printer size={14} /> Print / Save PDF
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight font-sans">Document Centre</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your counseling consent, upload clinical documents, and track active
                  records
                </p>
              </div>

              {/* Row 1: Consent + Upload */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Digital Counseling Consent */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm h-fit">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex items-center justify-center text-base">
                        📋
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                        Digital Counseling Consent
                      </h3>
                    </div>
                    {studentProfile?.informed_consent_signed ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 text-[10px] font-black rounded-full uppercase tracking-wide border border-emerald-200 dark:border-emerald-900/40">
                        ✓ Submitted
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 text-[10px] font-black rounded-full uppercase tracking-wide border border-amber-200 dark:border-amber-900/40">
                        Pending
                      </span>
                    )}
                  </div>

                  {studentProfile?.informed_consent_signed ? (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl">
                        <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-1">
                          ✅ Consent Submitted
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-400/80 leading-relaxed">
                          Your digital counseling consent has been successfully recorded.
                        </p>
                      </div>
                      <div className="space-y-2 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-500">Submitted On:</span>
                          <span className="font-semibold">
                            {new Date(studentProfile.consent_date).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-500">Digital Signature:</span>
                          <span className="font-serif italic font-bold text-slate-800 dark:text-white">
                            {studentProfile.name || 'Student'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                        A new consent may be requested by your counselor or administrator. Contact
                        CUAP Counseling Centre if you need to update your consent.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitConsent} className="space-y-5 text-xs">
                      <p className="text-slate-500 leading-relaxed">
                        Before booking your first counseling session, please read and accept the
                        Counseling Consent and Privacy Policy.
                      </p>

                      <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p>
                          <strong className="text-slate-700 dark:text-slate-300">
                            Consent for Counseling:
                          </strong>{' '}
                          I voluntarily consent to participate in psychological counseling services
                          at CUAP. I understand that counseling involves discussing personal matters
                          and working toward mental health goals.
                        </p>
                        <p>
                          <strong className="text-slate-700 dark:text-slate-300">
                            Confidentiality:
                          </strong>{' '}
                          All discussions remain strictly confidential except as required by law
                          (e.g., risk of harm to self or others).
                        </p>
                        <p>
                          <strong className="text-slate-700 dark:text-slate-300">
                            Electronic Records:
                          </strong>{' '}
                          I consent to CUAP WCCMS storing encrypted counseling records and
                          assessment notes securely.
                        </p>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          required
                          checked={consentAccepted}
                          onChange={(e) => setConsentAccepted(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                          I have read, understood, and voluntarily agree to the Counseling Consent
                          and Privacy Policy.
                        </span>
                      </label>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
                          Digital Signature (Type Full Name) *
                        </label>
                        <input
                          type="text"
                          required
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          placeholder="Your full official name"
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!consentAccepted || !signatureName.trim()}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition shadow-sm cursor-pointer"
                      >
                        Submit Consent
                      </button>
                    </form>
                  )}
                </div>

                {/* Upload Document */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm h-fit">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-8 h-8 bg-violet-50 dark:bg-violet-950/30 rounded-lg flex items-center justify-center text-base">
                      📤
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      Upload Document
                    </h3>
                  </div>
                  <form onSubmit={handleFileUpload} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                        Document Type
                      </label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-white"
                      >
                        <option value="consent">Health Consent Form</option>
                        <option value="psych_assessment">Psychological Assessment</option>
                        <option value="psychiatric_report">Psychiatric Report</option>
                        <option value="medical_report">Medical Report</option>
                        <option value="report">Counseling Report</option>
                        <option value="referral">Referral Letter</option>
                        <option value="certificate">Counseling Certificate</option>
                        <option value="prescription">Prescription</option>
                        <option value="session_doc">Assessment Sheet</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Drag-and-drop zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDropUpload}
                      onClick={() => document.getElementById('file-uploader')?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                        isDragOver
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <input
                        id="file-uploader"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      />
                      {uploadFile ? (
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-blue-600">📄 {uploadFile.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {(uploadFile.size / 1024).toFixed(1)} KB · Click to change
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-2xl">📁</p>
                          <p className="text-xs font-semibold text-slate-500">
                            Drop file here or{' '}
                            <span className="text-blue-600 font-bold">browse</span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Accepts PDF, JPG, PNG · Max 10MB
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Upload progress bar */}
                    {uploadProgress !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                          <span>Uploading…</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!uploadFile}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition shadow-sm cursor-pointer"
                    >
                      Upload Document
                    </button>
                  </form>
                </div>
              </div>

              {/* Row 2: Active Documents */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-base">
                      🗂️
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                        Active Documents
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {documents.length} document{documents.length !== 1 ? 's' : ''} on record
                      </p>
                    </div>
                  </div>
                </div>

                {documents.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="text-4xl">📂</div>
                    <p className="font-bold text-slate-500 text-sm">No documents uploaded yet</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Use the upload panel above to attach consent forms, medical reports, or
                      assessment sheets.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {documents.map((d, idx) => (
                      <div
                        key={idx}
                        className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-blue-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-base shrink-0">
                            {d.file_name?.endsWith('.pdf') ? '📄' : '🖼️'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[200px] md:max-w-xs">
                              {d.file_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-black px-2 py-0.5 bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded uppercase tracking-wider">
                                {d.category?.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                v{d.version}
                              </span>
                              {d.created_at && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {new Date(d.created_at).toLocaleDateString()}
                                </span>
                              )}
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-100 dark:border-emerald-900/30">
                                ✓ Uploaded
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          <a
                            href={api.documents.downloadUrl(d.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 rounded-lg transition text-slate-500"
                            title="View / Download"
                          >
                            <Download size={14} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(d.id, d.file_name)}
                            className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200 rounded-lg transition text-slate-400 cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'assessment' &&
            (() => {
              const hasAcceptedAppointment = appointments.some(
                (a) => a.status === 'approved' || a.status === 'completed',
              );
              const isAssessmentsUnlocked =
                studentProfile?.assessments_enabled || hasAcceptedAppointment;
              return (
                <div className="space-y-8 animate-fade-in-up">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight font-sans">
                      Self-Screening Assessments Centre
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Complete screening tests and track score trends over time
                    </p>
                  </div>

                  {!isAssessmentsUnlocked ? (
                    <div className="border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-2xl p-10 text-center shadow-sm max-w-xl mx-auto space-y-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl mx-auto">
                        🔒
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-white">
                        Assessments Locked
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        The Self-Screening Assessments Desk is locked until you attend your first
                        accepted counseling appointment, or until your counselor explicitly unlocks
                        it for you.
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Please use the <strong>Dev Simulator Panel</strong> on the "Book
                        Appointment" tab to unlock this section instantly for testing purposes.
                      </p>
                    </div>
                  ) : (
                    <>
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
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
                            Your Screening Score Progress Timeline
                          </h3>
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#334155"
                                  opacity={0.1}
                                />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderRadius: '8px',
                                  }}
                                />
                                <Legend />
                                <Line
                                  type="monotone"
                                  name="PHQ-9 (Depression)"
                                  dataKey="phq9"
                                  stroke="#3b82f6"
                                  strokeWidth={2.5}
                                  dot={{ r: 5 }}
                                  connectNulls
                                />
                                <Line
                                  type="monotone"
                                  name="GAD-7 (Anxiety)"
                                  dataKey="gad7"
                                  stroke="#10b981"
                                  strokeWidth={2.5}
                                  dot={{ r: 5 }}
                                  connectNulls
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

          {activeTab === 'chat' &&
            (() => {
              const approvedCounselorUsernames = appointments
                .filter((a) => a.status === 'approved')
                .map((a) => {
                  const prov = providers.find((p) => p.id === a.provider_id);
                  return prov ? prov.username : null;
                })
                .filter(Boolean);

              const allowedContacts = chatContacts.filter((c) =>
                approvedCounselorUsernames.includes(c.username),
              );

              return (
                <div className="space-y-8 animate-fade-in-up">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Secure Messaging Portal</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Encrypted counseling dialogue channels with active specialists
                    </p>
                  </div>

                  {allowedContacts.length === 0 ? (
                    <div className="border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-900 rounded-2xl p-10 text-center shadow-sm max-w-xl mx-auto space-y-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl mx-auto">
                        💬
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-white">
                        Secure Messenger Locked
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Messaging remains locked until a counselor accepts your appointment request.
                        You can only communicate with counselors who have accepted your
                        appointments.
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Once an appointment status changes to "Accepted", the corresponding
                        counselor's messaging channel will unlock automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-2xl shadow-sm overflow-hidden h-[600px]">
                      <div className="border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                          Active Counselors
                        </h3>
                        <div className="space-y-2">
                          {allowedContacts.map((c) => (
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
                              <span className="font-bold text-sm block text-slate-900 dark:text-white">
                                {c.display_name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                {c.specialization || 'Clinical Counselor'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-2 flex flex-col justify-between h-full bg-slate-50/50 dark:bg-slate-900/10">
                        {activeContactId &&
                        allowedContacts.some((ac) => ac.id === activeContactId) ? (
                          <>
                            <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[480px]">
                              {messages.length === 0 ? (
                                <div className="py-24 text-center text-slate-400 text-sm">
                                  Send a message to initialize your counseling inquiry.
                                </div>
                              ) : (
                                messages.map((m, idx) => {
                                  const isMe = m.sender_id === user.id;
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                      <div
                                        className={`p-3.5 max-w-sm rounded-2xl shadow-sm text-sm ${
                                          isMe
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-800'
                                        }`}
                                      >
                                        <p>{m.content}</p>
                                        <span
                                          className={`block text-[9px] mt-1.5 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}
                                        >
                                          {new Date(m.created_at).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            <form
                              onSubmit={handleSendChat}
                              className="p-4 border-t border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-900 flex gap-2"
                            >
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write message..."
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
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
                            Select an available provider to start a secure counseling session
                            thread.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {activeTab === 'feedback' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  Center Feedback & Emergency Support
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submit feedback or consult emergency contact directories
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm h-fit">
                  <div className="flex items-center gap-2 mb-4 text-blue-600">
                    <Clipboard size={20} />
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Submit Session Feedback
                    </h3>
                  </div>
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                        Service Rating (1 to 5)
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
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
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                        Comments / Experience
                      </label>
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

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm text-slate-700 dark:text-slate-355 space-y-6">
                  <div className="flex items-center gap-2 mb-4 text-emerald-600">
                    <Sparkles size={20} />
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                      CUAP Student Wellness Hub
                    </h3>
                  </div>

                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 text-xs leading-relaxed">
                    {/* Section 1: Mental Health Tips */}
                    <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-400 mb-2">
                        💡 Daily Mental Health Tips
                      </h4>
                      <ul className="list-disc pl-4 space-y-1.5 text-slate-655 dark:text-slate-400 font-medium">
                        <li>
                          Practice box breathing (inhale 4s, hold 4s, exhale 4s, hold 4s) when
                          stressed.
                        </li>
                        <li>
                          Take regular 10-minute walk breaks between study and screen sessions.
                        </li>
                        <li>Limit coffee consumption after 3 PM to ensure better sleep cycles.</li>
                        <li>
                          Stay connected - reach out to a trusted classmate or counselor if you feel
                          isolated.
                        </li>
                      </ul>
                    </div>

                    {/* Section 2: Wellness Resources */}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                        📚 Wellness Resources & Guides
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <a
                          href="#"
                          className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between border"
                        >
                          <span>Navigating Academic Burnout Guide</span>
                          <span className="text-emerald-500">→</span>
                        </a>
                        <a
                          href="#"
                          className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between border"
                        >
                          <span>Mindfulness Meditation Audio Tracks</span>
                          <span className="text-emerald-500">→</span>
                        </a>
                      </div>
                    </div>

                    {/* Section 3: Counseling Process */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-1.5">
                        🤝 The Counseling Process
                      </h4>
                      <p className="text-slate-500">
                        Counseling starts with an intake assessment to understand your chief
                        concerns. Subsequent sessions involve collaborative goal-setting, CBT/DBT
                        exercises, and supportive dialogue. Each session lasts 45 minutes.
                      </p>
                    </div>

                    {/* Section 4: FAQ */}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                        ❓ Frequently Asked Questions (FAQ)
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            Is counseling free at CUAP?
                          </p>
                          <p className="text-slate-500">
                            Yes, counseling is a fully funded student welfare service provided by
                            the University SWCC.
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            Can I request a specific counselor?
                          </p>
                          <p className="text-slate-500">
                            Absolutely, you can select your preferred counselor directly when
                            booking a session.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Appointment Guidelines */}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white mb-1.5">
                        📅 Appointment Guidelines
                      </h4>
                      <p className="text-slate-500">
                        Please arrive 5 minutes early for scheduled sessions. If you need to
                        reschedule or cancel, please provide at least 24 hours of notice through the
                        portal to permit waitlisted classmates to occupy the slot.
                      </p>
                    </div>

                    {/* Section 6: Privacy & Confidentiality Notice */}
                    <div className="p-3 bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                        🔒 Privacy & Confidentiality Notice
                      </h4>
                      <p className="text-slate-500">
                        Your trust is our priority. Counseling notes and files are encrypted and
                        separated from standard campus academic records. Info is only shared in the
                        event of immediate danger to oneself or others.
                      </p>
                    </div>

                    {/* Section 7: University Wellness Announcements */}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                        📢 Wellness Announcements
                      </h4>
                      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                        <p className="font-bold">Yoga & Meditation Bootcamp next Wednesday!</p>
                        <p className="text-slate-500 mt-1">
                          Join the campus-wide stress-buster bootcamp from 5:00 PM to 6:30 PM at the
                          central lawns.
                        </p>
                      </div>
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
                    <h2 className="text-xl font-black text-white tracking-tight">
                      UniMind AI Wellbeing
                    </h2>
                    <p className="text-purple-200 text-xs font-medium mt-0.5">
                      Your 24/7 empathetic support companion — CBT, DBT & Mindfulness based
                    </p>
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
                      'Help me with Box Breathing',
                      "I can\'t focus on my dissertation",
                      'I feel isolated on campus',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setUniMindInput(prompt);
                        }}
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
                      <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">
                        Hello, I\'m UniMind 👋
                      </p>
                      <p className="text-xs mt-1 max-w-xs">
                        Your private AI wellbeing companion. Start a conversation or pick a topic
                        above — I\'m here to help.
                      </p>
                    </div>
                  </div>
                )}

                {uniMindMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        msg.sender === 'ai'
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm'
                          : 'bg-blue-100 dark:bg-slate-700'
                      }`}
                    >
                      {msg.sender === 'ai' ? (
                        <Sparkles size={14} className="text-white" />
                      ) : (
                        <User size={14} className="text-blue-600 dark:text-slate-300" />
                      )}
                    </div>
                    {/* Bubble */}
                    <div
                      className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                      }`}
                    >
                      {msg.text.split('\n').map((line, i) => (
                        <p key={i} className={i > 0 ? 'mt-1' : ''}>
                          {line}
                        </p>
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
                        <span
                          className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={uniMindBottomRef} />
              </div>

              {/* Safety disclaimer */}
              <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl mb-3 text-amber-700 dark:text-amber-400">
                <AlertTriangle size={13} className="shrink-0" />
                <p className="text-[10px] font-semibold">
                  UniMind is an AI assistant, not a licensed therapist. For emergencies call{' '}
                  <strong>Tele-MANAS: 14416</strong> or visit the CUAP Health Centre.
                </p>
              </div>

              {/* Input bar */}
              <form onSubmit={handleUniMindChat} className="flex gap-3">
                <input
                  type="text"
                  value={uniMindInput}
                  onChange={(e) => setUniMindInput(e.target.value)}
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
        </div>
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm animate-fade-in-up">
          <div
            className={`p-4 rounded-xl border shadow-lg flex items-start gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900/50 dark:text-emerald-300'
                : 'bg-rose-50/95 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-900/50 dark:text-rose-350'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                toast.type === 'success'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                  : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
              }`}
            >
              {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed pr-6">{toast.message}</div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer select-none"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Notification Center panel */}
      <NotificationCenter
        isOpen={notifCenterOpen}
        onClose={() => setNotifCenterOpen(false)}
        onUpdateCount={setUnreadNotifications}
      />
    </div>
  );
}
