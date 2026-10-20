import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Discord Promo Hub | Promote Your Server & Website',
  description: 'Free platform to promote Discord servers and websites. Grow your community today!',
  keywords: ['discord', 'promotion', 'server', 'advertise', 'community'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}