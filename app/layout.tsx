import type { Metadata } from 'next';
import './globals.css';
import { MusicPlayerProvider } from '@/components/MusicPlayerContext';
import MiniPlayer from '@/components/MiniPlayer';
import { AuthProvider } from '@/components/AuthProvider';
import AuthGate from '@/components/AuthGate';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Discord Promo Hub',
  description: 'Login required · Promote Discord servers, chat, follow, music',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <AuthGate>
            <MusicPlayerProvider>
              {children}
              <BottomNav />
              <MiniPlayer />
            </MusicPlayerProvider>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
