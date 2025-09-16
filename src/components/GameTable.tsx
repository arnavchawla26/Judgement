import React, { useState, useEffect } from 'react';
import { Player, GameState, Card, Suit } from '@/types/game';
import { cn } from '@/lib/utils';
import PlayingCard from './PlayingCard';
import PlayerAvatar from './PlayerAvatar';
import TrumpIndicator from './TrumpIndicator';
import BiddingInterface from './BiddingInterface';
import { Button } from '@/components/ui/button';
import { DEV_MODE, DEV_MIN_PLAYERS, DISALLOW_SUM_EQUALS_HANDSIZE } from '@/config';
import { Users, Play, RotateCcw } from 'lucide-react';
import { calculateRoundScore } from '@/utils/gameLogic';

interface GameTableProps {
  gameState: GameState;
  currentPlayer: Player;
  onPlayCard: (card: Card) => void;
  onPlaceBid: (bid: number) => void;
  onStartGame: () => void;
  onNextRound: () => void;
  playsLocked?: boolean;
  trickPopup?: { winnerName: string } | null;
  isHost?: boolean;
  className?: string;
}

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  currentPlayer,
  onPlayCard,
  onPlaceBid,
  onStartGame,
  onNextRound,
  className,
  playsLocked = false,
  trickPopup = null,
  isHost = true,
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(mq.matches);
    setIsMobile(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  
  const currentRound = gameState.currentRound;
  const isMyTurn = currentRound?.currentPlayer === currentPlayer.id;
  const isBiddingPhase = currentRound?.phase === 'bidding';
  const isPlayingPhase = currentRound?.phase === 'playing';
  
  // Position players around the table (max 8 players)
  const positionedPlayers = gameState.players.map((player, index) => {
    const totalPlayers = gameState.players.length;
    let position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
    
    if (player.id === currentPlayer.id) {
      position = 'bottom';
    } else {
      const relativeIndex = (index - gameState.players.findIndex(p => p.id === currentPlayer.id) + totalPlayers) % totalPlayers;
      if (relativeIndex <= totalPlayers / 4) position = 'right';
      else if (relativeIndex <= totalPlayers / 2) position = 'top';
      else if (relativeIndex <= (3 * totalPlayers) / 4) position = 'left';
      else position = 'bottom';
    }
    
    return { player, position };
  });

  const handleCardClick = (card: Card) => {
    if (!isMyTurn || !isPlayingPhase || playsLocked) return;
    // Block illegal plays (follow suit rule)
    const leadSuit = currentRound?.currentTrick?.leadSuit;
    const hasLead = currentPlayer.cards.some(c => c.suit === leadSuit);
    if (leadSuit && hasLead && card.suit !== leadSuit) return;
    
    if (selectedCard?.id === card.id) {
      // Play the selected card
      onPlayCard(card);
      setSelectedCard(null);
    } else {
      // Select the card
      setSelectedCard(card);
    }
  };

  const renderPlayerHand = () => {
    return (
      <div className="w-full">
        <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 place-items-center px-2" style={{ ['--cardW' as any]: 'clamp(56px, 9vw, 96px)' }}>
          {currentPlayer.cards.map((card) => (
            <div key={card.id} className="card-3d card-tap flex items-center justify-center" style={{ width: 'var(--cardW)', aspectRatio: '63/88' }}>
              <PlayingCard
                card={card}
                isTrump={card.suit === currentRound?.trumpSuit}
                size={isMobile ? 'sm' : 'md'}
                isPlayable={isMyTurn && isPlayingPhase && !playsLocked && (() => {
                  const lead = currentRound?.currentTrick?.leadSuit;
                  const hasLead = currentPlayer.cards.some(c => c.suit === lead);
                  return !lead || !hasLead || card.suit === lead;
                })()}
                className={cn(
                  'transition-all duration-200 animate-card-deal',
                  selectedCard?.id === card.id && 'ring-2 ring-primary scale-105 -translate-y-2',
                  isMyTurn && isPlayingPhase && 'hover:cursor-pointer'
                )}
                onClick={() => handleCardClick(card)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTrickArea = () => {
    if (!currentRound?.currentTrick) return null;
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 min-h-[28vh] sm:min-h-[32vh] md:min-h-[38vh] lg:min-h-[44vh] w-full">
        {currentRound.currentTrick.cards.map((trickCard) => (
          <div
            key={trickCard.card.id}
            data-play-card={trickCard.card.id}
            className="card-3d"
            style={{ width: 'clamp(72px, min(8.2vh, 12vw), 132px)', aspectRatio: '63/88' }}
          >
            <PlayingCard card={trickCard.card} size="sm" isTrump={trickCard.card.suit === currentRound.trumpSuit} />
          </div>
        ))}
        {currentRound.currentTrick.cards.length === 0 && (
          <div className="text-muted-foreground text-sm hidden md:block">Play Area</div>
        )}
      </div>
    );
  };

  const renderScoreboard = () => (
    <div className={cn('score-display rounded-lg p-4 min-w-64', isMobile && 'ui-glass')}>
      <h3 className="font-bold text-center mb-3">Round {currentRound?.roundNumber || 1}</h3>
      
      <div className="space-y-2">
        {gameState.players.map(player => (
          <div key={player.id} className="flex justify-between items-center text-sm">
            <span className={cn(
              'font-medium',
              player.id === currentPlayer.id && 'text-primary'
            )}>
              {player.name}
            </span>
            <div className="flex gap-2">
              {currentRound?.bids[player.id] !== undefined && (
                <span className="text-xs bg-secondary rounded px-2 py-1">
                  Bid: {currentRound.bids[player.id]}
                </span>
              )}
              <span className="text-xs bg-accent/30 rounded px-2 py-1">
                Hands: {player.tricks}
              </span>
              <span className="text-xs bg-primary/20 rounded px-2 py-1">
                {player.score}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {currentRound && (
        <div className="mt-3 pt-3 border-t border-border text-center text-xs text-muted-foreground">
          Cards this round: {currentRound.cardsPerPlayer} | Hands: {currentRound.completedTricks.length}
        </div>
      )}
    </div>
  );

  if (gameState.gamePhase === 'lobby') {
    return (
      <div className="game-table lg:rounded-3xl p-8 min-h-[600px] flex flex-col items-center justify-center gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 animate-fade-in-up">
            Judgement Card Game
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Waiting for players to join...
          </p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          {gameState.players.map(player => (
            <PlayerAvatar
              key={player.id}
              player={player}
              position="bottom"
              showCards={false}
              showBid={false}
              className="animate-bounce-in"
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-5 h-5" />
          <span>{gameState.players.length} / {gameState.maxPlayers} players</span>
        </div>

        {gameState.players.length >= (DEV_MODE ? DEV_MIN_PLAYERS : 3) && (
          isHost ? (
            <Button
              onClick={onStartGame}
              size="lg"
              className="animate-bounce-in"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          ) : (
            <div className="rounded-lg bg-secondary/60 text-foreground px-4 py-3 text-center">
              Waiting for host to start the game
            </div>
          )
        )}
      </div>
    );
  }
  if (gameState.gamePhase === 'finished') {
    const sorted = [...gameState.players].sort((a, b) => b.score - a.score);
    return (
      <div className="game-table lg:rounded-3xl p-8 min-h-[600px] flex flex-col items-center justify-center gap-6">
        <h2 className="text-3xl font-bold">Game Over</h2>
        <div className="score-display rounded-xl p-6 w-full max-w-md animate-fade-in-up">
          <h3 className="text-lg font-semibold mb-3">Leaderboard</h3>
          <div className="space-y-2">
            {sorted.map((p, idx) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="font-medium">{idx + 1}. {p.name}</span>
                <span className="text-primary font-semibold">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('game-table lg:rounded-3xl p-4 md:p-8 min-h-[800px] relative pb-28 md:pb-4 mx-auto w-full max-w-[1200px] overflow-x-hidden', className)}>
      {/* Players positioned around the table */}
      <div className="absolute inset-8">
        {positionedPlayers
          .filter(({ player }) => player.id !== currentPlayer.id)
          .map(({ player, position }) => (
            <div
              key={player.id}
              className={cn(
                'absolute',
                position === 'top' && 'top-0 left-1/2 -translate-x-1/2',
                position === 'left' && 'left-0 top-1/2 -translate-y-1/2',
                position === 'right' && 'right-0 top-1/2 -translate-y-1/2'
              )}
            >
              <PlayerAvatar
                player={player}
                position={position}
                className="animate-fade-in-up"
              />
            </div>
          ))}
      </div>

      {/* Center area */}
      <div className="flex flex-col items-center justify-center h-full gap-4 md:gap-8 mb-6">
        <div className="flex items-start justify-center gap-3 md:gap-4 w-full">
          {/* Trump indicator */}
          {currentRound && (
            <div className={cn(isMobile && 'glow-gold rounded-xl p-1')}>
              <TrumpIndicator
                trumpSuit={currentRound.trumpSuit}
                className="animate-bounce-in scale-90 md:scale-100"
              />
            </div>
          )}

          {/* Trick area */}
          {renderTrickArea()}

          {/* Scoreboard */}
          {renderScoreboard()}
        </div>

        {/* Bidding interface */}
        {isBiddingPhase && isMyTurn && currentRound && (
          <BiddingInterface
            maxBid={currentRound.cardsPerPlayer}
            onBid={onPlaceBid}
            className="animate-fade-in-up relative z-20"
            disallowSumEquals={DISALLOW_SUM_EQUALS_HANDSIZE}
            disallowedBid={(DISALLOW_SUM_EQUALS_HANDSIZE && Object.keys(currentRound.bids).length === gameState.players.length - 1)
              ? Math.max(0, currentRound.cardsPerPlayer - Object.values(currentRound.bids).reduce((a, b) => a + b, 0))
              : null}
          />
        )}

        {/* Game status */}
        {!isBiddingPhase && (
          <div className="text-center">
            {isMyTurn && isPlayingPhase && (
              <p className="text-lg font-semibold text-primary animate-pulse-glow">
                Your turn - Select a card to play
              </p>
            )}
            {!isMyTurn && isPlayingPhase && currentRound && (
              <p className="text-muted-foreground">
                Waiting for {gameState.players.find(p => p.id === currentRound.currentPlayer)?.name}
              </p>
            )}
            {currentRound?.phase === 'complete' && (
              <div className="score-display rounded-xl p-6 mt-4 animate-fade-in-up">
                <h3 className="text-lg font-bold text-center mb-3">Round {currentRound.roundNumber} Results</h3>
                <div className="grid grid-cols-3 gap-2 text-sm font-medium mb-2">
                  <div>Player</div>
                  <div className="text-center">Bid / Hands</div>
                  <div className="text-right">Score</div>
                </div>
                <div className="space-y-1">
                  {gameState.players.map(p => {
                    const bid = currentRound.bids[p.id] ?? 0;
                    const tricks = currentRound.completedTricks.filter(t => (t as any).winner === p.id).length;
                    const roundScore = calculateRoundScore(bid, tricks);
                    return (
                      <div key={p.id} className="grid grid-cols-3 gap-2 text-sm">
                        <div className={cn('truncate', p.id === currentPlayer.id && 'text-primary font-semibold')}>{p.name}</div>
                        <div className="text-center">{bid} / {tricks}</div>
                        <div className="text-right">{roundScore}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center mt-4">
                  <Button onClick={onNextRound} size="lg" className="animate-bounce-in">
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Next Round
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trick winner overlay */}
      {trickPopup && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 rounded-3xl">
          <div className="score-display rounded-xl p-5 text-center">
            <div className="text-lg font-bold mb-1">{trickPopup.winnerName} won the hand</div>
            <div className="text-xs text-muted-foreground">Next trick will start shortly...</div>
          </div>
        </div>
      )}

      {/* Current player's hand at bottom */}
      <div className={cn(
        "absolute bottom-2 left-1/2 -translate-x-1/2 z-30",
        (isBiddingPhase && isMyTurn) && "pointer-events-none opacity-90",
        playsLocked && "pointer-events-none"
      )}>
        {renderPlayerHand()}
      </div>
    </div>
  );
};

export default GameTable;
