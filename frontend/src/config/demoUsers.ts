import type { User, StudentProfile, ProviderProfile, UserRole } from '@/types';
import tempCredentials from './tempCredentials.json';

export interface DemoUser {
  username: string;
  passwordHash: string;
  role: UserRole;
  user: User;
  profile: StudentProfile | ProviderProfile | null;
}

export const DEMO_USERS: DemoUser[] = [
  {
    username: tempCredentials.counselor.username,
    passwordHash: tempCredentials.counselor.password,
    role: 'provider',
    user: {
      id: 102,
      username: tempCredentials.counselor.username,
      role: 'provider',
      email: 'counselor01@cuap.edu.in',
      phone: '+919999999902',
    },
    profile: {
      id: 202,
      user_id: 102,
      name: 'Dr. Sarah Connor',
      employee_id: 'EMP101',
      department: 'Wellness Centre',
      qualification: 'PhD in Clinical Psychology',
      specialization: 'Cognitive Behavioral Therapy (CBT)',
      phone: '+919999999902',
      email: 'counselor01@cuap.edu.in',
    },
  },
  {
    username: tempCredentials.admin.username,
    passwordHash: tempCredentials.admin.password,
    role: 'admin',
    user: {
      id: 103,
      username: tempCredentials.admin.username,
      role: 'admin',
      email: 'admin01@cuap.edu.in',
      phone: '+919999999903',
    },
    profile: null,
  },
];
