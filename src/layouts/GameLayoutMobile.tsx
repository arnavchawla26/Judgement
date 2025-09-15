import React from 'react';

export default function GameLayoutMobile({ Header, Center, Footer, Extras }: {
  Header: React.ReactNode;
  Center: React.ReactNode;
  Footer?: React.ReactNode;
  Extras?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="mx-auto w-full max-w-[960px] px-3 grid grid-rows-[auto,1fr,auto] gap-3">
        <div className="sticky top-2 z-30 flex items-center justify-between gap-2">
          {Header}
          {Extras}
        </div>
        <div className="relative flex items-center justify-center rounded-xl" style={{ ['--tableCardW' as any]: 'clamp(78px, 9vh, 120px)' }}>
          {Center}
        </div>
        <div className="pb-[calc(12px+env(safe-area-inset-bottom))]">
          <div style={{ ['--cardW' as any]: 'clamp(56px, 9vw, 92px)' }}>
            {Footer}
          </div>
        </div>
      </div>
    </div>
  );
}

