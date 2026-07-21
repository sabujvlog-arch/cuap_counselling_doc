import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ThemeToggle from './ui/ThemeToggle';
import {
  User,
  ClipboardCheck,
  Search,
  Plus,
  ShieldCheck,
  Mail,
  LogOut,
  Loader2,
} from 'lucide-react';

interface DashboardFrontDeskProps {
  onLogout: () => void;
  user: any;
}

export default function DashboardFrontDesk({ onLogout, user }: DashboardFrontDeskProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);

  // Form states
  const [regNumber, setRegNumber] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('1');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [referralSource, setReferralSource] = useState('Self-Referral');
  const [consentSigned, setConsentSigned] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await api.admin.listStudents();
      setStudents(data || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regNumber || !name || !department || !semester) {
      setRegError('Please fill in all required fields.');
      return;
    }

    try {
      await api.admin.createStudent({
        registrationNumber: regNumber.toUpperCase().trim(),
        name: name.trim(),
        dob,
        age: parseInt(age) || 20,
        gender,
        bloodGroup,
        department,
        semester,
        phone,
        email,
        referralSource,
        informedConsentSigned: consentSigned,
      });

      setRegSuccess(`Successfully registered student ${name} (${regNumber.toUpperCase()})`);
      // Reset form
      setRegNumber('');
      setName('');
      setDob('');
      setAge('');
      setGender('Male');
      setBloodGroup('O+');
      setDepartment('');
      setSemester('1');
      setPhone('');
      setEmail('');
      setReferralSource('Self-Referral');
      setConsentSigned(false);
      setShowRegForm(false);
      fetchStudents();
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Registration number may already exist.');
    }
  };

  const handleConsentToggle = async (student: any) => {
    try {
      const nextConsent = !student.informed_consent_signed;
      await api.admin.updateStudent(student.id, {
        ...student,
        informed_consent_signed: nextConsent,
        consent_date: nextConsent ? new Date().toISOString().split('T')[0] : null,
      });
      alert(`Updated consent status for ${student.name}`);
      fetchStudents();
    } catch (err) {
      alert('Failed to update consent status');
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.registration_number || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              FD
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                WCCMS Front Desk Portal
              </h1>
              <p className="text-[10px] text-slate-500 font-bold">Logged in: {user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-55 dark:bg-slate-800 dark:hover:bg-red-950/20 text-slate-600 hover:text-red-605 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Statistics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-extrabold uppercase">Total Clients</span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {students.length}
              </h2>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-extrabold uppercase">
                Consented Clients
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {students.filter((s) => s.informed_consent_signed).length}
              </h2>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-extrabold uppercase">
                Consent Completion
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {students.length > 0
                  ? Math.round(
                      (students.filter((s) => s.informed_consent_signed).length / students.length) *
                        100,
                    )
                  : 0}
                %
              </h2>
            </div>
          </div>
        </div>

        {/* Action bar and Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search clients name or registration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <button
            onClick={() => setShowRegForm(!showRegForm)}
            className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow shadow-blue-500/10 cursor-pointer"
          >
            <Plus size={16} /> Register New Client
          </button>
        </div>

        {/* Client Registration Modal/Form */}
        {showRegForm && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm animate-fade-in-up">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">
              Register New Client Demographics & Consent
            </h3>
            {regError && (
              <div className="p-3 mb-4 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                {regError}
              </div>
            )}

            <form
              onSubmit={handleRegister}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs"
            >
              <div>
                <label className="block text-slate-500 font-bold mb-1">
                  Registration ID / Number*
                </label>
                <input
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="e.g. 25BEC01"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Client Full Name*</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Type name..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-808 rounded-xl bg-slate-50 dark:bg-slate-955"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="20"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-808 rounded-xl bg-slate-50 dark:bg-slate-955"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-808 rounded-xl bg-slate-50 dark:bg-slate-955"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-808 rounded-xl bg-slate-50 dark:bg-slate-955"
                >
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>O+</option>
                  <option>O-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">
                  Department / Discipline*
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-808 rounded-xl bg-slate-50 dark:bg-slate-955"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">
                  Semester / Grade Level*
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-808 rounded-xl bg-slate-50 dark:bg-slate-955"
                >
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5</option>
                  <option>6</option>
                  <option>7</option>
                  <option>8</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Referral Source</label>
                <input
                  type="text"
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  placeholder="Dean office, parent, self"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-808 rounded-xl bg-slate-50 dark:bg-slate-955"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Phone Contact</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-808 rounded-xl bg-slate-50 dark:bg-slate-955"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-808 rounded-xl bg-slate-50 dark:bg-slate-955"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="consentCheck"
                  checked={consentSigned}
                  onChange={(e) => setConsentSigned(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                />
                <label
                  htmlFor="consentCheck"
                  className="font-bold text-slate-700 dark:text-slate-300"
                >
                  Informed Consent Form Signed
                </label>
              </div>

              <div className="md:col-span-3 flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRegForm(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Register Client
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Client lists and consent tracking */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-155 dark:border-slate-800 flex justify-between items-center bg-slate-50/40 dark:bg-slate-950/20">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
              Registered Client Roster & Consent Status
            </h3>
            {loading && <Loader2 className="animate-spin text-blue-600" size={16} />}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-black text-slate-500 uppercase">
                  <th className="py-3 px-6">Registration No</th>
                  <th className="py-3 px-6">Client Name</th>
                  <th className="py-3 px-6">Department & Semester</th>
                  <th className="py-3 px-6">Referral Source</th>
                  <th className="py-3 px-6">Informed Consent Status</th>
                  <th className="py-3 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 font-bold text-slate-400">
                      No matching client records found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/40 font-medium"
                    >
                      <td className="py-3.5 px-6 font-bold text-slate-800 dark:text-white">
                        {s.registration_number.toUpperCase()}
                      </td>
                      <td className="py-3.5 px-6">{s.name}</td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {s.department} (Sem {s.semester})
                      </td>
                      <td className="py-3.5 px-6 font-semibold">
                        {s.referral_source || 'Self-Referral'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`px-2.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                            s.informed_consent_signed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-105 text-red-700 animate-pulse'
                          }`}
                        >
                          {s.informed_consent_signed ? 'Signed & Verified' : 'Missing Consent'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleConsentToggle(s)}
                          className={`px-3 py-1 font-bold rounded-lg text-[10px] cursor-pointer border transition ${
                            s.informed_consent_signed
                              ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                              : 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {s.informed_consent_signed ? 'Revoke Consent' : 'Approve Consent'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
