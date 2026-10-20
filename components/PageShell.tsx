'use client';

import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

export default function PageShell({
  children,
  onPromote,
  hideFooter,
}: {
  children: React.ReactNode;
  onPromote?: () => void;
  hideFooter?: boolean;
}) {
  return (
    <div className="min-h-screen bg-discord-darker pb-20 sm:pb-8">
      <SiteHeader onPromote={onPromote} />
      {children}
      {!hideFooter && <SiteFooter />}
    </div>
  );
}