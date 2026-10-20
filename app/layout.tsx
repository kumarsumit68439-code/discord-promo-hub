import type { Metadata } from 'next';
import './globals.css';
import { MusicPlayerProvider } from '@/components/MusicPlayerContext';
import MiniPlayer from '@/components/MiniPlayer';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Discord Promo Hub',
  description: 'Promote Discord servers & websites. Chat, follow, music.',
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
          <MusicPlayerProvider>
            {children}
            <MiniPlayer />
          </MusicPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}