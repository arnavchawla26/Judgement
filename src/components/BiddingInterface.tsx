import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';

interface BiddingInterfaceProps {
  maxBid: number;
  onBid: (bid: number) => void;
  disabled?: boolean;
  className?: string;
  // House rule: last bidder cannot make sum of bids == hand size
  disallowSumEquals?: boolean;
  disallowedBid?: number | null; // When disallowSumEquals and user is last bidder
  variant?: 'dialog' | 'bottomSheet' | 'keypadTall';
}

export const BiddingInterface: React.FC<BiddingInterfaceProps> = ({
  maxBid,
  onBid,
  disabled = false,
  className,
  disallowSumEquals = false,
  disallowedBid = null,
  variant = 'dialog',
}) => {
  const [selectedBid, setSelectedBid] = useState<number | null>(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener?.('change', on) ?? mq.addListener(on);
    on();
    return () => mq.removeEventListener?.('change', on) ?? mq.removeListener(on);
  }, []);

  const handleBidChange = (delta: number) => {
    setSelectedBid(prev => {
      const base = typeof prev === 'number' ? prev : 0;
      return Math.max(0, Math.min(maxBid, base + delta));
    });
  };

  const isBidAllowed = !(
    disallowSumEquals && disallowedBid !== null && selectedBid !== null && selectedBid === disallowedBid
  );

  const handleSubmitBid = () => {
    if (!isBidAllowed || selectedBid === null) return;
    onBid(selectedBid);
  };

  // Mobile keypadTall variant
  if (isMobile && variant === 'keypadTall') {
    const numbers = Array.from({ length: Math.min(11, maxBid + 1) }, (_, i) => i);
    return (
      <div className="safe-bottom fixed left-0 right-0 bottom-0 z-50 ui-surface px-4 pt-3 pb-3">
        <div className="text-center mb-2" style={{ color: 'var(--muted)' }}>Select your bid</div>
        <div className="grid grid-cols-4 gap-2">
          {numbers.map(n => (
            <button key={n}
              className={cn('ui-chip py-3', selectedBid === n && 'ring-2')}
              style={selectedBid === n ? { boxShadow: '0 0 0 2px var(--ring) inset' } : undefined}
              onClick={() => setSelectedBid(n)}
              disabled={disabled || (disallowSumEquals && disallowedBid !== null && n === disallowedBid)}
            >{n}</button>
          ))}
          <button className="ui-chip py-3" onClick={() => setSelectedBid(null)}>Clear</button>
        </div>
        <button
          onClick={handleSubmitBid}
          disabled={disabled || selectedBid === null || !isBidAllowed}
          className="btn-pulse mt-3 w-full rounded-xl py-3 font-semibold text-black disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', boxShadow: '0 10px 26px rgba(60,199,183,.32)' }}
        >
          Confirm Bid: {selectedBid ?? '—'}
        </button>
      </div>
    );
  }

  // Mobile bottom sheet (stepper) fallback
  if (isMobile && variant !== 'dialog') {
    return (
      <div className="safe-bottom fixed left-0 right-0 bottom-0 z-50 ui-surface px-4 pt-3 pb-3">
        <div className="text-center text-sm font-semibold mb-1">Place Your Bid</div>
        <div className="flex items-center justify-center gap-5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBidChange(-1)}
            disabled={disabled || (selectedBid ?? 0) === 0}
            className="ui-chip"
          >
            −
          </Button>
          <div className="w-10 text-center text-2xl font-extrabold">{selectedBid ?? 0}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBidChange(1)}
            disabled={disabled || (selectedBid ?? 0) === maxBid}
            className="ui-chip"
          >
            +
          </Button>
        </div>
        <button
          onClick={handleSubmitBid}
          disabled={disabled || selectedBid === null || !isBidAllowed}
          className="btn-pulse mt-2 w-full rounded-xl text-black font-semibold py-3 disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg, var(--primary), var(--accent))', boxShadow:'0 10px 26px rgba(124,92,255,.35)' }}
        >
          Confirm Bid: {selectedBid ?? '—'}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'score-display rounded-lg p-6 flex flex-col items-center gap-4 w-80',
        className
      )}
    >
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground mb-1">
          Place Your Bid
        </h3>
        <p className="text-sm text-muted-foreground">
          How many hands will you win?
        </p>
      </div>

      {/* Bid selector */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBidChange(-1)}
          disabled={disabled || selectedBid === 0}
          className="w-10 h-10 p-0"
        >
          <Minus className="w-4 h-4" />
        </Button>

        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold text-primary mb-1">
            {selectedBid}
          </div>
          <div className="text-xs text-muted-foreground">
            hands
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBidChange(1)}
          disabled={disabled || selectedBid === maxBid}
          className="w-10 h-10 p-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick bid buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {Array.from({ length: maxBid + 1 }, (_, i) => (
          <Button
            key={i}
            variant={selectedBid === i ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedBid(i)}
            disabled={disabled || (disallowSumEquals && disallowedBid !== null && i === disallowedBid)}
            className={cn('bid-button w-10 h-10 p-0', selectedBid === i && 'selected')}
          >
            {i}
          </Button>
        ))}
      </div>

      {/* Submit button */}
      <Button
        onClick={handleSubmitBid}
        disabled={disabled || !isBidAllowed}
        className="w-full animate-bounce-in"
        size="lg"
      >
        Confirm Bid: {selectedBid}
      </Button>
      {disallowSumEquals && disallowedBid !== null && (
        <div className="text-xs text-muted-foreground text-center">
          You cannot bid {disallowedBid} as the last bidder.
        </div>
      )}
    </div>
  );
};

export default BiddingInterface;
