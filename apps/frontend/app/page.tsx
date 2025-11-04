'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { isLoading } = useAuth();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      if (!isLoading) {
        try {
          // Fetch user data directly to avoid stale state
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v0/auth/me`, {
            credentials: 'include',
          });

          if (response.ok) {
            const userData = await response.json();
            if (userData.user && userData.user.role) {
              // Redirect authenticated users to their dashboard
              router.push(`/${userData.user.role}/dashboard`);
            } else {
              router.push('/login');
            }
          } else {
            // Not authenticated, redirect to login
            router.push('/login');
          }
        } catch (error) {
          // Error fetching user, redirect to login
          router.push('/login');
        }
      }
    };

    checkAuthAndRedirect();
  }, [isLoading, router]);

  // Show loading while checking auth state
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg font-mono text-neutral-700">Loading...</p>
      </div>
    </div>
  );
}
