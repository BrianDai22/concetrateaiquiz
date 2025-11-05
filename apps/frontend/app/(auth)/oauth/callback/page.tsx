'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refetchUser } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Processing login...');

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get('error');
      const success = searchParams.get('success');

      if (error) {
        setStatus('error');
        setMessage(decodeURIComponent(error));
        // Redirect to login after showing error
        setTimeout(() => {
          router.push(`/login?error=${error}`);
        }, 2000);
        return;
      }

      if (success === 'true') {
        try {
          setStatus('success');
          setMessage('Login successful! Redirecting...');

          // Cookies are already set by backend
          // Refetch user data to update AuthContext before redirecting
          // This ensures user info (name, email, ID) is available immediately on the dashboard
          await refetchUser();

          // Fetch user data directly to get role for redirect
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v0/auth/me`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to fetch user');
          }

          const userData = await response.json();

          // Redirect based on role from fresh data
          // Small delay to show success message
          setTimeout(() => {
            if (userData.user && userData.user.role) {
              router.push(`/${userData.user.role}/dashboard`);
            } else {
              router.push('/login');
            }
          }, 1000);
        } catch (err) {
          setStatus('error');
          setMessage('Failed to fetch user data. Redirecting to login...');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      } else {
        // No success or error param - something went wrong
        setStatus('error');
        setMessage('Invalid callback. Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only run when URL params change, not when refetchUser updates

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="text-center">
        {status === 'processing' && (
          <div className="animate-pulse">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-mono text-neutral-700">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-mono text-neutral-700">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-lg font-mono text-red-500">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="animate-pulse">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-mono text-neutral-700">Loading...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
