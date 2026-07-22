import React, { useState, useEffect } from 'react';
// SWCC Workspace Counselor Portal Component
import { api } from '@/lib/api';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  FileText,
  Send,
  Bell,
  Calendar as CalendarWidget,
  CheckCircle,
  Plus,
  Trash2,
  Download,
  Printer,
  User,
  MessageSquare,
  ShieldAlert,
  Brain,
  Stethoscope,
  Database,
  X,
  Activity,
  Menu,
  Search,
  AlertTriangle,
  Lock,
  Shield,
  HelpCircle,
  TrendingUp,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts';

import SOAPEditor from './SOAPEditor';
import ThemeToggle from './ui/ThemeToggle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSidebar } from '@/hooks/useSidebar';
import Sidebar from './ui/Sidebar';
import Breadcrumbs from './ui/Breadcrumbs';
import NotificationCenter from './ui/NotificationCenter';
import EnterpriseTable from './ui/EnterpriseTable';

interface ProviderProps {
  onLogout: () => void;
  providerProfile: any;
  user: any;
}

export default function DashboardProvider({ onLogout, providerProfile, user }: ProviderProps) {
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'students'
    | 'schedule'
    | 'counselling-emr'
    | 'prescription'
    | 'chat'
    | 'availability'
    | 'repository'
    | 'generated-reports'
    | 'notifications'
  >('dashboard');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeApp, setActiveApp] = useState<any>(null); // Active appointment for writing SOAP notes
  const [loading, setLoading] = useState(false);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const tabLabels: Record<string, string> = {
    dashboard: 'Workspace Dashboard',
    students: 'Assigned Students',
    schedule: "Today's Schedule",
    'counselling-emr': 'Session Notes',
    prescription: 'Prescription Desk',
    chat: 'Secure Messenger',
    availability: 'Schedule & Availability',
    repository: 'EMR Repository',
    'generated-reports': 'Generated Reports',
    notifications: 'Announcements',
  };

  const isMobile = useMediaQuery('(max-width: 1023px)');

  // Sidebar state hook
  const sidebar = useSidebar();
  const { sidebarCollapsed } = sidebar;

  // EMR Repository states
  const [repository, setRepository] = useState<any[]>([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [repoProvider, setRepoProvider] = useState('');
  const [repoDept, setRepoDept] = useState('');
  const [repoSeverity, setRepoSeverity] = useState('');
  const [repoDiagnosis, setRepoDiagnosis] = useState('');
  const [repoDate, setRepoDate] = useState('');
  const [selectedRepoSession, setSelectedRepoSession] = useState<any>(null);

  // Reschedule modal state
  const [rescheduleApp, setRescheduleApp] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<
    'all' | 'pending' | 'approved' | 'completed' | 'cancelled'
  >('all');

  // Prescription builder state
  const [presStudentId, setPresStudentId] = useState('');
  const [presDiagnosis, setPresDiagnosis] = useState('');
  const [presMeds, setPresMeds] = useState('');
  const [presAdvice, setPresAdvice] = useState('');
  const [presLifestyle, setPresLifestyle] = useState('');

  // Modals for new features
  const [showBookOnBehalf, setShowBookOnBehalf] = useState(false);
  const [showSpotReg, setShowSpotReg] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [bookingFormData, setBookingFormData] = useState<any>({});
  const [presFollowUp, setPresFollowUp] = useState('');
  const [presItems, setPresItems] = useState<any[]>([
    { medicineName: '', dose: '', frequency: '', duration: '' },
  ]);
  const [prescriptionList, setPrescriptionList] = useState<any[]>([]);

  // Notifications & Messages state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };
  const [messages, setMessages] = useState<any[]>([]);
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [chatContacts, setChatContacts] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  // Availability schedule states
  const [availabilityDays, setAvailabilityDays] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Assigned students search/filters
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDeptFilter, setStudentDeptFilter] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('');

  // Student Clinical Profile modal states
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<any>(null);
  const [studentEMRData, setStudentEMRData] = useState<any>(null);
  const [studentMSELogs, setStudentMSELogs] = useState<any[]>([]);
  const [studentCaseHistories, setStudentCaseHistories] = useState<any[]>([]);
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [profileTab, setProfileTab] = useState<
    'profile' | 'timeline' | 'clinical' | 'prescriptions' | 'assessments' | 'documents'
  >('profile');
  const [profileLoading, setProfileLoading] = useState(false);

  // Counselor Working settings
  const [sessionDuration, setSessionDuration] = useState(45);
  const [bufferTime, setBufferTime] = useState(15);
  const [maxAppointments, setMaxAppointments] = useState(8);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // 1-5 Mon-Fri
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchNotifications();
    fetchContacts();
    fetchAvailability();
    fetchAllStudents();
    fetchRepository();
    fetchScheduleSettings();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchRepository = async () => {
    try {
      const data = await api.clinical.getAllAssessments();
      setRepository(data);
    } catch (err) {
      console.error(err);
    }
  };

  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  const fetchGeneratedReports = async () => {
    try {
      const data = await api.clinical.getGeneratedReports();
      setGeneratedReports(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGeneratedReports();
  }, []);

  const fetchAllStudents = async () => {
    try {
      const data = await api.appointments.listAll();
      const uniqueMap = new Map();
      data.forEach((app: any) => {
        if (!uniqueMap.has(app.student_id)) {
          uniqueMap.set(app.student_id, {
            student_id: app.student_id,
            student_name: app.student_name,
            registration_number: app.registration_number,
            student_dept: app.student_dept,
            student_semester: app.student_semester,
            student_phone: app.student_phone,
            last_appointment_date: app.slot_date,
            status: app.status,
          });
        } else {
          const existing = uniqueMap.get(app.student_id);
          if (new Date(app.slot_date) > new Date(existing.last_appointment_date)) {
            existing.last_appointment_date = app.slot_date;
            existing.status = app.status;
          }
        }
      });
      setAllStudents(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenStudentProfile = async (student: any) => {
    setSelectedStudentForProfile(student);
    setProfileLoading(true);
    setProfileTab('profile');
    try {
      const emr = await api.clinical.getEMR(student.student_id);
      setStudentEMRData(emr);

      try {
        const mse = await api.clinical.getMSELogs(student.student_id);
        setStudentMSELogs(mse);
      } catch (err) {
        console.error('Failed to load MSE logs:', err);
        setStudentMSELogs([]);
      }

      try {
        const histories = await api.clinical.getCaseHistories(student.student_id);
        setStudentCaseHistories(histories);
      } catch (err) {
        console.error('Failed to load case histories:', err);
        setStudentCaseHistories([]);
      }

      try {
        const docs = await api.documents.list({ studentId: student.student_id });
        setStudentDocs(docs);
      } catch (err) {
        console.error('Failed to load documents:', err);
        setStudentDocs([]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load student EMR profile', 'error');
      setSelectedStudentForProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchScheduleSettings = async () => {
    if (!providerProfile) return;
    setSettingsLoading(true);
    try {
      const data = await api.appointments.getCounselorSettings(providerProfile.id);
      if (data && data.length > 0) {
        const s = data[0];
        setSessionDuration(s.session_duration || 45);
        setBufferTime(s.buffer_time || 15);
        setMaxAppointments(s.max_appointments_per_day || 8);
        setStartTime(s.start_time?.slice(0, 5) || '09:00');
        setEndTime(s.end_time?.slice(0, 5) || '17:00');
        setBreakStart(s.break_start?.slice(0, 5) || '13:00');
        setBreakEnd(s.break_end?.slice(0, 5) || '14:00');
        const activeDays = data.filter((x: any) => !x.is_holiday).map((x: any) => x.day_of_week);
        setWorkingDays(activeDays.length > 0 ? activeDays : [1, 2, 3, 4, 5]);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerProfile) return;
    setSettingsLoading(true);
    try {
      const days = [0, 1, 2, 3, 4, 5, 6].map((dayNum) => {
        const isWorking = workingDays.includes(dayNum);
        return {
          dayOfWeek: dayNum,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
          breakStart: `${breakStart}:00`,
          breakEnd: `${breakEnd}:00`,
          isHoliday: !isWorking,
        };
      });

      await api.appointments.updateCounselorSettings({
        providerId: providerProfile.id,
        sessionDuration,
        bufferTime,
        maxAppointments,
        workingDays: days,
      });

      showToast('Schedule settings saved successfully!', 'success');
      fetchAvailability();
    } catch (err: any) {
      showToast(err.message || 'Failed to update schedule settings', 'error');
    } finally {
      setSettingsLoading(false);
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
      const res = await api.appointments.getAvailableSlots(
        providerProfile.id,
        new Date().toISOString().split('T')[0],
      );
      // Mock days array since availability created during registration
      setAvailabilityDays([
        { day: 'Monday', hours: '09:00 - 17:00', break: '13:00 - 14:00' },
        { day: 'Tuesday', hours: '09:00 - 17:00', break: '13:00 - 14:00' },
        { day: 'Wednesday', hours: '09:00 - 17:00', break: '13:00 - 14:00' },
        { day: 'Thursday', hours: '09:00 - 17:00', break: '13:00 - 14:00' },
        { day: 'Friday', hours: '09:00 - 17:00', break: '13:00 - 14:00' },
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
        content: replyText,
      });
      setReplyText('');
      loadChatHistory(activeContactId);
    } catch (err) {
      showToast('Failed to send message', 'error');
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
      showToast('Please provide Student Profile ID and Diagnosis', 'error');
      return;
    }

    try {
      const res = await api.clinical.createPrescription({
        studentId: parseInt(presStudentId),
        diagnosis: presDiagnosis,
        advice: presAdvice,
        lifestyleRecommendations: presLifestyle,
        followUpDate: presFollowUp || null,
        items: presItems,
      });

      showToast('Prescription generated successfully!', 'success');
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
      showToast(err.message || 'Failed to create prescription', 'error');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Backdrop overlay for mobile drawer */}
      {!sidebarCollapsed && isMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-45 transition-opacity duration-300"
          onClick={() => sidebar.toggleCollapse()}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        navItems={[
          { id: 'dashboard', label: 'Workspace Dashboard', icon: Activity },
          { id: 'students', label: 'Assigned Students', icon: Users },
          { id: 'schedule', label: "Today's Schedule", icon: Clock },
          { id: 'counselling-emr', label: 'Session Notes', icon: Brain },
          { id: 'repository', label: 'EMR Repository', icon: Database },
          { id: 'generated-reports', label: 'Generated Reports', icon: FileText },
          { id: 'prescription', label: 'Prescription Desk', icon: Printer },
          { id: 'chat', label: 'Secure Messenger', icon: MessageSquare },
          { id: 'availability', label: 'Schedule & Availability', icon: CalendarIcon },
          { id: 'notifications', label: 'Announcements', icon: Bell },
        ]}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        userName={providerProfile?.name || user?.username || 'Counselor'}
        userRoleLabel="Counselor Portal"
        userSubLabel={providerProfile?.specialization || 'Clinical Psychologist'}
        {...sidebar}
      />

      {/* Main Workspace content */}
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
              Counselor Workspace · {activeTab.toUpperCase()}
            </h1>
          </div>

          <div className="flex items-center gap-4 mr-2 lg:mr-4">
            <div className="text-right hidden sm:block mr-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                {providerProfile?.name || user?.username}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {providerProfile?.specialization || 'Clinical Psychologist'}
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
            portalName="Counselor Portal"
            activeTabLabel={tabLabels[activeTab] || activeTab}
          />
          {/* TAB 0: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' &&
            (() => {
              const totalStudentsCount = allStudents.length;
              const todayStr = new Date().toISOString().split('T')[0];
              const todayAppts = appointments.filter((a) => a.slot_date === todayStr);
              const upcomingAppts = appointments.filter(
                (a) => new Date(a.slot_date) > new Date() && a.status === 'approved',
              );
              const pendingRequests = appointments.filter((a) => a.status === 'pending');
              const completedSessions = appointments.filter((a) => a.status === 'completed');
              const cancelledSessions = appointments.filter(
                (a) => a.status === 'cancelled' || a.status === 'rejected',
              );
              const activeCasesCount = allStudents.filter(
                (s) => s.status !== 'completed' && s.status !== 'cancelled',
              ).length;

              const urgentAppts = appointments.filter(
                (a) =>
                  a.chief_complaint &&
                  (a.chief_complaint.toLowerCase().includes('urgent') ||
                    a.chief_complaint.toLowerCase().includes('suicidal') ||
                    a.chief_complaint.toLowerCase().includes('crisis') ||
                    a.chief_complaint.toLowerCase().includes('severe') ||
                    a.chief_complaint.toLowerCase().includes('emergency')),
              );

              // Compute daily average workload
              const uniqueDates = Array.from(new Set(appointments.map((a) => a.slot_date)));
              const avgWorkload =
                uniqueDates.length > 0
                  ? (appointments.length / uniqueDates.length).toFixed(1)
                  : '0';

              // Weekly workload chart data
              const daysOfWeek = [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
              ];
              const workloadChartData = daysOfWeek.map((dayName, idx) => {
                const dayAppts = appointments.filter((a) => new Date(a.slot_date).getDay() === idx);
                return {
                  name: dayName.slice(0, 3),
                  Completed: dayAppts.filter((a) => a.status === 'completed').length,
                  Scheduled: dayAppts.filter(
                    (a) => a.status === 'approved' || a.status === 'pending',
                  ).length,
                };
              });
              // Mon-Sun rotation
              const sortedChartData = [...workloadChartData.slice(1), workloadChartData[0]];

              return (
                <div className="space-y-8 animate-fade-in-up">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">Workspace Overview</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Welcome back, Counselor. Manage your clinical dashboard, workloads, and
                        client assignments.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        onClick={() => setShowBookOnBehalf(true)}
                        className="px-3 py-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={14} /> Book on Behalf
                      </button>
                      <button
                        onClick={() => setShowSpotReg(true)}
                        className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer"
                      >
                        <User size={14} /> Spot Registration
                      </button>
                      <button
                        onClick={() => setShowEmergency(true)}
                        className="px-3 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900 transition flex items-center gap-1 cursor-pointer"
                      >
                        <AlertTriangle size={14} /> Emergency Case
                      </button>
                    </div>
                  </div>

                  {/* Stat cards grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-xl flex items-center justify-center text-lg shrink-0">
                        👥
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">
                          Total Patients
                        </span>
                        <span className="text-2xl font-extrabold">{totalStudentsCount}</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl flex items-center justify-center text-lg shrink-0">
                        📅
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">
                          Today's Sessions
                        </span>
                        <span className="text-2xl font-extrabold">{todayAppts.length}</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl flex items-center justify-center text-lg shrink-0">
                        ✓
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Completed</span>
                        <span className="text-2xl font-extrabold">{completedSessions.length}</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl flex items-center justify-center text-lg shrink-0">
                        ⚠️
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Urgent Cases</span>
                        <span className="text-2xl font-extrabold text-red-600">
                          {urgentAppts.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Weekly workload chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-500" /> Weekly Session Metrics
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sortedChartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="var(--border)"
                            />
                            <XAxis
                              dataKey="name"
                              stroke="var(--text-secondary)"
                              fontSize={11}
                              tickLine={false}
                            />
                            <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                            <ChartTooltip />
                            <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Scheduled" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Sidebar lists inside Dashboard: Urgent Cases / Highlights */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-4 flex items-center gap-2">
                          🚨 Urgent Priority Cases
                        </h3>
                        {urgentAppts.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-xs">
                            No active priority crisis flags on record.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                            {urgentAppts.map((a, idx) => (
                              <div
                                key={idx}
                                className="p-3 border border-red-100 dark:border-red-950/30 bg-red-50/30 dark:bg-red-950/10 rounded-xl flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-bold text-xs block text-slate-800 dark:text-white">
                                    {a.student_name}
                                  </span>
                                  <span className="text-[10px] text-red-500 font-bold block truncate max-w-[160px]">
                                    {a.chief_complaint}
                                  </span>
                                </div>
                                <button
                                  onClick={() =>
                                    handleOpenStudentProfile({
                                      student_id: a.student_id,
                                      student_name: a.student_name,
                                      registration_number: a.registration_number,
                                    })
                                  }
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition shrink-0 cursor-pointer"
                                >
                                  View
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>Daily Average Load</span>
                          <span className="text-slate-800 dark:text-white">
                            {avgWorkload} appts/day
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mt-2">
                          <span>Active Cases</span>
                          <span className="text-slate-800 dark:text-white">
                            {activeCasesCount} students
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* TAB 0.5: ASSIGNED PATIENTS LIST */}
          {activeTab === 'students' && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Assigned Student Profiles</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Access and manage clinical histories, assessment trends, SOAP timelines, and
                  documentation logs.
                </p>
              </div>
              {/* Filter controls */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-3 w-full md:w-auto">
                  <select
                    value={studentDeptFilter}
                    onChange={(e) => setStudentDeptFilter(e.target.value)}
                    className="flex-1 md:w-44 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Biotechnology">Biotechnology</option>
                    <option value="Business Administration">Business Administration</option>
                    <option value="Applied Psychology">Applied Psychology</option>
                    <option value="English (UG)">English (UG)</option>
                    <option value="Science & Physics">Science & Physics</option>
                  </select>

                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value)}
                    className="flex-1 md:w-40 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending Approval</option>
                  </select>
                </div>
              </div>

              {/* Data Table via EnterpriseTable */}
              {(() => {
                const studentColumns = [
                  {
                    key: 'student_name',
                    header: 'Student Details',
                    render: (s: any) => (
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{s.student_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {s.registration_number.toUpperCase()}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'student_dept',
                    header: 'Department',
                    render: (s: any) => s.student_dept || 'General',
                  },
                  {
                    key: 'student_semester',
                    header: 'Semester',
                    render: (s: any) => s.student_semester || 'N/A',
                  },
                  {
                    key: 'last_appointment_date',
                    header: 'Last Session',
                    render: (s: any) =>
                      s.last_appointment_date
                        ? new Date(s.last_appointment_date).toLocaleDateString()
                        : 'N/A',
                  },
                  {
                    key: 'status',
                    header: 'Latest Status',
                    render: (s: any) => (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300'
                            : s.status === 'approved'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-300'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    sortable: false,
                    render: (s: any) => (
                      <button
                        onClick={() => handleOpenStudentProfile(s)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-xl transition cursor-pointer"
                      >
                        View Clinical File
                      </button>
                    ),
                  },
                ];

                const filteredStudents = allStudents.filter((s) => {
                  const matchesDept = !studentDeptFilter || s.student_dept === studentDeptFilter;
                  const matchesStatus = !studentStatusFilter || s.status === studentStatusFilter;
                  return matchesDept && matchesStatus;
                });

                return (
                  <EnterpriseTable
                    data={filteredStudents}
                    columns={studentColumns}
                    rowKey={(s: any) => s.student_id}
                    placeholder="No assigned students found matching filters."
                    searchPlaceholder="Search by Name or Reg Number..."
                  />
                );
              })()}
            </div>
          )}

          {/* TAB 1: SCHEDULE – full appointment management */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Appointment Management</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    View, approve, reject and reschedule patient bookings
                  </p>
                </div>
                {/* Status filter */}
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'pending', 'approved', 'completed', 'cancelled'] as const).map((f) => (
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
                {appointments.filter((a) => scheduleFilter === 'all' || a.status === scheduleFilter)
                  .length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <CalendarIcon size={48} className="mx-auto text-slate-300 mb-3" />
                    No {scheduleFilter === 'all' ? '' : scheduleFilter} appointments.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {appointments
                      .filter((a) => scheduleFilter === 'all' || a.status === scheduleFilter)
                      .map((a, idx) => (
                        <div
                          key={idx}
                          className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {a.student_name}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                ({(a.registration_number || '').toUpperCase()})
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              <strong>Date:</strong> {a.slot_date} &nbsp;|&nbsp;
                              <strong>Time:</strong> {a.slot_time} &nbsp;|&nbsp;
                              <strong>Dept:</strong> {a.student_dept || '—'}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              <strong>Reason:</strong> {a.reason}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 items-center shrink-0">
                            {/* Status badge */}
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                a.status === 'approved'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                  : a.status === 'completed'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                                    : a.status === 'pending'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                      : a.status === 'waiting'
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {a.status}
                            </span>

                            {/* Approve (only when pending) */}
                            {a.status === 'pending' && (
                              <button
                                disabled={actionLoading}
                                onClick={async () => {
                                  setActionLoading(true);
                                  try {
                                    await api.appointments.updateStatus(a.id, {
                                      status: 'approved',
                                    });
                                    fetchAppointments();
                                  } finally {
                                    setActionLoading(false);
                                  }
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
                                    await api.appointments.updateStatus(a.id, {
                                      status: 'cancelled',
                                    });
                                    fetchAppointments();
                                  } finally {
                                    setActionLoading(false);
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition cursor-pointer disabled:opacity-50"
                              >
                                ✕ Cancel
                              </button>
                            )}

                            {/* Reschedule (pending or approved) */}
                            {(a.status === 'pending' || a.status === 'approved') && (
                              <button
                                onClick={() => {
                                  setRescheduleApp(a);
                                  setRescheduleDate(a.slot_date);
                                  setRescheduleTime(a.slot_time);
                                }}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                              >
                                ↻ Reschedule
                              </button>
                            )}

                            {/* Open SOAP editor (approved) */}
                            {a.status === 'approved' && (
                              <button
                                onClick={() => {
                                  setActiveApp(a);
                                  setActiveTab('counselling-emr');
                                }}
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
                    <p className="text-xs text-slate-500 mb-5">
                      Patient: <strong>{rescheduleApp.student_name}</strong>
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                          New Date
                        </label>
                        <input
                          type="date"
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                          New Time Slot
                        </label>
                        <input
                          type="time"
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
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
                              timeSlot: rescheduleTime,
                            });
                            setRescheduleApp(null);
                            fetchAppointments();
                          } finally {
                            setActionLoading(false);
                          }
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

          {/* TAB 2: COUNSELLING EMR */}
          {activeTab === 'counselling-emr' && (
            <div className="space-y-8 animate-fade-in-up">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">
                    Counselling EMR & Session Notes
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeApp
                      ? `Writing notes for: ${activeApp.student_name} (${activeApp.registration_number.toUpperCase()})`
                      : "Select an approved appointment from Today's Schedule or choose from student directory to write counselling notes."}
                  </p>
                </div>
                {activeApp && (
                  <button
                    onClick={() => setActiveApp(null)}
                    className="px-3 py-1.5 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {activeApp ? (
                <SOAPEditor
                  studentId={activeApp.student_id}
                  appointmentId={activeApp.id}
                  forcedMode="counselor"
                  onSaved={() => {
                    fetchAppointments();
                    fetchRepository();
                    setActiveApp(null);
                    setActiveTab('schedule');
                  }}
                />
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-12 text-center rounded-2xl shadow-sm text-slate-400 space-y-4">
                  <Brain size={48} className="mx-auto text-slate-300 mb-1" />
                  <p className="text-sm">
                    Please select a student from the Schedule tab or select from the directory to
                    open the Counselling EMR.
                  </p>
                  {allStudents.length > 0 && (
                    <div className="max-w-md mx-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                        Or open EMR directly for an existing student:
                      </label>
                      <select
                        onChange={(e) => {
                          const studentId = parseInt(e.target.value);
                          if (studentId) {
                            const selected = allStudents.find((s) => s.student_id === studentId);
                            if (selected) {
                              setActiveApp({
                                id: selected.id,
                                student_id: selected.student_id,
                                student_name: selected.student_name,
                                registration_number: selected.registration_number,
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

          {/* TAB: GENERATED REPORTS */}
          {activeTab === 'generated-reports' && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight font-sans">Generated Reports</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage visibility of clinical reports, sessions, and prescriptions for students.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-4 font-bold border-b border-slate-100 dark:border-slate-800">
                        Date
                      </th>
                      <th className="px-5 py-4 font-bold border-b border-slate-100 dark:border-slate-800">
                        Student
                      </th>
                      <th className="px-5 py-4 font-bold border-b border-slate-100 dark:border-slate-800">
                        Type
                      </th>
                      <th className="px-5 py-4 font-bold border-b border-slate-100 dark:border-slate-800">
                        Report/Desc
                      </th>
                      <th className="px-5 py-4 font-bold border-b border-slate-100 dark:border-slate-800">
                        Counselor
                      </th>
                      <th className="px-5 py-4 font-bold border-b border-slate-100 dark:border-slate-800">
                        Visibility
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {generatedReports.map((report: any, idx: number) => (
                      <tr
                        key={`${report.type}-${report.id}-${idx}`}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition group"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(report.generated_date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800 dark:text-white">
                            {report.student_name}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            {report.student_id}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              report.type === 'prescription'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : report.type === 'session'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {report.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400">
                          {report.report_type}
                        </td>
                        <td className="px-5 py-4 font-semibold">Dr. {report.counselor_name}</td>
                        <td className="px-5 py-4">
                          <label className="flex items-center gap-2 cursor-pointer group/toggle">
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={!!report.is_released}
                                onChange={async (e) => {
                                  const newVal = e.target.checked;
                                  try {
                                    await api.clinical.toggleReportVisibility(
                                      report.type,
                                      report.id,
                                      newVal,
                                    );
                                    fetchGeneratedReports(); // Refresh
                                    showToast(
                                      `Report visibility updated successfully to: ${newVal ? 'Released' : 'Hidden'}.`,
                                      'success',
                                    );
                                  } catch (err) {
                                    showToast('Failed to update visibility', 'error');
                                  }
                                }}
                              />
                              <div
                                className={`block w-10 h-6 rounded-full transition ${report.is_released ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                              ></div>
                              <div
                                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${report.is_released ? 'translate-x-4' : ''}`}
                              ></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide group-hover/toggle:text-slate-700">
                              {report.is_released ? 'Released' : 'Hidden'}
                            </span>
                          </label>
                        </td>
                      </tr>
                    ))}
                    {generatedReports.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-slate-400 font-medium"
                        >
                          No reports generated yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PRESCRIPTION MODULE */}
          {activeTab === 'prescription' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Prescription Board</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Issue official prescriptions with branding, lifestyle advice, and digital
                  signature
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm">
                <form onSubmit={handleCreatePrescription} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                        Student DB ID / Patient ID
                      </label>
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
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                        Clinical Diagnosis
                      </label>
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
                      <label className="block text-xs font-bold text-slate-500 uppercase">
                        Prescribed Medicines
                      </label>
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
                        <div
                          key={idx}
                          className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900"
                        >
                          <input
                            type="text"
                            required
                            placeholder="Medicine name"
                            value={item.medicineName}
                            onChange={(e) =>
                              handlePresItemChange(idx, 'medicineName', e.target.value)
                            }
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
                              onChange={(e) =>
                                handlePresItemChange(idx, 'duration', e.target.value)
                              }
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
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                        General Advice / Instructions
                      </label>
                      <textarea
                        value={presAdvice}
                        onChange={(e) => setPresAdvice(e.target.value)}
                        placeholder="Take after meals, avoid alcohol..."
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                        Lifestyle Recommendations
                      </label>
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
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                      Follow-up Date
                    </label>
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
                <p className="text-xs text-slate-500 mt-1">
                  End-to-end encrypted medical messaging with clients and admins
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden h-[600px]">
                {/* Contact list side */}
                <div className="border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Contacts
                  </h3>
                  <div className="space-y-2">
                    {chatContacts.map((c) => (
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
                          {c.display_name || c.username}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {c.role}
                        </span>
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
                          <div className="py-24 text-center text-slate-400 text-sm">
                            No message records. Write a greeting to start chatting.
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

                      {/* Sender text box */}
                      <form
                        onSubmit={handleSendChat}
                        className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2"
                      >
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
                <h2 className="text-2xl font-black tracking-tight">
                  Counselor Schedule & Availability
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Configure session slots, buffer times, working hours, break periods, and active
                  counseling days.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm">
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Settings Groups */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Durations Group */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-850 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                        ⏱️ Session Slot Durations
                      </h3>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                          Session Duration (minutes)
                        </label>
                        <input
                          type="number"
                          min={15}
                          max={120}
                          value={sessionDuration}
                          onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                          Slot Buffer Time (minutes)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={bufferTime}
                          onChange={(e) => setBufferTime(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                          Max Daily Appointments
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={maxAppointments}
                          onChange={(e) => setMaxAppointments(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-bold"
                          required
                        />
                      </div>
                    </div>

                    {/* Hours Group */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-855 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                        ⏰ Working Hours & Breaks
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                            Work Shift Start
                          </label>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                            Work Shift End
                          </label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-bold"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                            Break Lunch Start
                          </label>
                          <input
                            type="time"
                            value={breakStart}
                            onChange={(e) => setBreakStart(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                            Break Lunch End
                          </label>
                          <input
                            type="time"
                            value={breakEnd}
                            onChange={(e) => setBreakEnd(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950 font-bold"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Days Selector */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-850 dark:text-white">
                      📆 Active Counseling Days
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Sunday', value: 0 },
                        { label: 'Monday', value: 1 },
                        { label: 'Tuesday', value: 2 },
                        { label: 'Wednesday', value: 3 },
                        { label: 'Thursday', value: 4 },
                        { label: 'Friday', value: 5 },
                        { label: 'Saturday', value: 6 },
                      ].map((d) => {
                        const active = workingDays.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => {
                              if (active) {
                                setWorkingDays(workingDays.filter((w) => w !== d.value));
                              } else {
                                setWorkingDays([...workingDays, d.value].sort());
                              }
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              active
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-905'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Apply settings submit */}
                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="submit"
                      disabled={settingsLoading || workingDays.length === 0}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                    >
                      {settingsLoading ? 'Saving...' : 'Apply Schedule Updates'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB: EMR REPOSITORY */}
          {activeTab === 'repository' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Assessment Data Repository</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Search, filter, and audit all historical patient clinical records
                </p>
              </div>

              {/* Filter Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Search Patient
                  </label>
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Name or Reg No"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Clinician
                  </label>
                  <input
                    type="text"
                    value={repoProvider}
                    onChange={(e) => setRepoProvider(e.target.value)}
                    placeholder="Counselor Name"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Department
                  </label>
                  <select
                    value={repoDept}
                    onChange={(e) => setRepoDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-200"
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
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Severity
                  </label>
                  <select
                    value={repoSeverity}
                    onChange={(e) => setRepoSeverity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="">All Severity</option>
                    <option value="low">Mild</option>
                    <option value="medium">Moderate</option>
                    <option value="high">Severe</option>
                    <option value="severe">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Diagnosis
                  </label>
                  <input
                    type="text"
                    value={repoDiagnosis}
                    onChange={(e) => setRepoDiagnosis(e.target.value)}
                    placeholder="Search Diagnosis"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Date
                  </label>
                  <input
                    type="date"
                    value={repoDate}
                    onChange={(e) => setRepoDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Results Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                            item.registration_number
                              .toLowerCase()
                              .includes(repoSearch.toLowerCase());

                          const matchesProvider =
                            repoProvider === '' ||
                            item.provider_name.toLowerCase().includes(repoProvider.toLowerCase());

                          const matchesDept = repoDept === '' || item.student_dept === repoDept;

                          const matchesSeverity =
                            repoSeverity === '' ||
                            (item.risk_level || 'low').toLowerCase() === repoSeverity.toLowerCase();

                          const matchesDiag =
                            repoDiagnosis === '' ||
                            (item.diagnosis || '')
                              .toLowerCase()
                              .includes(repoDiagnosis.toLowerCase());

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
                                No clinical assessment records found matching current filter
                                criteria.
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
                            badgeColor =
                              'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400';
                            label = 'Severe';
                          } else if (risk === 'severe') {
                            badgeColor =
                              'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
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
                              <td className="py-4 px-6 text-slate-600 dark:text-slate-300">
                                {item.provider_name}
                              </td>
                              <td className="py-4 px-6 text-slate-500">{item.student_dept}</td>
                              <td className="py-4 px-6 italic text-slate-600 dark:text-slate-300">
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

              {/* Details Modal */}
              {selectedRepoSession && (
                <div className="fixed inset-0 bg-black/60 backdrop-filter blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl animate-fade-in-up">
                    {/* Modal Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-lg text-slate-800 dark:text-white">
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
                          <p className="text-sm font-black mt-1">
                            {selectedRepoSession.student_name}
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {selectedRepoSession.registration_number.toUpperCase()} ·{' '}
                            {selectedRepoSession.student_dept}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Clinical Counselor
                          </p>
                          <p className="text-sm font-black mt-1">
                            {selectedRepoSession.provider_name}
                          </p>
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
            </div>
          )}

          {/* TAB: SYSTEM ANNOUNCEMENTS */}
          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">University Announcements</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Global wellness broadcast notices published by administration
                </p>
              </div>

              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-8 rounded-2xl text-center text-slate-400 text-sm">
                    No active announcements found.
                  </div>
                ) : (
                  notifications.map((ann) => (
                    <div
                      key={ann.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex items-start gap-4 relative overflow-hidden"
                    >
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Bell size={18} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                            By Administrator
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ann.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed pt-1">
                          {ann.message.replace(/^CUAP Announcement:\s*/, '')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STUDENT CLINICAL PROFILE DETAIL MODAL */}
          {selectedStudentForProfile && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-xl shrink-0 font-bold font-mono">
                      {selectedStudentForProfile.student_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2">
                        {selectedStudentForProfile.student_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Reg No: {selectedStudentForProfile.registration_number.toUpperCase()} ·{' '}
                        {selectedStudentForProfile.student_dept || 'General'} · Sem{' '}
                        {selectedStudentForProfile.student_semester || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudentForProfile(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-250 dark:hover:bg-slate-750 transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Sub Tab Bar selector */}
                <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex gap-1 overflow-x-auto shrink-0 bg-white dark:bg-slate-900 scrollbar-none py-2">
                  {[
                    { id: 'profile', label: 'Student Bio & Contact' },
                    { id: 'timeline', label: 'Sessions SOAP Timeline' },
                    { id: 'clinical', label: 'MSE & Clinical Cases' },
                    { id: 'prescriptions', label: 'Prescriptions logs' },
                    { id: 'assessments', label: 'Self Screening Logs' },
                    { id: 'documents', label: 'Document Files' },
                  ].map((tb) => (
                    <button
                      key={tb.id}
                      onClick={() => setProfileTab(tb.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                        profileTab === tb.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>

                {/* Modal Contents Body scrollable */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50 dark:bg-slate-900/10">
                  {profileLoading ? (
                    <div className="py-24 text-center text-slate-400">
                      Loading client medical records...
                    </div>
                  ) : (
                    <>
                      {/* TAB: PROFILE */}
                      {profileTab === 'profile' &&
                        studentEMRData &&
                        (() => {
                          const s = studentEMRData.student || {};
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Contact Box */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                  Contact Details
                                </h4>
                                <div className="space-y-2 text-xs">
                                  <div>
                                    <span className="text-slate-400 block">Email Address</span>
                                    <span className="font-bold text-slate-800 dark:text-white">
                                      {s.email || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Phone Number</span>
                                    <span className="font-bold text-slate-800 dark:text-white">
                                      {s.phone || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Date of Birth</span>
                                    <span className="font-bold text-slate-800 dark:text-white">
                                      {s.dob ? new Date(s.dob).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Blood Group</span>
                                    <span className="font-bold text-slate-800 dark:text-white">
                                      {s.blood_group || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Academic Box */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                  Academic & Emergency
                                </h4>
                                <div className="space-y-2 text-xs">
                                  <div>
                                    <span className="text-slate-400 block">
                                      Hostel / Scholar Status
                                    </span>
                                    <span className="font-bold text-slate-800 dark:text-white capitalize">
                                      {s.hostel_scholar || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">
                                      Emergency Contact Name
                                    </span>
                                    <span className="font-bold text-slate-800 dark:text-white">
                                      {s.emergency_contact || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">
                                      Emergency Phone Number
                                    </span>
                                    <span className="font-bold text-slate-800 dark:text-white">
                                      {s.emergency_phone || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">
                                      Consent Signed Status
                                    </span>
                                    <span
                                      className={`inline-flex items-center gap-1.5 font-bold ${s.informed_consent_signed ? 'text-emerald-500' : 'text-amber-500'}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${s.informed_consent_signed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                      />
                                      {s.informed_consent_signed
                                        ? 'Consent Signed'
                                        : 'Pending Consent'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                      {/* TAB: TIMELINE */}
                      {profileTab === 'timeline' && studentEMRData && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                            Clinical SOAP Notes Log
                          </h4>
                          {studentEMRData.sessions.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl">
                              No counseling SOAP sessions found for this student.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {studentEMRData.sessions.map((s: any) => {
                                const rk = (s.risk_level || 'low').toLowerCase();
                                return (
                                  <div
                                    key={s.id}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-3"
                                  >
                                    <div className="flex justify-between items-start flex-wrap gap-2">
                                      <div>
                                        <span className="font-bold text-xs text-slate-800 dark:text-white block">
                                          Dr. {s.provider_name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono block">
                                          {new Date(s.session_date).toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                          rk === 'high' || rk === 'severe'
                                            ? 'bg-red-50 text-red-600 dark:bg-red-950/20'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                        }`}
                                      >
                                        Risk: {rk}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                                      <div>
                                        <span className="font-bold text-slate-400 block uppercase text-[9px]">
                                          Subjective findings
                                        </span>
                                        <p className="mt-1 text-slate-700 dark:text-slate-350">
                                          {s.subjective}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block uppercase text-[9px]">
                                          Objective findings
                                        </span>
                                        <p className="mt-1 text-slate-700 dark:text-slate-350">
                                          {s.objective}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block uppercase text-[9px]">
                                          Working Diagnosis
                                        </span>
                                        <p className="mt-1 font-bold italic">
                                          {s.diagnosis || 'None'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block uppercase text-[9px]">
                                          Treatment Plan
                                        </span>
                                        <p className="mt-1 text-slate-700 dark:text-slate-350">
                                          {s.plan}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB: CLINICAL RECORDS (MSE / CASE HISTORY) */}
                      {profileTab === 'clinical' && (
                        <div className="space-y-6">
                          {/* Case History */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                              Clinical Case Histories
                            </h4>
                            {studentCaseHistories.length === 0 ? (
                              <div className="p-4 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl">
                                No case histories recorded.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {studentCaseHistories.map((h: any) => (
                                  <div
                                    key={h.id}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm text-xs"
                                  >
                                    <div className="flex justify-between font-mono text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                                      <span>
                                        Date: {new Date(h.created_at).toLocaleDateString()}
                                      </span>
                                      <span>Clinician: {h.provider_name || 'Assigned'}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                          Presenting Problem
                                        </span>
                                        <p className="mt-0.5 font-bold">
                                          {h.presenting_problem || 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                          Duration
                                        </span>
                                        <p className="mt-0.5 font-bold">
                                          {h.problem_duration || 'N/A'}
                                        </p>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                          Additional Notes
                                        </span>
                                        <p className="mt-0.5 text-slate-600 dark:text-slate-350">
                                          {h.additional_notes || 'None'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* MSE */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                              Mental Status Examinations (MSE)
                            </h4>
                            {studentMSELogs.length === 0 ? (
                              <div className="p-4 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl">
                                No MSE logs recorded.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {studentMSELogs.map((m: any) => (
                                  <div
                                    key={m.id}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm text-xs"
                                  >
                                    <div className="flex justify-between font-mono text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                                      <span>
                                        Date: {new Date(m.created_at).toLocaleDateString()}
                                      </span>
                                      <span>Clinician: {m.provider_name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      <div>
                                        <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                          Appearance
                                        </span>
                                        <span>{m.appearance || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                          Behavior
                                        </span>
                                        <span>{m.behavior || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                          Speech
                                        </span>
                                        <span>{m.speech || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                          Mood
                                        </span>
                                        <span>{m.mood || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                          Affect
                                        </span>
                                        <span>{m.affect || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                          Thought Content
                                        </span>
                                        <span>{m.thought_content || 'N/A'}</span>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                          Diagnosis / Impression
                                        </span>
                                        <span className="font-bold italic">
                                          {m.clinical_impression || 'N/A'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* TAB: PRESCRIPTIONS */}
                      {profileTab === 'prescriptions' && studentEMRData && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                            Prescriptions Issued
                          </h4>
                          {studentEMRData.prescriptions.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl">
                              No prescription logs on record.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {studentEMRData.prescriptions.map((p: any) => (
                                <div
                                  key={p.id}
                                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm text-xs"
                                >
                                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                                    <div>
                                      <span className="font-bold text-slate-800 dark:text-white block">
                                        Dr. {p.provider_name}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {new Date(p.prescription_date).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        window.open(api.clinical.getPrintUrl(p.id), '_blank')
                                      }
                                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                    >
                                      Print Rx PDF
                                    </button>
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-400 block text-[9px] uppercase">
                                      Diagnosis
                                    </span>
                                    <p className="font-bold italic">{p.diagnosis}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB: ASSESSMENTS */}
                      {profileTab === 'assessments' && studentEMRData && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                            Self Screening Assessments
                          </h4>
                          {studentEMRData.assessments.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl">
                              No assessments completed by student.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {studentEMRData.assessments.map((a: any) => {
                                const scoresObj = a.scores || {};
                                return (
                                  <div
                                    key={a.id}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm text-xs"
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="font-bold text-slate-800 dark:text-white block capitalize">
                                        {a.type} Screen
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {new Date(a.assessment_date).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-between">
                                      <div>
                                        <span className="text-[10px] text-slate-400 block">
                                          Total Score
                                        </span>
                                        <span className="font-extrabold text-sm text-blue-600 dark:text-blue-400">
                                          {scoresObj.totalScore || 0}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-slate-400 block">
                                          Clinical Severity
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-slate-250 capitalize">
                                          {scoresObj.severity || 'Mild'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB: DOCUMENTS */}
                      {profileTab === 'documents' && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                            Active Uploaded Documents
                          </h4>
                          {studentDocs.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl">
                              No documents uploaded by client.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {studentDocs.map((d: any) => (
                                <div
                                  key={d.id}
                                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm text-xs flex justify-between items-center"
                                >
                                  <div>
                                    <p className="font-bold text-slate-800 dark:text-white">
                                      {d.file_name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                                      Category: {d.category} ·{' '}
                                      {new Date(d.uploaded_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <a
                                    href={api.documents.downloadUrl(d.id)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer"
                                  >
                                    <Download size={14} />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 flex justify-end shrink-0">
                  <button
                    onClick={() => setSelectedStudentForProfile(null)}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Close Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BOOK ON BEHALF MODAL */}
          {showBookOnBehalf && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setShowBookOnBehalf(false)}
              />
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
                  <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                    <Plus size={16} /> Book on Behalf
                  </h3>
                  <button
                    onClick={() => setShowBookOnBehalf(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                  <p className="text-xs text-slate-500">
                    Schedule an appointment for a student by selecting an existing student or typing
                    their details manually.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Quick Select Student (Optional)
                    </label>
                    <select
                      className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                      value={bookingFormData.student_id || ''}
                      onChange={(e) => {
                        const sid = e.target.value;
                        const s = allStudents.find((st) => String(st.student_id) === sid);
                        if (s) {
                          setBookingFormData({
                            ...bookingFormData,
                            student_id: s.student_id,
                            student_name: s.student_name,
                            registration_number: s.registration_number,
                          });
                        } else {
                          setBookingFormData({ ...bookingFormData, student_id: '' });
                        }
                      }}
                    >
                      <option value="">-- Select Existing Student --</option>
                      {allStudents.map((s) => (
                        <option key={s.student_id} value={s.student_id}>
                          {s.student_name} ({s.registration_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                        Student Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SAKE NARESH"
                        required
                        value={bookingFormData.student_name || ''}
                        className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                        onChange={(e) =>
                          setBookingFormData({ ...bookingFormData, student_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                        Registration No / Roll No *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 23MTL04"
                        required
                        value={bookingFormData.registration_number || ''}
                        className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                        onChange={(e) =>
                          setBookingFormData({
                            ...bookingFormData,
                            registration_number: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                        Appointment Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={bookingFormData.slot_date || ''}
                        className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                        onChange={(e) =>
                          setBookingFormData({ ...bookingFormData, slot_date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                        Time Slot *
                      </label>
                      <input
                        type="time"
                        required
                        value={bookingFormData.slot_time || ''}
                        className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                        onChange={(e) =>
                          setBookingFormData({ ...bookingFormData, slot_time: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Reason / Chief Complaint
                    </label>
                    <textarea
                      placeholder="Enter chief complaint or reason..."
                      value={bookingFormData.chief_complaint || ''}
                      className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 h-20 text-sm font-medium"
                      onChange={(e) =>
                        setBookingFormData({
                          ...bookingFormData,
                          chief_complaint: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-950">
                  <button
                    onClick={() => setShowBookOnBehalf(false)}
                    className="px-4 py-2 font-bold text-xs bg-slate-200 rounded-xl hover:bg-slate-300 text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        !bookingFormData.student_name &&
                        !bookingFormData.registration_number &&
                        !bookingFormData.student_id
                      ) {
                        showToast(
                          'Please select a student or enter Student Name & Registration No',
                          'error',
                        );
                        return;
                      }
                      try {
                        await api.appointments.bookOnBehalf({
                          ...bookingFormData,
                          provider_id: providerProfile?.id,
                        });
                        showToast('Booked successfully!', 'success');
                        setShowBookOnBehalf(false);
                        setBookingFormData({});
                        fetchAppointments();
                      } catch (e: any) {
                        showToast(e.message || 'Booking failed', 'error');
                      }
                    }}
                    className="px-4 py-2 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
                  >
                    Confirm Booking
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SPOT REGISTRATION MODAL */}
          {showSpotReg && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setShowSpotReg(false)}
              />
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20">
                  <h3 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <User size={16} /> Spot Registration (Walk-in)
                  </h3>
                  <button
                    onClick={() => setShowSpotReg(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                  <p className="text-xs text-slate-500">
                    Register a walk-in student directly into the counselling portal.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Quick Select Student (Optional)
                    </label>
                    <select
                      className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                      value={bookingFormData.student_id || ''}
                      onChange={(e) => {
                        const sid = e.target.value;
                        const s = allStudents.find((st) => String(st.student_id) === sid);
                        if (s) {
                          setBookingFormData({
                            ...bookingFormData,
                            student_id: s.student_id,
                            student_name: s.student_name,
                            registration_number: s.registration_number,
                          });
                        } else {
                          setBookingFormData({ ...bookingFormData, student_id: '' });
                        }
                      }}
                    >
                      <option value="">-- Select Existing Student --</option>
                      {allStudents.map((s) => (
                        <option key={s.student_id} value={s.student_id}>
                          {s.student_name} ({s.registration_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                        Student Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SAKE NARESH"
                        required
                        value={bookingFormData.student_name || ''}
                        className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                        onChange={(e) =>
                          setBookingFormData({ ...bookingFormData, student_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                        Registration No / Roll No *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 23MTL04"
                        required
                        value={bookingFormData.registration_number || ''}
                        className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                        onChange={(e) =>
                          setBookingFormData({
                            ...bookingFormData,
                            registration_number: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Reason for Visit
                    </label>
                    <textarea
                      placeholder="Reason for visit / walk-in purpose..."
                      value={bookingFormData.reason_for_visit || ''}
                      className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 h-20 text-sm font-medium"
                      onChange={(e) =>
                        setBookingFormData({
                          ...bookingFormData,
                          reason_for_visit: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Priority Level
                    </label>
                    <select
                      className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                      value={bookingFormData.priority || 'normal'}
                      onChange={(e) =>
                        setBookingFormData({ ...bookingFormData, priority: e.target.value })
                      }
                    >
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                      <option value="immediate">Immediate Priority</option>
                    </select>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-950">
                  <button
                    onClick={() => setShowSpotReg(false)}
                    className="px-4 py-2 font-bold text-xs bg-slate-200 rounded-xl hover:bg-slate-300 text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        !bookingFormData.student_name &&
                        !bookingFormData.registration_number &&
                        !bookingFormData.student_id
                      ) {
                        showToast(
                          'Please select a student or enter Student Name & Registration No',
                          'error',
                        );
                        return;
                      }
                      try {
                        await api.appointments.registerSpot({
                          ...bookingFormData,
                          provider_id: providerProfile?.id,
                        });
                        showToast('Spot registered successfully!', 'success');
                        setShowSpotReg(false);
                        setBookingFormData({});
                        fetchAppointments();
                      } catch (e: any) {
                        showToast(e.message || 'Registration failed', 'error');
                      }
                    }}
                    className="px-4 py-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                  >
                    Register Walk-in
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EMERGENCY MODAL */}
          {showEmergency && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setShowEmergency(false)}
              />
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-50 dark:bg-rose-900/20">
                  <h3 className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle size={16} /> Emergency Case
                  </h3>
                  <button
                    onClick={() => setShowEmergency(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                  <p className="text-rose-600 text-xs font-bold bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                    Warning: Use this only for severe crises requiring immediate logging and
                    follow-up.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Quick Select Student (Optional)
                    </label>
                    <select
                      className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                      value={bookingFormData.student_id || ''}
                      onChange={(e) => {
                        const sid = e.target.value;
                        const s = allStudents.find((st) => String(st.student_id) === sid);
                        if (s) {
                          setBookingFormData({
                            ...bookingFormData,
                            student_id: s.student_id,
                            student_name: s.student_name,
                            registration_number: s.registration_number,
                          });
                        } else {
                          setBookingFormData({ ...bookingFormData, student_id: '' });
                        }
                      }}
                    >
                      <option value="">-- Select Existing Student --</option>
                      {allStudents.map((s) => (
                        <option key={s.student_id} value={s.student_id}>
                          {s.student_name} ({s.registration_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                        Student Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SAKE NARESH"
                        required
                        value={bookingFormData.student_name || ''}
                        className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                        onChange={(e) =>
                          setBookingFormData({ ...bookingFormData, student_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                        Registration No / Roll No *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 23MTL04"
                        required
                        value={bookingFormData.registration_number || ''}
                        className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                        onChange={(e) =>
                          setBookingFormData({
                            ...bookingFormData,
                            registration_number: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Crisis Notes
                    </label>
                    <textarea
                      placeholder="Details of crisis / immediate symptoms..."
                      value={bookingFormData.crisis_notes || ''}
                      className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 h-24 text-sm font-medium"
                      onChange={(e) =>
                        setBookingFormData({
                          ...bookingFormData,
                          crisis_notes: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Emergency Contact Details / Phone
                    </label>
                    <input
                      type="text"
                      placeholder="Emergency contact person or phone number..."
                      value={bookingFormData.emergency_contact || ''}
                      className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                      onChange={(e) =>
                        setBookingFormData({
                          ...bookingFormData,
                          emergency_contact: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-950">
                  <button
                    onClick={() => setShowEmergency(false)}
                    className="px-4 py-2 font-bold text-xs bg-slate-200 rounded-xl hover:bg-slate-300 text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        !bookingFormData.student_name &&
                        !bookingFormData.registration_number &&
                        !bookingFormData.student_id
                      ) {
                        showToast(
                          'Please select a student or enter Student Name & Registration No',
                          'error',
                        );
                        return;
                      }
                      try {
                        await api.appointments.registerEmergency({
                          ...bookingFormData,
                          provider_id: providerProfile?.id,
                          priority: 'critical',
                        });
                        showToast('Emergency registered successfully!', 'success');
                        setShowEmergency(false);
                        setBookingFormData({});
                        fetchAppointments();
                      } catch (e: any) {
                        showToast(e.message || 'Registration failed', 'error');
                      }
                    }}
                    className="px-4 py-2 font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
                  >
                    Log Emergency
                  </button>
                </div>
              </div>
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
