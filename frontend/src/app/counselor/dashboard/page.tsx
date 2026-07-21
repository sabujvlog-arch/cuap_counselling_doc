'use client';

import React, { useEffect, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

const DashboardProvider = lazy(() => import('@/components/DashboardProvider'));
const DashboardDeptHead = lazy(() => import('@/components/DashboardDeptHead'));

export default function CounselorDashboardPage() {
  const { role, user, profile, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (role !== 'provider' && role !== 'clinician' && role !== 'dept-head') {
        if (role === 'student') {
          router.push('/student/dashboard');
        } else if (role === 'admin' || role === 'super-admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/');
        }
      }
    }
  }, [role, isAuthenticated, loading, router]);

  const isCounselor = role === 'provider' || role === 'clinician' || role === 'dept-head';

  if (loading || !isAuthenticated || !isCounselor) {
    return <LoadingSpinner fullPage label="Loading Counselor Portal..." size="lg" />;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner fullPage label="Loading layout..." size="lg" />}>
        {role === 'dept-head' ? (
          <DashboardDeptHead onLogout={handleLogout} user={user} providerProfile={profile} />
        ) : (
          <DashboardProvider onLogout={handleLogout} user={user} providerProfile={profile} />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
