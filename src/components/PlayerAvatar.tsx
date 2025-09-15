import React from 'react';
import { Player } from '@/types/game';
import { cn } from '@/lib/utils';
import { Crown, User } from 'lucide-react';

interface PlayerAvatarProps {
  player: Player;
  position: 'top' | 'bottom' | 'left' | 'right';
  showCards?: boolean;
  showBid?: boolean;
  showScore?: boolean;
  className?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  position,
  showCards = true,
  showBid = true,
  showScore = true,
  className,
}) => {
  const isVertical = position === 'left' || position === 'right';
  
  return (
    <div
      data-player-anchor={player.id}
      className={cn(
        'flex items-center gap-3',
        isVertical ? 'flex-col' : 'flex-row',
        position === 'top' && 'flex-col-reverse',
        position === 'left' && 'flex-row',
        position === 'right' && 'flex-row-reverse',
        className
      )}
    >
      {/* Player info */}
      <div
        className={cn(
          'flex items-center gap-2',
          isVertical ? 'flex-col' : 'flex-row'
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'player-avatar rounded-full w-12 h-12 flex items-center justify-center relative',
            player.isActive && 'active animate-pulse-glow',
            player.isDealer && 'ring-2 ring-primary'
          )}
        >
          {player.avatar ? (
            <img
              src={player.avatar}
              alt={player.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-secondary-foreground" />
          )}
          
          {/* Dealer indicator */}
          {player.isDealer && (
            <Crown className="absolute -top-2 -right-2 w-4 h-4 text-primary" />
          )}
          {/* Connection indicator */}
          {player.connected === false && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-red-500 ring-1 ring-black/40" title="Disconnected" />
          )}
          {player.connected && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-1 ring-black/40" title="Connected" />
          )}
        </div>

        {/* Player name and stats */}
        <div
          className={cn(
            'text-center',
            isVertical ? 'text-xs' : 'text-sm'
          )}
        >
          <div className="font-semibold text-foreground truncate max-w-16">
            {player.name}
          </div>
          
          {showScore && (
            <div className="text-xs text-muted-foreground">
              Score: {player.score}
            </div>
          )}
          
          {showBid && player.bid !== undefined && (
            <div className="text-xs text-primary font-semibold">
              Bid: {player.bid}
            </div>
          )}
        </div>
      </div>

      {/* Cards indicator */}
      {showCards && player.cards.length > 0 && (
        <div className="flex -space-x-2">
          {Array.from({ length: Math.min(player.cards.length, 5) }).map((_, i) => (
            <div
              key={i}
              className="w-6 h-8 bg-card-back rounded-sm border border-border shadow-sm"
              style={{
                transform: `rotate(${(i - 2) * 3}deg)`,
                zIndex: i,
              }}
            />
          ))}
          {player.cards.length > 5 && (
            <div className="w-6 h-8 flex items-center justify-center text-xs text-muted-foreground">
              +{player.cards.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerAvatar;
