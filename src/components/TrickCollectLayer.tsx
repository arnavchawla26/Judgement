import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Play = { playerId: string; card: { code: string } };

type Props = {
  // when a hand resolves, pass the trick + winner + a start timestamp
  trigger?: { trick: Play[]; winnerId: string; startedAt: number };
  onDone?: () => void;
};

export default function TrickCollectLayer({ trigger, onDone }: Props) {
  const [clones, setClones] = useState<Array<{
    key: string;
    from: DOMRect;
    to: DOMRect;
  }>>([]);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!trigger) return;

    // ✅ FIXED: backticks + proper selector string
    const target = document.querySelector<HTMLElement>(
      `[data-player-anchor="${trigger.winnerId}"]`
    );
    if (!target) return;

    const targetRect = target.getBoundingClientRect();
    const plays = trigger.trick ?? [];
    const next: typeof clones = [];

    for (const p of plays) {
      // ✅ Tag your table cards with data-play-card="A♣" (or whatever stable code/id you use)
      const el = document.querySelector<HTMLElement>(
        `[data-play-card="${p.card.code}"]`
      );
      if (!el) continue;
      next.push({
        key: `${p.playerId}-${p.card.code}-${trigger.startedAt}`,
        from: el.getBoundingClientRect(),
        to: targetRect,
      });
    }
    setClones(next);

    const t = setTimeout(() => {
      if (!doneRef.current) onDone?.();
    }, 650);
    return () => clearTimeout(t);
  }, [trigger, onDone]);

  return (
    <AnimatePresence>
      {clones.map(({ key, from, to }) => {
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        return (
          <motion.div
            key={key}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: dx, y: dy, opacity: 0.85, scale: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              position: 'fixed',
              left: from.left,
              top: from.top,
              width: from.width,
              height: from.height,
              zIndex: 60, // above table, below modals
              pointerEvents: 'none',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,.35)',
              background: 'var(--card-bg, #fff)',
            }}
            onAnimationComplete={() => {
              doneRef.current = true;
              onDone?.();
            }}
          >
            {/* simple back for the flight */}
            <div className="w-full h-full rounded-xl bg-white/90" />
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
