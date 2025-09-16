import * as React from 'react';
import PlayingCard from './PlayingCard';

type TrickCard = { card: any; playerId?: string; playerName?: string };

export default function PlayAreaMobile({ cards }: { cards: TrickCard[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => {
      const row = el.querySelector<HTMLDivElement>('[data-row]');
      if (!row) { setScale(1); return; }
      const rowRect = row.getBoundingClientRect();
      const wrapRect = el.getBoundingClientRect();
      const needed = rowRect.width + 8; // a little breathing room
      const available = wrapRect.width - 12; // account for padding/gap
      const s = Math.min(1, Math.max(0.72, available / Math.max(needed, 1)));
      setScale(Number.isFinite(s) ? s : 1);
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [cards?.length]);

  return (
    <div ref={ref} className="rounded-xl ring-1 ring-white/5">
      <div data-row className="m-trick-row" style={{ transform: `scale(${scale})` }}>
        {cards?.map((p, i) => (
          <div
            key={p.card?.id || p.card?.code || `${p.playerId}-${i}`}
            data-play-card={p.card?.id || p.card?.code}
            className="card-ux m-trick-card flex items-center justify-center"
          >
            <PlayingCard card={p.card} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
