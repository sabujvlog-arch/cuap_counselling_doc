'use client';

import React, { useEffect, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

const DashboardAdmin = lazy(() => import('@/components/DashboardAdmin'));

export default function AdminDashboardPage() {
  const { role, user, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (role !== 'admin' && role !== 'super-admin') {
        if (role === 'student') {
          router.push('/student/dashboard');
        } else if (role === 'provider' || role === 'clinician' || role === 'dept-head') {
          router.push('/counselor/dashboard');
        } else {
          router.push('/');
        }
      }
    }
  }, [role, isAuthenticated, loading, router]);

  const isAdmin = role === 'admin' || role === 'super-admin';

  if (loading || !isAuthenticated || !isAdmin) {
    return <LoadingSpinner fullPage label="Loading Admin Portal..." size="lg" />;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner fullPage label="Loading layout..." size="lg" />}>
        <DashboardAdmin onLogout={handleLogout} adminUsername={user?.username ?? ''} />
      </Suspense>
    </ErrorBoundary>
  );
}
