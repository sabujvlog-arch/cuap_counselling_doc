import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { 
  Users, Calendar, Activity, RefreshCw, Plus, Trash2, Eye, ShieldAlert,
  Database, Volume2, KeyRound, Download, Upload, LogOut, Check, X, Clock, HelpCircle, FileText, Edit
} from 'lucide-react';
import OPDRegister from './OPDRegister';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface AdminProps {
  onLogout: () => void;
  adminUsername: string;
}

export default function DashboardAdmin({ onLogout, adminUsername }: AdminProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'students' | 'appointments' | 'opd' | 'audits' | 'settings'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form states
  const [providerForm, setProviderForm] = useState({
    username: '', password: '', name: '', employeeId: '', department: 'Student Welfare',
    qualification: '', specialization: '', photoUrl: '', signatureUrl: '', phone: '', email: ''
  });
  const [studentForm, setStudentForm] = useState({
    registrationNumber: '', name: '', age: '', gender: 'Male', dob: '', 
    department: 'Computer Science', semester: '1', phone: '', email: '', 
    hostelScholar: 'Day Scholar', emergencyContact: '', emergencyPhone: '', 
    bloodGroup: 'O+', address: ''
  });
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', age: '', gender: 'Male', dob: '', 
    department: 'Computer Science', semester: '1', phone: '', email: '', 
    hostelScholar: 'Day Scholar', emergencyContact: '', emergencyPhone: '', 
    bloodGroup: 'O+', address: ''
  });
  const [announcementMsg, setAnnouncementMsg] = useState('');
  
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
  }, []);

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
      alert("Provider created successfully!");
      setProviderForm({
        username: '', password: '', name: '', employeeId: '', department: 'Student Welfare',
        qualification: '', specialization: '', photoUrl: '', signatureUrl: '', phone: '', email: ''
      });
      fetchProviders();
      fetchAudits();
    } catch (err: any) {
      alert(err.message || "Failed to create provider");
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.createStudent(studentForm);
      alert("Student registered successfully!");
      setStudentForm({
        registrationNumber: '', name: '', age: '', gender: 'Male', dob: '', 
        department: 'Computer Science', semester: '1', phone: '', email: '', 
        hostelScholar: 'Day Scholar', emergencyContact: '', emergencyPhone: '', 
        bloodGroup: 'O+', address: ''
      });
      fetchStudents();
      fetchAudits();
    } catch (err: any) {
      alert(err.message || "Failed to create student");
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
      address: s.address || ''
    });
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await api.admin.updateStudent(editingStudent.id, editForm);
      alert("Student profile updated successfully!");
      setEditingStudent(null);
      fetchStudents();
      fetchAudits();
    } catch (err: any) {
      alert(err.message || "Failed to update student");
    }
  };

  const handleDeleteStudent = async (studentId: number, studentName: string) => {
    if (confirm(`Are you sure you want to permanently delete the student account for "${studentName}"? This will delete all their appointments, sessions, and clinical EMR documents.`)) {
      try {
        await api.admin.deleteStudent(studentId);
        alert("Student account successfully deleted.");
        fetchStudents();
        fetchAudits();
      } catch (err: any) {
        alert(err.message || "Failed to delete student");
      }
    }
  };

  const handleUpdateAppStatus = async (appId: number, status: string) => {
    try {
      await api.appointments.updateStatus(appId, { status });
      alert(`Appointment ${status} successfully!`);
      fetchAppointments();
      fetchStats();
      fetchAudits();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;
    try {
      await api.admin.createAnnouncement(announcementMsg);
      alert("Announcement posted successfully to all users!");
      setAnnouncementMsg('');
      fetchAudits();
    } catch (err: any) {
      alert(err.message || "Failed to post announcement");
    }
  };

  const handleBackup = async () => {
    try {
      const res = await api.admin.backup();
      alert(`Backup completed! Filename: ${res.fileName}`);
      setBackupFile(res.fileName);
      fetchAudits();
    } catch (err: any) {
      alert(err.message || "Backup failed");
    }
  };

  const handleRestore = async () => {
    if (!backupFile) {
      alert("Please enter a backup filename or run a backup first");
      return;
    }
    if (confirm("Restore database? Current records will be replaced!")) {
      try {
        await api.admin.restore(backupFile);
        alert("Database restored successfully!");
        fetchStats();
        fetchAppointments();
        fetchProviders();
        fetchStudents();
        fetchAudits();
      } catch (err: any) {
        alert(err.message || "Restore failed");
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      
      {/* Side Navigation Bar */}
      <aside className="w-full lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" className="w-10 h-10 object-contain" alt="CUAP Logo" />
            <div>
              <h1 className="text-xs font-black leading-tight text-slate-800 dark:text-slate-205">CUAP SWCC</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Admin Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Overview & Charts', icon: Activity },
              { id: 'providers', label: 'Manage Providers', icon: Users },
              { id: 'students', label: 'Manage Students', icon: Users },
              { id: 'appointments', label: 'Appointments Manager', icon: Calendar },
              { id: 'opd', label: 'OPD Patient Register', icon: FileText },
              { id: 'audits', label: 'System Audit Logs', icon: ShieldAlert },
              { id: 'settings', label: 'Backup & Settings', icon: Database }
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
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold font-mono">
              AD
            </div>
            <div>
              <p className="text-xs font-bold">Admin Account</p>
              <p className="text-[10px] text-slate-400">username: {adminUsername}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-h-screen">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Analytics Dashboard</h2>
              <p className="text-xs text-slate-500 mt-1">Real-time case counts and counselor workload reports</p>
            </div>

            {stats && (
              <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Registered Students', value: stats.summary.totalStudents, icon: Users, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
                    { label: 'Today\'s Scheduled Visits', value: stats.summary.todayAppointments, icon: Calendar, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
                    { label: 'Active Case Profiles', value: stats.summary.activeCases, icon: Activity, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' },
                    { label: 'Follow-up Reminders', value: stats.summary.followUpCases, icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' }
                  ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                          <p className="text-2xl font-black mt-2">{card.value}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                          <Icon size={20} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Charts Grid */}
                {mounted && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visits Trend */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Monthly Visits Trend</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats.charts.monthlyVisits}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                            <Line type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Department Distribution */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Visits by Department</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.charts.departmentDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                            <XAxis dataKey="department" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                            <Bar dataKey="students" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Gender Distribution */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Client Gender Distribution</h3>
                      <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.charts.genderDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {stats.charts.genderDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Provider Workload */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Counselor Workloads (Appts Count)</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.charts.providerWorkload}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                            <Bar dataKey="appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
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
              <h2 className="text-2xl font-black tracking-tight">Counselors & Providers Directory</h2>
              <p className="text-xs text-slate-500 mt-1">Add and manage university counselors and schedules</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Creator Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Add New Specialist</h3>
                <form onSubmit={handleCreateProvider} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Username / Login</label>
                    <input
                      type="text"
                      required
                      value={providerForm.username}
                      onChange={(e) => setProviderForm({ ...providerForm, username: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      placeholder="e.g. dr_ramesh"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={providerForm.password}
                      onChange={(e) => setProviderForm({ ...providerForm, password: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
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
                    <label className="block text-xs font-bold text-slate-500 mb-1">Employee ID</label>
                    <input
                      type="text"
                      required
                      value={providerForm.employeeId}
                      onChange={(e) => setProviderForm({ ...providerForm, employeeId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      placeholder="EMP-1002"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Qualification</label>
                    <input
                      type="text"
                      required
                      value={providerForm.qualification}
                      onChange={(e) => setProviderForm({ ...providerForm, qualification: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      placeholder="M.Phil in Clinical Psychology"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Specialization</label>
                    <input
                      type="text"
                      required
                      value={providerForm.specialization}
                      onChange={(e) => setProviderForm({ ...providerForm, specialization: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      placeholder="CBT, Adolescent Anxiety"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number (for 2FA)</label>
                    <input
                      type="text"
                      required
                      value={providerForm.phone}
                      onChange={(e) => setProviderForm({ ...providerForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      placeholder="9849891226"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Email Address (for 2FA)</label>
                    <input
                      type="email"
                      required
                      value={providerForm.email}
                      onChange={(e) => setProviderForm({ ...providerForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      placeholder="counselor@cuap.edu.in"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-sm cursor-pointer"
                  >
                    Add Provider Account
                  </button>
                </form>
              </div>

              {/* Providers List */}
              <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Active Counseling Specialists</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map((p, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold uppercase">
                            {p.display_name.charAt(0) || 'P'}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.display_name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Emp ID: {p.employee_id || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="mt-3 text-xs space-y-1 text-slate-500">
                          <p><strong>Specialization:</strong> {p.specialization || p.details || 'General counseling'}</p>
                          <p><strong>Qualification:</strong> {p.qualification || 'M.A Psychology'}</p>
                          <p><strong>Dept:</strong> {p.department || 'Student Counseling'}</p>
                          <p><strong>Phone:</strong> {p.phone || 'N/A'}</p>
                          <p><strong>Email:</strong> {p.email || 'N/A'}</p>
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
              <p className="text-xs text-slate-500 mt-1">Register new student profiles and audit clinical documents</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Registration Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Register New Student</h3>
                <form onSubmit={handleCreateStudent} className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Registration Number</label>
                    <input
                      type="text"
                      required
                      value={studentForm.registrationNumber}
                      onChange={(e) => setStudentForm({ ...studentForm, registrationNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      placeholder="e.g. 21cuap12"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
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
                      <label className="block text-xs font-bold text-slate-500 mb-1">Gender</label>
                      <select
                        value={studentForm.gender}
                        onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
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
                      <label className="block text-xs font-bold text-slate-500 mb-1">Blood Group</label>
                      <input
                        type="text"
                        required
                        value={studentForm.bloodGroup}
                        onChange={(e) => setStudentForm({ ...studentForm, bloodGroup: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="O+"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Department</label>
                    <input
                      type="text"
                      required
                      value={studentForm.department}
                      onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      placeholder="Computer Science"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Semester</label>
                      <input
                        type="number"
                        required
                        value={studentForm.semester}
                        onChange={(e) => setStudentForm({ ...studentForm, semester: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Hostel/Day Scholar</label>
                      <select
                        value={studentForm.hostelScholar}
                        onChange={(e) => setStudentForm({ ...studentForm, hostelScholar: e.target.value })}
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
                        onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
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
                        onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                        placeholder="student@cuap.ac.in"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Emergency Contact Name</label>
                      <input
                        type="text"
                        required
                        value={studentForm.emergencyContact}
                        onChange={(e) => setStudentForm({ ...studentForm, emergencyContact: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Emergency Phone</label>
                      <input
                        type="tel"
                        required
                        value={studentForm.emergencyPhone}
                        onChange={(e) => setStudentForm({ ...studentForm, emergencyPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
                    <textarea
                      required
                      value={studentForm.address}
                      onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
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
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Student Records</h3>
                <div className="space-y-3">
                  {students.map((s, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm block text-slate-900 dark:text-white">{s.name || s.display_name}</span>
                        <span className="text-xs font-semibold text-slate-500 mt-0.5 block">Reg No: {(s.registration_number || s.username || '').toUpperCase()}</span>
                        <div className="text-[10px] text-slate-400 mt-1 space-x-2">
                          <span>Phone: {s.phone || 'N/A'}</span>
                          <span>•</span>
                          <span>Email: {s.email || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <span className="text-xs block text-slate-400 font-medium">Dept: {s.department || 'Undergraduate'}</span>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Sem: {s.semester || 'N/A'} | {s.hostel_scholar || 'Day Scholar'}</span>
                        </div>
                        <div className="flex gap-1">
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
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Edit Student Record</h3>
                <p className="text-xs text-slate-500">Updating profile for {(editingStudent.registration_number || editingStudent.username || '').toUpperCase()}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateStudent} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
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
                    <label className="block text-xs font-bold text-slate-500 mb-1">Gender</label>
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
                  <label className="block text-xs font-bold text-slate-500 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Blood Group</label>
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
                  <label className="block text-xs font-bold text-slate-500 mb-1">Department</label>
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
                    <label className="block text-xs font-bold text-slate-500 mb-1">Semester</label>
                    <input
                      type="number"
                      required
                      value={editForm.semester}
                      onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Residence</label>
                    <select
                      value={editForm.hostelScholar}
                      onChange={(e) => setEditForm({ ...editForm, hostelScholar: e.target.value })}
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
                  <label className="block text-xs font-bold text-slate-500 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
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
                  <label className="block text-xs font-bold text-slate-500 mb-1">Emergency Contact Person</label>
                  <input
                    type="text"
                    required
                    value={editForm.emergencyContact}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    required
                    value={editForm.emergencyPhone}
                    onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
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
              <p className="text-xs text-slate-500 mt-1">Approve bookings, manage cancellations, and track waiting lists</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
              {appointments.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No appointments scheduled in the database.</div>
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
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-sm">
                          <td className="py-4 px-4">
                            <span className="font-semibold block">{a.student_name}</span>
                            <span className="text-xs text-slate-400 font-mono mt-0.5">{a.registration_number?.toUpperCase()}</span>
                          </td>
                          <td className="py-4 px-4 font-medium">Dr. {a.provider_name}</td>
                          <td className="py-4 px-4">
                            <span className="font-semibold block">{a.slot_date}</span>
                            <span className="text-xs text-slate-400 font-medium block mt-0.5">{a.slot_time}</span>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500 italic max-w-xs truncate">{a.reason}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              a.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
                              a.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' :
                              a.status === 'waiting' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                              a.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' :
                              'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
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
              <h2 className="text-2xl font-black tracking-tight">Outpatient Department Register</h2>
              <p className="text-xs text-slate-500 mt-1">Audit daily clinical OPD logs and export reports</p>
            </div>
            <OPDRegister />
          </div>
        )}

        {/* TAB 6: AUDIT TRAIL LOGS */}
        {activeTab === 'audits' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Security Audit Trail</h2>
              <p className="text-xs text-slate-500 mt-1">Audit clinical changes and operator access trails</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
              <div className="overflow-y-auto max-h-[500px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-bold uppercase">
                      <th className="py-3 px-4">Operator</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-xs">
                        <td className="py-3 px-4">
                          <span className="font-semibold block">{log.username || 'System'}</span>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{log.role || 'daemon'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{log.details}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-400">{log.ip_address}</td>
                        <td className="py-3 px-4 font-medium">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: BACKUP AND SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-black tracking-tight">System Configuration & Database Backups</h2>
              <p className="text-xs text-slate-500 mt-1">Publish notices and manage system backups</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Announcements panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Volume2 className="text-blue-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Global University Announcement</h3>
                </div>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Message Banner</label>
                    <textarea
                      required
                      value={announcementMsg}
                      onChange={(e) => setAnnouncementMsg(e.target.value)}
                      placeholder="Write alert banner text to show on student and provider feeds..."
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Broadcast Announcement
                  </button>
                </form>
              </div>

              {/* Backups panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="text-blue-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Database Backup & Serialization</h3>
                </div>
                <div className="space-y-6">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Dumps the entire database (users, profiles, EMRs, prescriptions, messages, and audits) into an encrypted JSON file stored under `/backups`.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={handleBackup}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-sm cursor-pointer"
                    >
                      <Download size={16} />
                      Generate New Backup
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Restore Database State</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={backupFile}
                        onChange={(e) => setBackupFile(e.target.value)}
                        placeholder="e.g. Backup_CUAP_WCCMS_17849.json"
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none bg-slate-50 dark:bg-slate-950"
                      />
                      <button
                        onClick={handleRestore}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl transition shadow-sm cursor-pointer"
                      >
                        <Upload size={16} />
                        Restore
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
