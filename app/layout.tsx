import type { Metadata } from 'next';
import './globals.css';
import { MusicPlayerProvider } from '@/components/MusicPlayerContext';
import MiniPlayer from '@/components/MiniPlayer';

export const metadata: Metadata = {
  title: 'Discord Promo Hub | Promote · Music · Profile',
  description:
    'Promote Discord servers & websites, edit your profile, and stream YouTube music.',
  keywords: ['discord', 'promotion', 'youtube', 'music', 'community'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <MusicPlayerProvider>
          {children}
          <MiniPlayer />
        </MusicPlayerProvider>
      </body>
    </html>
  );
}