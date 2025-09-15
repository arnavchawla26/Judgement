import React from 'react';
import { Card, Suit } from '@/types/game';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card?: Card;
  isBack?: boolean;
  isTrump?: boolean;
  isPlayable?: boolean;
  isPlayed?: boolean;
  className?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

const suitSymbols: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<Suit, string> = {
  hearts: 'suit-red',
  diamonds: 'suit-red',
  clubs: 'suit-black',
  spades: 'suit-black',
};

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isBack = false,
  isTrump = false,
  isPlayable = false,
  isPlayed = false,
  className,
  onClick,
  size = 'md',
  style,
}) => {
  const sizeClasses = {
    sm: 'w-12 h-16',
    md: 'w-16 h-24',
    lg: 'w-20 h-28',
  };

  if (isBack || !card) {
    return (
      <div
        className={cn(
          'playing-card card-back rounded-lg overflow-hidden flex items-center justify-center cursor-default select-none',
          sizeClasses[size],
          isTrump && 'trump-card',
          className
        )}
        onClick={onClick}
        style={{ ...(style || {}), width: 'var(--cardW)', aspectRatio: '63/88', touchAction: 'manipulation' }}
      >
        <div className="text-primary/30 text-xs font-bold">♠♥♣♦</div>
      </div>
    );
  }

  const suitColor = suitColors[card.suit];
  const suitSymbol = suitSymbols[card.suit];

  return (
    <div
      className={cn(
        'playing-card rounded-lg overflow-hidden flex flex-col items-center justify-between p-1 cursor-default select-none relative transition-all min-w-12 min-h-16',
        sizeClasses[size],
        isTrump && 'trump-card animate-trump-glow',
        isPlayable && 'cursor-pointer hover:scale-105 hover:-translate-y-2',
        isPlayed && 'opacity-60 scale-95',
        className
      )}
      onClick={onClick}
      style={{ ...(style || {}), width: 'var(--cardW)', aspectRatio: '63/88', touchAction: 'manipulation' }}
    >
      {/* Top left corner */}
      <div className="self-start text-center leading-none">
        <div className={cn('font-bold text-sm', suitColor)}>{card.rank}</div>
        <div className={cn('text-lg leading-none', suitColor)}>{suitSymbol}</div>
      </div>

      {/* Center symbol */}
      <div className={cn('text-4xl', suitColor, size === 'sm' && 'text-2xl')}>
        {suitSymbol}
      </div>

      {/* Bottom right corner (rotated) */}
      <div className="self-end text-center leading-none rotate-180">
        <div className={cn('font-bold text-sm', suitColor)}>{card.rank}</div>
        <div className={cn('text-lg leading-none', suitColor)}>{suitSymbol}</div>
      </div>

      {/* Trump indicator */}
      {isTrump && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-trump-glow rounded-full animate-pulse-glow shadow-lg" />
      )}
    </div>
  );
};

export default PlayingCard;
