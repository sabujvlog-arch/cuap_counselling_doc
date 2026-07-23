import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import {
  Users,
  Calendar,
  Activity,
  Bell,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  ShieldAlert,
  Database,
  Volume2,
  KeyRound,
  Download,
  Upload,
  LogOut,
  Check,
  CheckCircle,
  X,
  Clock,
  HelpCircle,
  FileText,
  Edit,
  Menu,
  Server,
  AlertCircle,
} from 'lucide-react';
import OPDRegister from './OPDRegister';
import ThemeToggle from './ui/ThemeToggle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSidebar } from '@/hooks/useSidebar';
import Sidebar from './ui/Sidebar';
import Breadcrumbs from './ui/Breadcrumbs';
import NotificationCenter from './ui/NotificationCenter';
import EnterpriseTable from './ui/EnterpriseTable';
import { BookOpen, Clipboard, Heart } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface AdminProps {
  onLogout: () => void;
  adminUsername: string;
}

export default function DashboardAdmin({ onLogout, adminUsername }: AdminProps) {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'providers'
    | 'students'
    | 'appointments'
    | 'opd'
    | 'repository'
    | 'audits'
    | 'settings'
    | 'architecture'
  >('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isMobile = useMediaQuery('(max-width: 1023px)');

  // Sidebar state hook
  const sidebar = useSidebar();
  const { sidebarCollapsed } = sidebar;

  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const tabLabels: Record<string, string> = {
    overview: 'Overview & Charts',
    providers: 'Manage Counselors',
    students: 'Manage Students',
    appointments: 'Appointments Manager',
    opd: 'OPD Patient Register',
    repository: 'Assessment Repository',
    audits: 'System Audit Logs',
    settings: 'Backup & Settings',
  };

  // EMR Repository states
  const [repository, setRepository] = useState<any[]>([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [repoProvider, setRepoProvider] = useState('');
  const [repoDept, setRepoDept] = useState('');
  const [repoSeverity, setRepoSeverity] = useState('');
  const [repoDiagnosis, setRepoDiagnosis] = useState('');
  const [repoDate, setRepoDate] = useState('');
  const [selectedRepoSession, setSelectedRepoSession] = useState<any>(null);

  // Form states
  const [providerForm, setProviderForm] = useState({
    username: '',
    password: '',
    name: '',
    employeeId: '',
    department: 'Student Welfare',
    qualification: '',
    specialization: '',
    photoUrl: '',
    signatureUrl: '',
    phone: '',
    email: '',
  });
  const [studentForm, setStudentForm] = useState({
    registrationNumber: '',
    name: '',
    age: '',
    gender: 'Male',
    dob: '',
    department: 'Computer Science',
    semester: '1',
    phone: '',
    email: '',
    hostelScholar: 'Day Scholar',
    emergencyContact: '',
    emergencyPhone: '',
    bloodGroup: 'O+',
    address: '',
  });
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    dob: '',
    department: 'Computer Science',
    semester: '1',
    phone: '',
    email: '',
    hostelScholar: 'Day Scholar',
    emergencyContact: '',
    emergencyPhone: '',
    bloodGroup: 'O+',
    address: '',
  });
  const [announcementMsg, setAnnouncementMsg] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [sanitizing, setSanitizing] = useState(false);
  const [sanitizeProgress, setSanitizeProgress] = useState(0);
  const [sanitizeResults, setSanitizeResults] = useState<any | null>(null);
  const [showSanitizeModal, setShowSanitizeModal] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // Student Clinical Profile modal states for Admin Case Management
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<any>(null);
  const [studentEMRData, setStudentEMRData] = useState<any>(null);
  const [studentMSELogs, setStudentMSELogs] = useState<any[]>([]);
  const [studentCaseHistories, setStudentCaseHistories] = useState<any[]>([]);
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [profileTab, setProfileTab] = useState<
    'profile' | 'timeline' | 'clinical' | 'prescriptions' | 'assessments' | 'documents'
  >('profile');
  const [profileLoading, setProfileLoading] = useState(false);

  // Data lists
  const [providers, setProviders] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [backupFile, setBackupFile] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchStats();
    fetchProviders();
    fetchStudents();
    fetchAppointments();
    fetchAudits();
    fetchRepository();
    fetchAnnouncements();
    fetchBackups();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleOpenStudentProfile = async (student: any) => {
    setSelectedStudentForProfile(student);
    setProfileLoading(true);
    setProfileTab('profile');
    try {
      const emr = await api.clinical.getEMR(student.id);
      setStudentEMRData(emr);

      try {
        const mse = await api.clinical.getMSELogs(student.id);
        setStudentMSELogs(mse);
      } catch (err) {
        console.error('Failed to load MSE logs:', err);
        setStudentMSELogs([]);
      }

      try {
        const histories = await api.clinical.getCaseHistories(student.id);
        setStudentCaseHistories(histories);
      } catch (err) {
        console.error('Failed to load case histories:', err);
        setStudentCaseHistories([]);
      }

      try {
        const docs = await api.documents.list({ studentId: student.id });
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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.admin.analytics();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepository = async () => {
    try {
      const data = await api.clinical.getAllAssessments();
      setRepository(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await api.messages.contacts();
      setProviders(res.filter((u: any) => u.role === 'provider'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.admin.listStudents();
      setStudents(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.appointments.list();
      setAppointments(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAudits = async () => {
    try {
      const res = await api.admin.auditLogs();
      setAuditLogs(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.createProvider(providerForm);
      showToast('Counselor created successfully!', 'success');
      setProviderForm({
        username: '',
        password: '',
        name: '',
        employeeId: '',
        department: 'Student Welfare',
        qualification: '',
        specialization: '',
        photoUrl: '',
        signatureUrl: '',
        phone: '',
        email: '',
      });
      fetchProviders();
      fetchAudits();
    } catch (err: any) {
      showToast(err.message || 'Failed to create provider', 'error');
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.createStudent(studentForm);
      showToast('Student registered successfully!', 'success');
      setStudentForm({
        registrationNumber: '',
        name: '',
        age: '',
        gender: 'Male',
        dob: '',
        department: 'Computer Science',
        semester: '1',
        phone: '',
        email: '',
        hostelScholar: 'Day Scholar',
        emergencyContact: '',
        emergencyPhone: '',
        bloodGroup: 'O+',
        address: '',
      });
      fetchStudents();
      fetchAudits();
    } catch (err: any) {
      showToast(err.message || 'Failed to create student', 'error');
    }
  };

  const startEditStudent = (s: any) => {
    setEditingStudent(s);
    setEditForm({
      name: s.name || '',
      age: s.age ? s.age.toString() : '',
      gender: s.gender || 'Male',
      dob: s.dob || '',
      bloodGroup: s.blood_group || 'O+',
      department: s.department || 'Computer Science',
      semester: s.semester ? s.semester.toString() : '1',
      hostelScholar: s.hostel_scholar || 'Day Scholar',
      phone: s.phone || '',
      email: s.email || '',
      emergencyContact: s.emergency_contact || '',
      emergencyPhone: s.emergency_phone || '',
      address: s.address || '',
    });
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await api.admin.updateStudent(editingStudent.id, editForm);
      showToast('Student profile updated successfully!', 'success');
      setEditingStudent(null);
      fetchStudents();
      fetchAudits();
    } catch (err: any) {
      showToast(err.message || 'Failed to update student', 'error');
    }
  };

  const handleDeleteStudent = async (studentId: number, studentName: string) => {
    if (
      confirm(
        `Are you sure you want to permanently delete the student account for "${studentName}"? This will delete all their appointments, sessions, and clinical EMR documents.`,
      )
    ) {
      try {
        await api.admin.deleteStudent(studentId);
        showToast('Student account successfully deleted.', 'success');
        fetchStudents();
        fetchAudits();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete student', 'error');
      }
    }
  };

  const handleUpdateAppStatus = async (appId: number, status: string) => {
    try {
      await api.appointments.updateStatus(appId, { status });
      showToast(`Appointment ${status} successfully!`, 'success');
      fetchAppointments();
      fetchStats();
      fetchAudits();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.admin.announcements();
      setAnnouncements(res || []);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await api.admin.listBackups();
      setBackupsList(res || []);
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;
    try {
      await api.admin.createAnnouncement(announcementMsg);
      showToast('Announcement posted successfully to all users!', 'success');
      setAnnouncementMsg('');
      fetchAnnouncements();
      fetchAudits();
    } catch (err: any) {
      showToast(err.message || 'Failed to post announcement', 'error');
    }
  };

  const handleUpdateAnnouncement = async (id: number, message: string) => {
    try {
      await api.admin.updateAnnouncement(id, message);
      showToast('Announcement updated successfully.', 'success');
      fetchAnnouncements();
      fetchAudits();
    } catch (err: any) {
      showToast(err.message || 'Failed to update announcement', 'error');
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await api.admin.deleteAnnouncement(id);
      showToast('Announcement deleted successfully.', 'success');
      fetchAnnouncements();
      fetchAudits();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete announcement', 'error');
    }
  };

  const handleBackup = async () => {
    try {
      const res = await api.admin.backup();
      showToast(`Backup completed! Filename: ${res.fileName}`, 'success');
      setBackupFile(res.fileName);
      fetchBackups();
      fetchAudits();
    } catch (err: any) {
      showToast(err.message || 'Backup failed', 'error');
    }
  };

  const handleDeleteBackup = async (fileName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the backup file "${fileName}"?`))
      return;
    try {
      await api.admin.deleteBackup(fileName);
      showToast('Backup deleted successfully.', 'success');
      fetchBackups();
      fetchAudits();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete backup', 'error');
    }
  };

  const handleRestore = async (fileName: string) => {
    if (!fileName) return;
    if (
      confirm(
        `RESTORE DATABASE? All current records will be wiped and replaced with contents of "${fileName}"! This action is irreversible.`,
      )
    ) {
      try {
        await api.admin.restore(fileName);
        showToast('Database restored successfully!', 'success');
        fetchStats();
        fetchAppointments();
        fetchProviders();
        fetchStudents();
        fetchBackups();
        fetchAudits();
      } catch (err: any) {
        showToast(err.message || 'Restore failed', 'error');
      }
    }
  };

  const handleSanitize = async () => {
    setSanitizing(true);
    setSanitizeProgress(10);
    setSanitizeResults(null);

    // Simulate compliance progress steps
    const timer1 = setTimeout(() => setSanitizeProgress(35), 400);
    const timer2 = setTimeout(() => setSanitizeProgress(65), 900);
    const timer3 = setTimeout(() => setSanitizeProgress(85), 1400);

    try {
      const res = await api.admin.sanitizeDatabase();

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setSanitizeProgress(100);

      setTimeout(() => {
        setSanitizing(false);
        setSanitizeResults(res.details);
        showToast('Database compliance sanitization completed.', 'success');
        fetchAudits();
        fetchStats();
      }, 500);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setSanitizing(false);
      showToast(err.message || 'Database sanitization failed. Transaction rolled back.', 'error');
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

      {/* Side Navigation Bar */}
      <Sidebar
        navItems={[
          { id: 'overview', label: 'Overview & Charts', icon: Activity },
          { id: 'providers', label: 'Manage Counselors', icon: Users },
          { id: 'students', label: 'Manage Students', icon: Users },
          { id: 'appointments', label: 'Appointments Manager', icon: Calendar },
          { id: 'opd', label: 'OPD Patient Register', icon: FileText },
          { id: 'repository', label: 'Assessment Repository', icon: Database },
          { id: 'audits', label: 'System Audit Logs', icon: ShieldAlert },
          { id: 'settings', label: 'Backup & Settings', icon: Database },
        ]}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        userName="Administrator"
        userRoleLabel="Admin Portal"
        userSubLabel={`username: ${adminUsername}`}
        {...sidebar}
      />

      {/* Main Panel Content Area */}
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
              Admin Control Center · {activeTab.toUpperCase()}
            </h1>
          </div>

          <div className="flex items-center gap-4 mr-2 lg:mr-4">
            <div className="text-right hidden sm:block mr-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                Administrator
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">{adminUsername}</span>
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
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-10 space-y-8">
          <Breadcrumbs
            portalName="Admin Portal"
            activeTabLabel={tabLabels[activeTab] || activeTab}
          />
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Executive Analytics</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    University-wide mental health metrics, counselor workloads, and enrollment
                    trends
                  </p>
                </div>{' '}
                <div className="flex gap-2">
                  <button
                    onClick={() => showToast('Exporting Report as Excel (XLSX)...', 'success')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <FileText size={14} /> Export PDF / Print
                  </button>
                </div>
              </div>

              {stats && (
                <>
                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      {
                        label: 'Total Patients',
                        value: stats.summary.totalPatients,
                        icon: Users,
                        color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20',
                        onClick: () => setActiveTab('students'),
                      },
                      {
                        label: 'Active Cases',
                        value: stats.summary.activeCases,
                        icon: Activity,
                        color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20',
                        onClick: () => {
                          setRepoSeverity('');
                          setActiveTab('repository');
                        },
                      },
                      {
                        label: 'High Severity Cases',
                        value: stats.summary.highSeverityCases,
                        icon: ShieldAlert,
                        color: 'text-red-500 bg-red-50 dark:bg-red-950/20',
                        onClick: () => {
                          setRepoSeverity('High');
                          setActiveTab('repository');
                        },
                      },
                      {
                        label: 'Total Counselors',
                        value: stats.summary.totalProviders,
                        icon: Users,
                        color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20',
                        onClick: () => setActiveTab('providers'),
                      },
                      {
                        label: 'Dept Perf Score',
                        value: `${stats.summary.departmentPerformanceScore}%`,
                        icon: Activity,
                        color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/20',
                        onClick: () =>
                          showToast(
                            'Department Performance score aggregates counselor workload, response time, and patient feedback ratings.',
                            'success',
                          ),
                      },
                    ].map((card, i) => {
                      const Icon = card.icon;
                      return (
                        <div
                          key={i}
                          onClick={card.onClick}
                          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col justify-between min-h-[110px] cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                        >
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-snug">
                            {card.label}
                          </p>
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-2xl font-black">{card.value}</p>
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}
                            >
                              <Icon size={18} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Charts Grid */}
                  {mounted && (
                    <div className="space-y-6">
                      {/* Middle Section: Weekly Visit Trend & Patient Distribution */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Weekly Visit Trend Line Chart */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-sm lg:col-span-2">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                            <Activity size={16} className="text-blue-500" /> Weekly Visit Trend
                          </h3>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={stats.charts.weeklyVisitTrend}
                                onClick={(data) => {
                                  if (data && data.activeLabel) {
                                    showToast(
                                      `Weekly Trend Details for ${data.activeLabel}: Opening detailed logs.`,
                                      'success',
                                    );
                                    setActiveTab('opd');
                                  }
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#334155"
                                  opacity={0.1}
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="name"
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                  dy={10}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                  dx={-10}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderRadius: '12px',
                                    border: '1px solid hsl(var(--border))',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                  }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Line
                                  type="monotone"
                                  dataKey="visits"
                                  name="Daily Visits"
                                  stroke="#3b82f6"
                                  strokeWidth={3}
                                  activeDot={{ r: 6 }}
                                  className="cursor-pointer"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="appointments"
                                  name="Appointments"
                                  stroke="#10b981"
                                  strokeWidth={2}
                                  className="cursor-pointer"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="sessions"
                                  name="Sessions"
                                  stroke="#8b5cf6"
                                  strokeWidth={2}
                                  className="cursor-pointer"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="walkins"
                                  name="Walk-ins"
                                  stroke="#f59e0b"
                                  strokeWidth={2}
                                  className="cursor-pointer"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Patient Distribution Donut */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                            <Activity size={16} className="text-emerald-500" /> Patient Distribution
                          </h3>
                          <div className="h-56 relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={stats.charts.patientDistribution}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={65}
                                  outerRadius={85}
                                  paddingAngle={4}
                                  dataKey="value"
                                  stroke="none"
                                  onClick={(entry) => {
                                    showToast(
                                      `Navigating to Client Repository filtered by: ${entry.name}`,
                                      'success',
                                    );
                                    if (entry.name === 'Active Cases') {
                                      setRepoSeverity('');
                                      setActiveTab('repository');
                                    } else if (entry.name === 'Pending Cases') {
                                      setActiveTab('appointments');
                                    } else {
                                      setActiveTab('repository');
                                    }
                                  }}
                                >
                                  {stats.charts.patientDistribution.map(
                                    (entry: any, index: number) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        className="cursor-pointer"
                                      />
                                    ),
                                  )}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 mt-2">
                            {stats.charts.patientDistribution.map((entry: any, index: number) => (
                              <div
                                key={entry.name}
                                className="flex items-center gap-1.5 justify-center"
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                ></span>
                                <span className="font-semibold truncate">
                                  {entry.name}: {entry.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Next Section 1: Counselor Workload & Case Severity */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Counselor Workload Detailed Horizontal Bar */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-sm lg:col-span-2">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                            <Users size={16} className="text-indigo-500" /> Counselor Workload
                          </h3>
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={stats.charts.providerWorkload}
                                layout="vertical"
                                onClick={(data) => {
                                  if (data && data.activeLabel) {
                                    showToast(
                                      `Redirecting to manage profile of Counselor: ${data.activeLabel}`,
                                      'success',
                                    );
                                    setActiveTab('providers');
                                  }
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#334155"
                                  opacity={0.1}
                                  horizontal={false}
                                />
                                <XAxis
                                  type="number"
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis
                                  dataKey="name"
                                  type="category"
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                  width={100}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                  }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Bar
                                  dataKey="assignedStudents"
                                  name="Assigned Students"
                                  fill="#3b82f6"
                                  radius={[0, 4, 4, 0]}
                                  barSize={10}
                                  className="cursor-pointer"
                                />
                                <Bar
                                  dataKey="activeCases"
                                  name="Active Cases"
                                  fill="#10b981"
                                  radius={[0, 4, 4, 0]}
                                  barSize={10}
                                  className="cursor-pointer"
                                />
                                <Bar
                                  dataKey="sessionsCompleted"
                                  name="Sessions Completed"
                                  fill="#8b5cf6"
                                  radius={[0, 4, 4, 0]}
                                  barSize={10}
                                  className="cursor-pointer"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Case Severity Distribution */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                            <ShieldAlert size={16} className="text-red-500" /> Case Severity
                            Distribution
                          </h3>
                          <div className="h-56 relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={stats.charts.caseSeverityAnalytics}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={75}
                                  paddingAngle={3}
                                  dataKey="value"
                                  stroke="none"
                                  onClick={(entry) => {
                                    showToast(
                                      `Filtering Repository for ${entry.name} severity cases`,
                                      'success',
                                    );
                                    setRepoSeverity(entry.name || '');
                                    setActiveTab('repository');
                                  }}
                                >
                                  {stats.charts.caseSeverityAnalytics.map(
                                    (entry: any, index: number) => {
                                      const SEVERITY_COLORS = [
                                        '#3b82f6',
                                        '#f59e0b',
                                        '#ef4444',
                                        '#7f1d1d',
                                      ];
                                      return (
                                        <Cell
                                          key={`cell-${index}`}
                                          fill={SEVERITY_COLORS[index % SEVERITY_COLORS.length]}
                                          className="cursor-pointer"
                                        />
                                      );
                                    },
                                  )}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 mt-2">
                            {stats.charts.caseSeverityAnalytics.map((entry: any, index: number) => {
                              const SEVERITY_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#7f1d1d'];
                              return (
                                <div
                                  key={entry.name}
                                  className="flex items-center gap-1.5 justify-center"
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        SEVERITY_COLORS[index % SEVERITY_COLORS.length],
                                    }}
                                  ></span>
                                  <span className="font-semibold truncate">
                                    {entry.name}: {entry.value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Next Section 2: Assessment Analytics, Appointment Overview & Screening Severity */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Assessment Analytics Bar Chart */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-sm">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                            <FileText size={16} className="text-purple-500" /> Assessment Analytics
                          </h3>
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={stats.charts.assessmentAnalytics}
                                onClick={(data) => {
                                  if (data && data.activeLabel) {
                                    showToast(
                                      `Reviewing assessments for Department: ${data.activeLabel}`,
                                      'success',
                                    );
                                    setActiveTab('repository');
                                  }
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#334155"
                                  opacity={0.1}
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="department"
                                  stroke="#64748b"
                                  fontSize={10}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                  }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Bar
                                  dataKey="completed"
                                  name="Completed Assessments"
                                  fill="#8b5cf6"
                                  radius={[4, 4, 0, 0]}
                                  className="cursor-pointer"
                                />
                                <Bar
                                  dataKey="trend"
                                  name="Weekly Trend %"
                                  fill="#06b6d4"
                                  radius={[4, 4, 0, 0]}
                                  className="cursor-pointer"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Appointment Overview Stacked Bar Chart */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-sm">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                            <Calendar size={16} className="text-teal-500" /> Appointment Overview
                            (Weekly)
                          </h3>
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={stats.charts.appointmentOverview}
                                onClick={() => setActiveTab('appointments')}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#334155"
                                  opacity={0.1}
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="name"
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                  }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Bar
                                  dataKey="completed"
                                  name="Completed"
                                  stackId="a"
                                  fill="#10b981"
                                  className="cursor-pointer"
                                />
                                <Bar
                                  dataKey="scheduled"
                                  name="Scheduled"
                                  stackId="a"
                                  fill="#3b82f6"
                                  className="cursor-pointer"
                                />
                                <Bar
                                  dataKey="followUp"
                                  name="Follow-Up"
                                  stackId="a"
                                  fill="#f59e0b"
                                  className="cursor-pointer"
                                />
                                <Bar
                                  dataKey="cancelled"
                                  name="Cancelled"
                                  stackId="a"
                                  fill="#ef4444"
                                  className="cursor-pointer"
                                />
                                <Bar
                                  dataKey="noShow"
                                  name="No Show"
                                  stackId="a"
                                  fill="#64748b"
                                  className="cursor-pointer"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Psychological Triage Screening Trends */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-sm">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                            <Activity size={16} className="text-pink-500" /> Screening Trends (PHQ-9
                            & GAD-7)
                          </h3>
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.charts.wellnessScreeningTrends}>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#334155"
                                  opacity={0.1}
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="name"
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                  }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Bar
                                  dataKey="depression"
                                  name="PHQ-9 (Depression)"
                                  fill="#3b82f6"
                                  radius={[4, 4, 0, 0]}
                                  className="cursor-pointer"
                                />
                                <Bar
                                  dataKey="anxiety"
                                  name="GAD-7 (Anxiety)"
                                  fill="#ec4899"
                                  radius={[4, 4, 0, 0]}
                                  className="cursor-pointer"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Section: Enrollment Area & Emergency Status / Recent Activities */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Student Enrollment Trend Area Chart */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-sm lg:col-span-2">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                            <Users size={16} className="text-blue-500" /> Student Enrollment Trend
                          </h3>
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={stats.charts.enrollmentTrend}
                                onClick={() => setActiveTab('students')}
                              >
                                <defs>
                                  <linearGradient
                                    id="colorRegistrations"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#334155"
                                  opacity={0.1}
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="week"
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={11}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                  }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Area
                                  type="monotone"
                                  dataKey="registrations"
                                  name="Weekly Registrations"
                                  stroke="#3b82f6"
                                  fillOpacity={1}
                                  fill="url(#colorRegistrations)"
                                  className="cursor-pointer"
                                />
                                <Area
                                  type="monotone"
                                  dataKey="growth"
                                  name="Cumulative Growth"
                                  stroke="#10b981"
                                  fillOpacity={1}
                                  fill="url(#colorGrowth)"
                                  className="cursor-pointer"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Emergency Status Card & Recent Activities */}
                        <div className="flex flex-col gap-6">
                          {/* Emergency Cases alert block */}
                          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-3xl shadow-sm flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black tracking-wider uppercase text-red-650 dark:text-red-400">
                                  Emergency Status
                                </span>
                                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                              </div>
                              <h4 className="text-2xl font-black text-red-800 dark:text-red-300">
                                {stats.charts.emergencyStatus.todayCount} Critical Cases Today
                              </h4>
                              <p className="text-xs text-red-650 dark:text-red-400 mt-2 leading-relaxed">
                                System alert: Multi-dimensional severity logs flagged as "Critical".
                                Please coordinate immediate care.
                              </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-900/40 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-red-500 block">
                                  System Alerts
                                </span>
                                <span className="text-base font-extrabold text-red-700 dark:text-red-300">
                                  {stats.charts.emergencyStatus.criticalAlerts} Active Warnings
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setRepoSeverity('Critical');
                                  setActiveTab('repository');
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
                              >
                                View Queue
                              </button>
                            </div>
                          </div>

                          {/* Recent Activities */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-sm flex-1 flex flex-col justify-between">
                            <h3 className="text-xs font-black tracking-wider uppercase text-slate-400 mb-3">
                              Recent Activity Logs
                            </h3>
                            <div className="space-y-3 overflow-y-auto max-h-[160px] pr-1 text-xs">
                              {[
                                {
                                  time: '10 mins ago',
                                  desc: 'Counselor completed assessment for 23BEC04',
                                  type: 'counselling',
                                },
                                {
                                  time: '1 hr ago',
                                  desc: 'Emergency Case Escalation triggered by 24PHD02 MSE log',
                                  type: 'emergency',
                                },
                                {
                                  time: '2 hrs ago',
                                  desc: 'New student registration submitted from Applied Sciences',
                                  type: 'registration',
                                },
                                {
                                  time: 'Yesterday',
                                  desc: 'Weekly database backup serialization completed',
                                  type: 'system',
                                },
                              ].map((act, i) => (
                                <div
                                  key={i}
                                  className="flex gap-2 pb-2 border-b border-slate-100 dark:border-slate-850 last:border-0 last:pb-0"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-slate-700 dark:text-slate-350">{act.desc}</p>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {act.time}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: MANAGE PROVIDERS */}
          {activeTab === 'providers' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Counselors Directory</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Add and manage university counselors and schedules
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Creator Form */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
                    Add New Specialist
                  </h3>
                  <form onSubmit={handleCreateProvider} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Username / Login
                      </label>
                      <input
                        type="text"
                        required
                        value={providerForm.username}
                        onChange={(e) =>
                          setProviderForm({ ...providerForm, username: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="e.g. dr_ramesh"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={providerForm.password}
                        onChange={(e) =>
                          setProviderForm({ ...providerForm, password: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={providerForm.name}
                        onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="Dr. Ramesh Kumar"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        required
                        value={providerForm.employeeId}
                        onChange={(e) =>
                          setProviderForm({ ...providerForm, employeeId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="EMP-1002"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Qualification
                      </label>
                      <input
                        type="text"
                        required
                        value={providerForm.qualification}
                        onChange={(e) =>
                          setProviderForm({ ...providerForm, qualification: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="M.Phil in Clinical Psychology"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Specialization
                      </label>
                      <input
                        type="text"
                        required
                        value={providerForm.specialization}
                        onChange={(e) =>
                          setProviderForm({ ...providerForm, specialization: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="CBT, Adolescent Anxiety"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Phone Number (for 2FA)
                      </label>
                      <input
                        type="text"
                        required
                        value={providerForm.phone}
                        onChange={(e) =>
                          setProviderForm({ ...providerForm, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="9849891226"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Email Address (for 2FA)
                      </label>
                      <input
                        type="email"
                        required
                        value={providerForm.email}
                        onChange={(e) =>
                          setProviderForm({ ...providerForm, email: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="counselor@cuap.edu.in"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-sm cursor-pointer"
                    >
                      Add Counselor Account
                    </button>
                  </form>
                </div>

                {/* Providers List */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
                    Active Counseling Specialists
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {providers.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold uppercase">
                                {p.display_name.charAt(0) || 'P'}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                  {p.display_name}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Emp ID: {p.employee_id || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => alert('Edit Counselor functionality coming soon')}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 transition"
                                title="Edit Profile"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => alert('Block Counselor functionality coming soon')}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 rounded-lg text-amber-600 transition"
                                title="Block Access"
                              >
                                <ShieldAlert size={14} />
                              </button>
                              <button
                                onClick={() => alert('Remove Counselor functionality coming soon')}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 rounded-lg text-rose-600 transition"
                                title="Remove Counselor"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 text-xs space-y-1 text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                            <p>
                              <strong>Specialization:</strong>{' '}
                              {p.specialization || p.details || 'General counseling'}
                            </p>
                            <p>
                              <strong>Qualification:</strong> {p.qualification || 'M.A Psychology'}
                            </p>
                            <p>
                              <strong>Dept:</strong> {p.department || 'Student Counseling'}
                            </p>
                            <p>
                              <strong>Phone:</strong> {p.phone || 'N/A'}
                            </p>
                            <p>
                              <strong>Email:</strong> {p.email || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANAGE STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Student Counseling Database</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Register new student profiles and audit clinical documents
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Registration Form */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
                    Register New Student
                  </h3>
                  <form
                    onSubmit={handleCreateStudent}
                    className="space-y-4 max-h-[500px] overflow-y-auto pr-1"
                  >
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Registration Number
                      </label>
                      <input
                        type="text"
                        required
                        value={studentForm.registrationNumber}
                        onChange={(e) =>
                          setStudentForm({ ...studentForm, registrationNumber: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="e.g. 21cuap12"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={studentForm.name}
                        onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="Student Name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Age</label>
                        <input
                          type="number"
                          required
                          value={studentForm.age}
                          onChange={(e) => setStudentForm({ ...studentForm, age: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Gender
                        </label>
                        <select
                          value={studentForm.gender}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, gender: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">DOB</label>
                        <input
                          type="date"
                          required
                          value={studentForm.dob}
                          onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Blood Group
                        </label>
                        <input
                          type="text"
                          required
                          value={studentForm.bloodGroup}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, bloodGroup: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                          placeholder="O+"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        required
                        value={studentForm.department}
                        onChange={(e) =>
                          setStudentForm({ ...studentForm, department: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="Computer Science"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Semester
                        </label>
                        <input
                          type="number"
                          required
                          value={studentForm.semester}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, semester: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Hostel/Day Scholar
                        </label>
                        <select
                          value={studentForm.hostelScholar}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, hostelScholar: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Hostel</option>
                          <option>Day Scholar</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Phone</label>
                        <input
                          type="tel"
                          required
                          value={studentForm.phone}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, phone: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                          placeholder="9999999999"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                        <input
                          type="email"
                          required
                          value={studentForm.email}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, email: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                          placeholder="student@cuap.ac.in"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Emergency Contact Name
                        </label>
                        <input
                          type="text"
                          required
                          value={studentForm.emergencyContact}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, emergencyContact: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Emergency Phone
                        </label>
                        <input
                          type="tel"
                          required
                          value={studentForm.emergencyPhone}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, emergencyPhone: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
                      <textarea
                        required
                        value={studentForm.address}
                        onChange={(e) =>
                          setStudentForm({ ...studentForm, address: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        rows={2}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-sm cursor-pointer"
                    >
                      Register Student Account
                    </button>
                  </form>
                </div>

                {/* Student Directory Table */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
                    Student Records
                  </h3>
                  <div className="space-y-3">
                    {students.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-sm block text-slate-900 dark:text-white">
                            {s.name || s.display_name}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 mt-0.5 block">
                            Reg No: {(s.registration_number || s.username || '').toUpperCase()}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1 space-x-2">
                            <span>Phone: {s.phone || 'N/A'}</span>
                            <span>•</span>
                            <span>Email: {s.email || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <span className="text-xs block text-slate-400 font-medium">
                              Dept: {s.department || 'Undergraduate'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                              Sem: {s.semester || 'N/A'} | {s.hostel_scholar || 'Day Scholar'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleOpenStudentProfile(s)}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 text-emerald-600 dark:text-emerald-400 rounded-lg transition cursor-pointer"
                              title="View Case File / Clinical Profile"
                            >
                              <Users size={14} />
                            </button>
                            <button
                              onClick={() => startEditStudent(s)}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 text-blue-600 dark:text-blue-400 rounded-lg transition cursor-pointer"
                              title="Edit Student"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(s.id, s.name || s.display_name)}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-855 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
                              title="Delete Student"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {editingStudent && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh] animate-scale-in">
                <button
                  onClick={() => setEditingStudent(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-4 shrink-0">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <Edit size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                      Edit Student Record
                    </h3>
                    <p className="text-xs text-slate-500">
                      Updating profile for{' '}
                      {(
                        editingStudent.registration_number ||
                        editingStudent.username ||
                        ''
                      ).toUpperCase()}
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleUpdateStudent}
                  className="flex-1 overflow-y-auto space-y-4 pr-1"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Age</label>
                        <input
                          type="number"
                          required
                          value={editForm.age}
                          onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Gender
                        </label>
                        <select
                          value={editForm.gender}
                          onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        required
                        value={editForm.dob}
                        onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Blood Group
                      </label>
                      <select
                        value={editForm.bloodGroup}
                        onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Semester
                        </label>
                        <input
                          type="number"
                          required
                          value={editForm.semester}
                          onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Residence
                        </label>
                        <select
                          value={editForm.hostelScholar}
                          onChange={(e) =>
                            setEditForm({ ...editForm, hostelScholar: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        >
                          <option value="Day Scholar">Day Scholar</option>
                          <option value="Hosteler">Hosteler</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Emergency Contact Person
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.emergencyContact}
                        onChange={(e) =>
                          setEditForm({ ...editForm, emergencyContact: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Emergency Phone
                      </label>
                      <input
                        type="tel"
                        required
                        value={editForm.emergencyPhone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, emergencyPhone: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
                    <textarea
                      required
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3 shrink-0 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingStudent(null)}
                      className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-sm cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: APPOINTMENTS MANAGER */}
          {activeTab === 'appointments' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Appointments Control Desk</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Approve bookings, manage cancellations, and track waiting lists
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                {appointments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    No appointments scheduled in the database.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-bold uppercase">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Counselor</th>
                          <th className="py-3 px-4">Slot Details</th>
                          <th className="py-3 px-4">Reason for Visit</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((a, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-sm"
                          >
                            <td className="py-4 px-4">
                              <span className="font-semibold block">{a.student_name}</span>
                              <span className="text-xs text-slate-400 font-mono mt-0.5">
                                {a.registration_number?.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-medium">Dr. {a.provider_name}</td>
                            <td className="py-4 px-4">
                              <span className="font-semibold block">{a.slot_date}</span>
                              <span className="text-xs text-slate-400 font-medium block mt-0.5">
                                {a.slot_time}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-500 italic max-w-xs truncate">
                              {a.reason}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  a.status === 'approved'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                    : a.status === 'completed'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                                      : a.status === 'waiting'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                        : a.status === 'rejected'
                                          ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {a.status}
                                {a.status === 'waiting' && ` (Pos: ${a.waitlist_position})`}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right space-x-1 whitespace-nowrap">
                              {a.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateAppStatus(a.id, 'approved')}
                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 rounded transition cursor-pointer"
                                    title="Approve Slot"
                                  >
                                    <Check size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateAppStatus(a.id, 'rejected')}
                                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition cursor-pointer"
                                    title="Reject Booking"
                                  >
                                    <X size={18} />
                                  </button>
                                </>
                              )}
                              {a.status === 'approved' && (
                                <button
                                  onClick={() => handleUpdateAppStatus(a.id, 'cancelled')}
                                  className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-600 text-xs font-bold rounded-lg transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: OPD patient register */}
          {activeTab === 'opd' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  Outpatient Department Register
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Audit daily clinical OPD logs and export reports
                </p>
              </div>
              <OPDRegister />
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL LOGS */}
          {activeTab === 'audits' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Security Audit Trail</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Audit clinical changes and operator access trails
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                {(() => {
                  const auditColumns = [
                    {
                      key: 'username',
                      header: 'Operator',
                      render: (log: any) => (
                        <div>
                          <span className="font-semibold block text-slate-800 dark:text-white">
                            {log.username || 'System'}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                            {log.role || 'daemon'}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: 'action',
                      header: 'Action',
                      render: (log: any) => (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 font-mono font-bold rounded">
                          {log.action}
                        </span>
                      ),
                    },
                    {
                      key: 'details',
                      header: 'Details',
                    },
                    {
                      key: 'ip_address',
                      header: 'IP Address',
                      render: (log: any) => (
                        <span className="font-mono text-slate-400">{log.ip_address}</span>
                      ),
                    },
                    {
                      key: 'created_at',
                      header: 'Timestamp',
                      render: (log: any) => new Date(log.created_at).toLocaleString(),
                    },
                  ];

                  return (
                    <EnterpriseTable
                      data={auditLogs}
                      columns={auditColumns}
                      rowKey={(log: any) => log.id || log.created_at}
                      placeholder="No audit logs found on record."
                      searchPlaceholder="Search audit events..."
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 7: BACKUP AND SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  System Configuration & Governance
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage global announcements, transactional compliance sanitization, and database
                  serialization backups
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT COLUMN: ANNOUNCEMENTS & SANITIZATION (7 spans) */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Global Announcements Broadcast Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm space-y-6">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Volume2 size={18} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                          University Announcements Broadcast
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                          Direct Feed Broadcast
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                      <div>
                        <textarea
                          required
                          value={announcementMsg}
                          onChange={(e) => setAnnouncementMsg(e.target.value)}
                          placeholder="Publish a critical wellness or operational notice to all students and provider dashboards..."
                          rows={3}
                          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none bg-slate-50 dark:bg-slate-950 leading-relaxed text-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
                        >
                          Broadcast Notice
                        </button>
                      </div>
                    </form>

                    {/* Active Announcements List */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Active Broadcats Feeds
                      </h4>
                      {announcements.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-4 border rounded-xl">
                          No active broadcast announcements.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {announcements.map((ann) => (
                            <div
                              key={ann.id}
                              className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="flex-1 space-y-1">
                                <p className="font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">
                                  {ann.message.replace(/^CUAP Announcement:\s*/, '')}
                                </p>
                                <span className="text-[9px] text-slate-400 font-mono block">
                                  {new Date(ann.created_at).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    const nextMsg = prompt(
                                      'Edit notice message:',
                                      ann.message.replace(/^CUAP Announcement:\s*/, ''),
                                    );
                                    if (nextMsg !== null && nextMsg.trim() !== '') {
                                      handleUpdateAnnouncement(ann.id, nextMsg.trim());
                                    }
                                  }}
                                  className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:text-blue-600 transition"
                                  title="Edit Notice"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this announcement?')) {
                                      handleDeleteAnnouncement(ann.id);
                                    }
                                  }}
                                  className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:text-red-600 transition"
                                  title="Delete Notice"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compliance Database Sanitization Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm space-y-6">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl">
                        <ShieldAlert size={18} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                          Data Governance Compliance Clean
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                          Transactional Purge & Security Sanitization
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 p-4 rounded-xl text-xs leading-relaxed text-amber-800 dark:text-amber-400 font-semibold">
                      <p className="flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 text-amber-500 mt-0.5" />
                        <span>
                          <strong>CRITICAL WARNING:</strong> Purges historical EMR documents,
                          feedback logs, and transactional records older than 30 days. Uses active
                          SQL transactions to rollback immediately if an error is encountered. This
                          compliance utility cannot be undone.
                        </span>
                      </p>
                    </div>

                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                          Transaction Rollback Protection
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Fully compliant with SQL Transaction boundaries
                        </p>
                      </div>
                      <button
                        onClick={() => setShowSanitizeModal(true)}
                        disabled={sanitizing}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition shrink-0 cursor-pointer"
                      >
                        Sanitize Records
                      </button>
                    </div>

                    {sanitizeResults && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                        <p className="font-extrabold text-slate-700 dark:text-slate-350">
                          Last Sanitization Purge Stats:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="p-2 bg-white dark:bg-slate-900 border rounded-lg">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">
                              Appointments
                            </span>
                            <span className="text-sm font-black text-rose-500">
                              {sanitizeResults.appointmentsDeleted}
                            </span>
                          </div>
                          <div className="p-2 bg-white dark:bg-slate-900 border rounded-lg">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">
                              Sessions
                            </span>
                            <span className="text-sm font-black text-rose-500">
                              {sanitizeResults.sessionsDeleted}
                            </span>
                          </div>
                          <div className="p-2 bg-white dark:bg-slate-900 border rounded-lg">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">
                              Documents
                            </span>
                            <span className="text-sm font-black text-rose-500">
                              {sanitizeResults.documentsDeleted}
                            </span>
                          </div>
                          <div className="p-2 bg-white dark:bg-slate-900 border rounded-lg">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">
                              Audit Logs
                            </span>
                            <span className="text-sm font-black text-rose-500">
                              {sanitizeResults.auditsDeleted}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: DATABASE BACKUPS (5 spans) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                          <Database size={18} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                            Database Serialization Backups
                          </h3>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                            Encrypted JSON Serialization
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Dumps the entire database (users, credentials, EMRs, assessments, feedback,
                      and logs) into an encrypted JSON file stored securely in server directory.
                    </p>

                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-150 dark:border-slate-800/80 rounded-xl gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Create snapshot now:
                      </span>
                      <button
                        onClick={handleBackup}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                      >
                        <Download size={14} /> Back Up
                      </button>
                    </div>

                    {/* Backups History Table */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Serialization Logs History
                      </h4>
                      {backupsList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-4 border rounded-xl">
                          No database backup snapshots recorded.
                        </p>
                      ) : (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {backupsList.map((bk) => (
                            <div
                              key={bk.name}
                              className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex-1 space-y-1 min-w-0">
                                <p
                                  className="font-bold text-slate-850 dark:text-slate-200 truncate"
                                  title={bk.name}
                                >
                                  {bk.name}
                                </p>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                                  <span>{(bk.size / 1024).toFixed(1)} KB</span>
                                  <span>•</span>
                                  <span>{new Date(bk.time).toLocaleDateString('en-IN')}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={api.admin.downloadBackupUrl(bk.name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:text-blue-600 transition inline-block text-center cursor-pointer"
                                  title="Download Backup"
                                >
                                  <Download size={12} />
                                </a>
                                <button
                                  onClick={() => handleRestore(bk.name)}
                                  className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:text-emerald-600 transition"
                                  title="Restore Database"
                                >
                                  <Upload size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteBackup(bk.name)}
                                  className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:text-red-600 transition"
                                  title="Delete Backup"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Sanitization Confirmation / Progress Modal */}
              {showSanitizeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => !sanitizing && setShowSanitizeModal(false)}
                  />
                  <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-50 dark:bg-rose-900/20">
                      <h3 className="font-bold text-rose-800 dark:text-rose-350 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <ShieldAlert size={16} /> Compliance Sanitization
                      </h3>
                      {!sanitizing && (
                        <button
                          onClick={() => setShowSanitizeModal(false)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <div className="p-6 space-y-4">
                      {sanitizing ? (
                        <div className="space-y-4 text-center py-6">
                          <RefreshCw className="animate-spin text-rose-500 mx-auto" size={36} />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              Purging old records older than 30 days...
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Wrapping deletion query inside transaction rollback protection
                            </p>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-rose-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${sanitizeProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-350 font-semibold">
                          <p>
                            You are about to launch a system-wide compliance sanitization. This
                            operation will:
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-500">
                            <li>Permanently delete appointment records older than 30 days.</li>
                            <li>
                              Delete clinical session notes and assessments older than 30 days.
                            </li>
                            <li>Wipe older uploaded consent and medical documents.</li>
                            <li>Purge historical audit log entries.</li>
                          </ul>
                          <p className="text-rose-600 dark:text-rose-400 font-extrabold bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-start gap-2 mt-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>
                              This cannot be undone. Please ensure you have generated a database
                              backup beforehand.
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-950">
                      <button
                        onClick={() => setShowSanitizeModal(false)}
                        disabled={sanitizing}
                        className="px-4 py-2 font-bold text-xs bg-slate-200 rounded-xl hover:bg-slate-300 text-slate-700 cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleSanitize();
                          setShowSanitizeModal(false);
                        }}
                        disabled={sanitizing}
                        className="px-4 py-2 font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        Execute Sanitization
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

          {/* STUDENT CLINICAL PROFILE DETAIL MODAL */}
          {selectedStudentForProfile && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-xl shrink-0 font-bold font-mono">
                      {selectedStudentForProfile.name?.slice(0, 2).toUpperCase() ||
                        selectedStudentForProfile.display_name?.slice(0, 2).toUpperCase() ||
                        'ST'}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2">
                        {selectedStudentForProfile.name || selectedStudentForProfile.display_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Reg No:{' '}
                        {(
                          selectedStudentForProfile.registration_number ||
                          selectedStudentForProfile.username ||
                          ''
                        ).toUpperCase()}{' '}
                        · {selectedStudentForProfile.department || 'General'} · Sem{' '}
                        {selectedStudentForProfile.semester || 'N/A'}
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
