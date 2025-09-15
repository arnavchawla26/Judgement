import React from 'react';

export function HandLayout({ cards, renderCard }: { cards: any[]; renderCard: (c: any) => React.ReactNode }) {
  return (
    <div
      className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-5 xs:grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 place-items-center px-2"
      style={{ ['--cardW' as any]: 'clamp(56px, 9vw, 96px)' }}
    >
      {cards.map((c: any, idx: number) => (
        <div key={(c.id || c.code || idx) as React.Key} className="flex items-center justify-center">
          {renderCard(c)}
        </div>
      ))}
    </div>
  );
}

export default HandLayout;

