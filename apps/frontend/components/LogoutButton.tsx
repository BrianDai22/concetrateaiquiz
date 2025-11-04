'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SecondaryButton } from './ui/Button';

export function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SecondaryButton onClick={handleLogout} disabled={isLoading}>
      {isLoading ? 'Logging out...' : 'Log Out'}
    </SecondaryButton>
  );
}
