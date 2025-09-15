import React from 'react';
import { Suit } from '@/types/game';
import { cn } from '@/lib/utils';

interface TrumpIndicatorProps {
  trumpSuit: Suit;
  className?: string;
}

const suitSymbols: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitNames: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

const suitColors: Record<Suit, string> = {
  hearts: 'suit-red',
  diamonds: 'suit-red',
  clubs: 'suit-black',
  spades: 'suit-black',
};

export const TrumpIndicator: React.FC<TrumpIndicatorProps> = ({
  trumpSuit,
  className,
}) => {
  return (
    <div
      className={cn(
        'trump-card rounded-xl p-4 flex flex-col items-center gap-2 min-w-24',
        'animate-trump-glow',
        className
      )}
    >
      <div className="text-xs font-semibold text-trump-glow uppercase tracking-wide">
        Trump
      </div>
      
      <div className={cn('text-6xl leading-none', suitColors[trumpSuit])}>
        {suitSymbols[trumpSuit]}
      </div>
      
      <div className={cn('text-sm font-medium', suitColors[trumpSuit])}>
        {suitNames[trumpSuit]}
      </div>
    </div>
  );
};

export default TrumpIndicator;