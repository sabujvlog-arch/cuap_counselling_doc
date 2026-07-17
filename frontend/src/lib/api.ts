const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
    headers
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

  // Auth Operations
  auth: {
    login: async (credentials: { username: string; password?: string }) => {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      // Do not save token if 2FA verification is required
      if (data.token && !data.requires2FA) setToken(data.token);
      return data;
    },
    verify2FA: async (username: string, otpCode: string) => {
      const data = await request('/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ username, otpCode })
      });
      if (data.token) setToken(data.token);
      return data;
    },
    me: () => request('/auth/me'),
    changePassword: (passwords: any) => request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords)
    }),
    createProvider: (provider: any) => request('/admin/providers', {
      method: 'POST',
      body: JSON.stringify(provider)
    }),
    createStudent: (student: any) => request('/admin/students', {
      method: 'POST',
      body: JSON.stringify(student)
    }),
    forgotPassword: (username: string) => request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ username })
    }),
    resetPassword: (payload: any) => request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    publicChat: (message: string, history: any[]) => request('/public/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    }),
    studentChat: (message: string, history: any[]) => request('/student/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    })
  },

  // Appointment Operations
  appointments: {
    book: (booking: any) => request('/appointments', {
      method: 'POST',
      body: JSON.stringify(booking)
    }),
    list: (filters: { status?: string; date?: string } = {}) => {
      const params = new URLSearchParams(filters as any).toString();
      return request(`/appointments?${params}`);
    },
    listAll: () => request('/appointments'), // No date filter – all appointments for current role
    updateStatus: (id: number, statusData: any) => request(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData)
    }),
    getAvailableSlots: (providerId: number, date: string) => 
      request(`/appointments/available-slots?providerId=${providerId}&date=${date}`),
    verifyQR: (qrCode: string) => request('/appointments/verify-qr', {
      method: 'POST',
      body: JSON.stringify({ qrCode })
    })
  },

  // Providers list (for student booking)
  providers: {
    list: () => request('/providers')
  },

  // EMR & Session Operations
  clinical: {
    saveSession: (session: any) => request('/clinical/sessions', {
      method: 'POST',
      body: JSON.stringify(session)
    }),
    getSession: (id: number) => request(`/clinical/sessions/${id}`),
    getSessionVersions: (id: number) => request(`/clinical/sessions/${id}/versions`),
    getEMR: (studentId: number) => request(`/clinical/emr/student/${studentId}`),
    
    // AI Copilot Clinical features
    aiAssist: (type: string, payload: any) => request('/clinical/ai-assist', {
      method: 'POST',
      body: JSON.stringify({ type, ...payload })
    }),

    // Mental State Examination
    saveMSE: (mse: any) => request('/clinical/mse', {
      method: 'POST',
      body: JSON.stringify(mse)
    }),
    getMSELogs: (studentId: number) => request(`/clinical/mse/student/${studentId}`),
    getMSEPrintUrl: (id: number) => {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
      return `${base}/api/clinical/mse/${id}/print`;
    },

    // Child Case History
    saveChildCaseHistory: (cch: any) => request('/clinical/child-case-history', {
      method: 'POST',
      body: JSON.stringify(cch)
    }),
    getChildCaseHistories: (studentId: number) => request(`/clinical/child-case-history/student/${studentId}`),
    getChildCaseHistoryPrintUrl: (id: number) => {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
      return `${base}/api/clinical/child-case-history/${id}/print`;
    },

    // Prescriptions
    createPrescription: (prescription: any) => request('/clinical/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescription)
    }),
    getPrescription: (id: number) => request(`/clinical/prescriptions/${id}`),
    getPrintUrl: (id: number) => {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
      return `${base}/api/clinical/prescriptions/${id}/print`;
    }
  },

  // Messaging Operations
  messages: {
    send: (msg: any) => request('/messages', {
      method: 'POST',
      body: JSON.stringify(msg)
    }),
    conversations: () => request('/messages/conversations'),
    history: (otherUserId: number) => request(`/messages/history/${otherUserId}`),
    markAsRead: (otherUserId: number) => request(`/messages/read/${otherUserId}`, {
      method: 'POST'
    }),
    contacts: () => request('/messages/contacts')
  },

  // Document Operations
  documents: {
    upload: (doc: { studentId: number; category: string; fileName: string; fileData: string }) => request('/documents/upload', {
      method: 'POST',
      body: JSON.stringify(doc)
    }),
    list: (filters: { studentId?: number; category?: string } = {}) => {
      const params = new URLSearchParams(filters as any).toString();
      return request(`/documents?${params}`);
    },
    downloadUrl: (id: number) => {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
      return `${base}/api/documents/download/${id}`;
    },
    delete: (id: number) => request(`/documents/${id}`, {
      method: 'DELETE'
    })
  },

  // Assessments Operations
  assessments: {
    submit: (survey: { studentId: number; type: string; answers: Record<string, number> }) => request('/assessments', {
      method: 'POST',
      body: JSON.stringify(survey)
    }),
    list: (studentId?: number) => {
      const param = studentId ? `?studentId=${studentId}` : '';
      return request(`/assessments${param}`);
    },
    details: (id: number) => request(`/assessments/${id}`)
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
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
      return `${base}/api/admin/opd-register/export${param}`;
    },
    auditLogs: () => request('/admin/audit-logs'),
    backup: () => request('/admin/backup', { method: 'POST' }),
    restore: (fileName: string) => request('/admin/restore', {
      method: 'POST',
      body: JSON.stringify({ fileName })
    }),
    announcements: () => request('/admin/announcements'),
    createAnnouncement: (message: string) => request('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ message })
    }),
    listStudents: () => request('/admin/students'),
    updateStudent: (id: number, payload: any) => request(`/admin/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
    deleteStudent: (id: number) => request(`/admin/students/${id}`, {
      method: 'DELETE'
    })
  }
};
