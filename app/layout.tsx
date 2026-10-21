import type { Metadata } from 'next';
import './globals.css';
import { MusicPlayerProvider } from '@/components/MusicPlayerContext';
import MiniPlayer from '@/components/MiniPlayer';
import { AuthProvider } from '@/components/AuthProvider';
import SettingsProvider from '@/components/SettingsProvider';
import AuthGate from '@/components/AuthGate';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Discord Promo Hub',
  description: 'Login required · Promote Discord servers, chat, follow, music',
};

// Applies the saved theme/animation before first paint (no flash of the default theme).
const INIT_SCRIPT = `(function(){try{var c=JSON.parse(localStorage.getItem('hub-css')||'null');if(!c)return;var d=document.documentElement;for(var k in c.vars){d.style.setProperty(k,c.vars[k]);}if(c.anim){d.setAttribute('data-anim','1');}if(c.dir){d.dir=c.dir;}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <SettingsProvider>
            <AuthGate>
              <MusicPlayerProvider>
                {children}
                <BottomNav />
                <MiniPlayer />
              </MusicPlayerProvider>
            </AuthGate>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
