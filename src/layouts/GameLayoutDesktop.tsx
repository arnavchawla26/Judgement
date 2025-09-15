import React from 'react';

export default function GameLayoutDesktop({ Header, Center, Footer, Extras }: {
  Header: React.ReactNode;
  Center: React.ReactNode;
  Footer?: React.ReactNode;
  Extras?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-8 grid grid-rows-[auto,1fr,auto] gap-4 md:gap-6">
        <div className="flex items-start justify-between gap-4">
          {Header}
          {Extras}
        </div>
        <div className="relative flex items-center justify-center rounded-2xl" style={{ ['--tableCardW' as any]: 'clamp(96px, 9.5vh, 140px)' }}>
          {Center}
        </div>
        <div className="pb-[env(safe-area-inset-bottom)]">
          <div style={{ ['--cardW' as any]: 'clamp(72px, 6.2vw, 104px)' }}>
            {Footer}
          </div>
        </div>
      </div>
    </div>
  );
}

