import React, { useState } from 'react';
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
}

export const BiddingInterface: React.FC<BiddingInterfaceProps> = ({
  maxBid,
  onBid,
  disabled = false,
  className,
  disallowSumEquals = false,
  disallowedBid = null,
}) => {
  const [selectedBid, setSelectedBid] = useState<number>(0);

  const handleBidChange = (delta: number) => {
    setSelectedBid(prev => Math.max(0, Math.min(maxBid, prev + delta)));
  };

  const isBidAllowed = !(
    disallowSumEquals && disallowedBid !== null && selectedBid === disallowedBid
  );

  const handleSubmitBid = () => {
    if (!isBidAllowed) return;
    onBid(selectedBid);
  };

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
            className={cn(
              'bid-button w-10 h-10 p-0',
              selectedBid === i && 'selected'
            )}
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
