import { DEMO_USERS } from '@/config/demoUsers';
import tempCredentials from '@/config/tempCredentials.json';

const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

const API_BASE = getApiBase();

// Safe localStorage access
const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('cuap_wccms_token');
  }
  return null;
};

const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cuap_wccms_token', token);
  }
};

const clearToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cuap_wccms_token');
  }
};

// Generic fetch wrapper
const request = async (url: string, options: RequestInit = {}) => {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return response.text();
  }

  return response.json();
};

export const api = {
  getToken,
  setToken,
  clearToken,

  get: (url: string, options?: RequestInit) => request(url, { ...options, method: 'GET' }),
  post: (url: string, body?: any, options?: RequestInit) =>
    request(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (url: string, body?: any, options?: RequestInit) =>
    request(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: (url: string, options?: RequestInit) => request(url, { ...options, method: 'DELETE' }),

  // Auth Operations
  auth: {
    login: async (credentials: { username: string; password?: string }): Promise<any> => {
      try {
        const res = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });
        if (res && res.token) {
          setToken(res.token);
          return { success: true, token: res.token, requires2FA: false };
        }
      } catch (err: any) {
        // Fallback to DEMO_USERS / student ID mock auth
        const usernameLower = (credentials.username || '').toLowerCase().trim();

        if (usernameLower === tempCredentials.admin.username.toLowerCase()) {
          if (credentials.password === tempCredentials.admin.password) {
            const mockToken = `mock-jwt-for-${tempCredentials.admin.username}`;
            setToken(mockToken);
            return { success: true, token: mockToken, requires2FA: false };
          }
        } else if (usernameLower === tempCredentials.counselor.username.toLowerCase()) {
          if (credentials.password === tempCredentials.counselor.password) {
            const mockToken = `mock-jwt-for-${tempCredentials.counselor.username}`;
            setToken(mockToken);
            return { success: true, token: mockToken, requires2FA: false };
          }
        } else {
          // Student fallback: Username = Password (Student ID = Student ID)
          if (
            credentials.username &&
            credentials.password &&
            credentials.username.toUpperCase().trim() === credentials.password.toUpperCase().trim()
          ) {
            const mockToken = `mock-jwt-for-${credentials.username.trim()}`;
            setToken(mockToken);
            return { success: true, token: mockToken, requires2FA: false };
          }
        }
        throw new Error(err.message || 'Invalid username or password.');
      }
    },
    verify2FA: async (username: string, otpCode: string) => {
      const mockToken = `mock-jwt-for-${username}`;
      setToken(mockToken);
      return { success: true, token: mockToken };
    },
    me: async () => {
      const token = getToken();
      if (token && token.startsWith('mock-jwt-for-')) {
        const username = token.replace('mock-jwt-for-', '');
        const matched = DEMO_USERS.find((u) => u.username.toLowerCase() === username.toLowerCase());
        if (matched) {
          return {
            user: matched.user,
            profile: matched.profile,
          };
        }

        // Dynamic student profile generation for custom fallback logins
        const isHosteller = username.toUpperCase().includes('EC'); // Mock check for demo profiles
        return {
          user: {
            id: 999,
            username: username,
            role: 'student',
            email: `${username.toLowerCase()}@cuap.edu.in`,
            phone: '+919999999999',
          },
          profile: {
            id: 999,
            user_id: 999,
            registration_number: username,
            name: `Student ${username.toUpperCase()}`,
            age: 21,
            gender: 'Male',
            dob: '2005-06-15',
            department: 'Computer Science',
            semester: 'Semester VI',
            phone: '+919999999999',
            email: `${username.toLowerCase()}@cuap.edu.in`,
            hostel_scholar: isHosteller ? 'Hosteller' : 'Day Scholar',
            student_type: isHosteller ? 'hosteller' : 'day_scholar',
            emergency_contact: 'Guardian',
            emergency_phone: '+919999999999',
            blood_group: 'O+',
            address: 'CUAP Campus',
            informed_consent_signed: true,
            consent_date: new Date().toISOString(),
          },
        };
      }
      return request('/auth/me');
    },
    changePassword: (passwords: any) =>
      request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(passwords),
      }),
    createProvider: (provider: any) =>
      request('/admin/providers', {
        method: 'POST',
        body: JSON.stringify(provider),
      }),
    createStudent: (student: any) =>
      request('/admin/students', {
        method: 'POST',
        body: JSON.stringify(student),
      }),
    forgotPassword: (username: string) =>
      request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ username }),
      }),
    resetPassword: (payload: any) =>
      request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    publicChat: (message: string, history: any[]) =>
      request('/public/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      }),
    studentChat: (message: string, history: any[]) =>
      request('/student/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      }),
    getPermissions: () => request('/auth/permissions'),
  },

  // Appointment Operations
  appointments: {
    book: (booking: any) =>
      request('/appointments', {
        method: 'POST',
        body: JSON.stringify(booking),
      }),
    list: (filters: { status?: string; date?: string } = {}) => {
      const params = new URLSearchParams(filters as any).toString();
      return request(`/appointments?${params}`);
    },
    listAll: () => request('/appointments'), // No date filter – all appointments for current role
    updateStatus: (id: number, statusData: any) =>
      request(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(statusData),
      }),
    getAvailableSlots: (providerId: number, date: string) =>
      request(`/appointments/available-slots?providerId=${providerId}&date=${date}`),
    verifyQR: (qrCode: string) =>
      request('/appointments/verify-qr', {
        method: 'POST',
        body: JSON.stringify({ qrCode }),
      }),
    getCounselorSettings: (providerId: number) =>
      request(`/counselor/settings?providerId=${providerId}`),
    updateCounselorSettings: (payload: any) =>
      request('/counselor/settings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    bookOnBehalf: (payload: any) =>
      request('/appointments/book-on-behalf', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    registerEmergency: (payload: any) =>
      request('/appointments/emergency', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    registerSpot: (payload: any) =>
      request('/appointments/spot', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    scheduleFollowUp: (payload: any) =>
      request('/appointments/follow-up', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Providers list (for student booking)
  providers: {
    list: () => request('/providers'),
  },

  // EMR & Session Operations
  clinical: {
    saveSession: (session: any) =>
      request('/clinical/sessions', {
        method: 'POST',
        body: JSON.stringify(session),
      }),
    getSession: (id: number) => request(`/clinical/sessions/${id}`),
    getSessionVersions: (id: number) => request(`/clinical/sessions/${id}/versions`),
    getEMR: (studentId: number) => request(`/clinical/emr/student/${studentId}`),
    getAllAssessments: () => request('/clinical/assessments'),
    getGeneratedReports: () => request('/clinical/generated-reports'),
    toggleReportVisibility: (type: string, id: number, is_released: boolean) =>
      request(`/clinical/reports/${type}/${id}/release`, {
        method: 'POST',
        body: JSON.stringify({ is_released }),
      }),

    // AI Copilot Clinical features
    aiAssist: (type: string, payload: any) =>
      request('/clinical/ai-assist', {
        method: 'POST',
        body: JSON.stringify({ type, ...payload }),
      }),

    // Mental State Examination
    saveMSE: (mse: any) =>
      request('/clinical/mse', {
        method: 'POST',
        body: JSON.stringify(mse),
      }),
    getMSELogs: (studentId: number) => request(`/clinical/mse/student/${studentId}`),
    getMSEPrintUrl: (id: number) => {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(
        /\/api$/,
        '',
      );
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      return `${base}/api/clinical/mse/${id}/print${token ? `?token=${token}` : ''}`;
    },

    // Case History
    saveCaseHistory: (cch: any) =>
      request('/clinical/case-history', {
        method: 'POST',
        body: JSON.stringify(cch),
      }),
    getCaseHistories: (studentId: number) => request(`/clinical/case-history/student/${studentId}`),
    getCaseHistoryPrintUrl: (id: number) => {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(
        /\/api$/,
        '',
      );
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      return `${base}/api/clinical/case-history/${id}/print${token ? `?token=${token}` : ''}`;
    },

    // Prescriptions
    createPrescription: (prescription: any) =>
      request('/clinical/prescriptions', {
        method: 'POST',
        body: JSON.stringify(prescription),
      }),
    getPrescription: (id: number) => request(`/clinical/prescriptions/${id}`),
    getPrintUrl: (id: number) => {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(
        /\/api$/,
        '',
      );
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      return `${base}/api/clinical/prescriptions/${id}/print${token ? `?token=${token}` : ''}`;
    },

    // Investigations & Compiled Report Actions
    orderTest: (payload: any) =>
      request('/clinical/tests', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getPendingTests: () => request('/clinical/tests/pending'),
    submitTestResults: (id: number, payload: any) =>
      request(`/clinical/tests/${id}/results`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getStudentTests: (studentId: number) => request(`/clinical/tests/student/${studentId}`),
    getCompiledReportUrl: (id: number) => {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(
        /\/api$/,
        '',
      );
      return `${base}/api/clinical/sessions/${id}/compiled-report`;
    },
    cosignSession: (id: number) =>
      request(`/clinical/sessions/${id}/cosign`, {
        method: 'POST',
      }),
    getHighRiskSessions: () => request('/clinical/sessions/high-risk/pending'),
  },

  // Messaging Operations
  messages: {
    send: (msg: any) =>
      request('/messages', {
        method: 'POST',
        body: JSON.stringify(msg),
      }),
    conversations: () => request('/messages/conversations'),
    history: (otherUserId: number) => request(`/messages/history/${otherUserId}`),
    markAsRead: (otherUserId: number) =>
      request(`/messages/read/${otherUserId}`, {
        method: 'POST',
      }),
    contacts: () => request('/messages/contacts'),
  },

  // Document Operations
  documents: {
    upload: (doc: { studentId: number; category: string; fileName: string; fileData: string }) =>
      request('/documents/upload', {
        method: 'POST',
        body: JSON.stringify(doc),
      }),
    list: (filters: { studentId?: number; category?: string } = {}) => {
      const params = new URLSearchParams(filters as any).toString();
      return request(`/documents?${params}`);
    },
    downloadUrl: (id: number) => {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(
        /\/api$/,
        '',
      );
      return `${base}/api/documents/download/${id}`;
    },
    delete: (id: number) =>
      request(`/documents/${id}`, {
        method: 'DELETE',
      }),
    submitConsent: (payload: { signature: string; date: string }) =>
      request('/student/consent', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Assessments Operations
  assessments: {
    submit: (survey: { studentId: number; type: string; answers: Record<string, number> }) =>
      request('/assessments', {
        method: 'POST',
        body: JSON.stringify(survey),
      }),
    list: (studentId?: number) => {
      const param = studentId ? `?studentId=${studentId}` : '';
      return request(`/assessments${param}`);
    },
    details: (id: number) => request(`/assessments/${id}`),
  },

  // Admin & Analytics Dashboard Operations
  admin: {
    analytics: () => request('/admin/analytics'),
    opdRegister: (date?: string) => {
      const param = date ? `?date=${date}` : '';
      return request(`/admin/opd-register${param}`);
    },
    opdExportUrl: (date?: string) => {
      const param = date ? `?date=${date}` : '';
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(
        /\/api$/,
        '',
      );
      return `${base}/api/admin/opd-register/export${param}`;
    },
    auditLogs: () => request('/admin/audit-logs'),
    backup: () => request('/admin/backup', { method: 'POST' }),
    restore: (fileName: string) =>
      request('/admin/restore', {
        method: 'POST',
        body: JSON.stringify({ fileName }),
      }),
    listBackups: () => request('/admin/backups'),
    deleteBackup: (fileName: string) =>
      request(`/admin/backups/${fileName}`, {
        method: 'DELETE',
      }),
    downloadBackupUrl: (fileName: string) => {
      const token = getToken();
      return `${getApiBase()}/admin/backups/${fileName}/download?token=${token || ''}`;
    },
    sanitizeDatabase: () => request('/admin/sanitize', { method: 'POST' }),
    announcements: () => request('/admin/announcements'),
    createAnnouncement: (message: string) =>
      request('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    updateAnnouncement: (id: number, message: string) =>
      request(`/admin/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ message }),
      }),
    deleteAnnouncement: (id: number) =>
      request(`/admin/announcements/${id}`, {
        method: 'DELETE',
      }),
    listStudents: () => request('/admin/students'),
    createStudent: (payload: any) =>
      request('/admin/students', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateStudent: (id: number, payload: any) =>
      request(`/admin/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    deleteStudent: (id: number) =>
      request(`/admin/students/${id}`, {
        method: 'DELETE',
      }),
  },

  // Student specific simulator operations
  students: {
    toggleAssessments: (payload: { studentId: number; enabled: boolean }) =>
      request('/student/toggle-assessments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
};
