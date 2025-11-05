'use client';

import React, { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button, SecondaryButton } from '@/components/ui/Button';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Check for OAuth error in URL
  React.useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
  }, [searchParams]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError('');

      // Login using AuthContext which returns the user
      await login(data.email, data.password);

      // Fetch user again to ensure we have latest data
      const response = await fetch(`${API_URL}/api/v0/auth/me`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const userData = await response.json();
      console.log('User data received:', userData); // DEBUG

      // Redirect to role-specific dashboard
      if (userData.user && userData.user.role) {
        router.push(`/${userData.user.role}/dashboard`);
      } else {
        console.error('Response data:', userData); // DEBUG
        throw new Error(`User role not found. Response data: ${JSON.stringify(userData)}`);
      }
    } catch (err) {
      console.error('Login error:', err); // DEBUG
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/v0/auth/oauth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-[52px] font-normal leading-tight text-neutral-700 mb-2 uppercase">
            School Portal
          </h1>
          <p className="text-base text-neutral-600">Log in to your account</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-500 rounded-[2px] p-4">
                <p className="text-sm text-red-500 font-mono">{error}</p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="your.email@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-neutral-600 font-mono uppercase">
                Or
              </span>
            </div>
          </div>

          <SecondaryButton
            type="button"
            onClick={handleGoogleLogin}
            className="w-full"
          >
            Sign in with Google
          </SecondaryButton>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600 font-mono">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="text-primary hover:underline"
              >
                Register
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="animate-pulse">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-mono text-neutral-700">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
