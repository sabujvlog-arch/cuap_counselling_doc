'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardStudent from '@/components/DashboardStudent';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function StudentDashboardPage() {
  const { role, user, profile, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (role !== 'student') {
        if (role === 'provider' || role === 'clinician' || role === 'dept-head') {
          router.push('/counselor/dashboard');
        } else if (role === 'admin' || role === 'super-admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/');
        }
      }
    }
  }, [role, isAuthenticated, loading, router]);

  if (loading || !isAuthenticated || role !== 'student') {
    return <LoadingSpinner fullPage label="Loading Student Portal..." size="lg" />;
  }

  return (
    <ErrorBoundary>
      <DashboardStudent
        onLogout={() => {
          logout();
          router.push('/');
        }}
        user={user}
        studentProfile={profile}
      />
    </ErrorBoundary>
  );
}
