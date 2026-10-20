'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

const PUBLIC_PATHS = ['/login', '/auth/callback'];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + '/')
  );

  useEffect(() => {
    if (loading) return;

    // Not logged in → only login page allowed
    if (!user && !isPublic) {
      router.replace('/login');
      return;
    }

    // Already logged in on login page → go home
    if (user && path === '/login') {
      router.replace('/');
    }
  }, [user, loading, path, isPublic, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-discord-darker">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-discord-blurple border-t-transparent" />
      </div>
    );
  }

  // Block flash of protected content
  if (!user && !isPublic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-discord-darker">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-discord-blurple border-t-transparent" />
      </div>
    );
  }

  if (user && path === '/login') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-discord-darker">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-discord-blurple border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
