export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  connected?: boolean;
  isHost?: boolean;
  position: number; // 0-7 for positioning around table
  cards: Card[];
  bid?: number;
  tricks: number;
  score: number;
  isActive: boolean;
  isDealer: boolean;
}

export interface GameTrick {
  id: string;
  cards: Array<{
    card: Card;
    playerId: string;
    playerName: string;
  }>;
  winner?: string;
  leadSuit?: Suit;
}

export interface GameRound {
  roundNumber: number;
  cardsPerPlayer: number;
  trumpSuit: Suit;
  phase: 'bidding' | 'playing' | 'complete';
  currentTrick: GameTrick | null;
  completedTricks: GameTrick[];
  bids: Record<string, number>;
  currentPlayer?: string;
  trickLeader?: string;
}

export interface GameState {
  id: string;
  players: Player[];
  currentRound: GameRound | null;
  gamePhase: 'lobby' | 'dealing' | 'playing' | 'finished';
  maxPlayers: number;
  dealerIndex: number;
  scores: Record<string, number[]>; // Player scores by round
  winner?: string;
  rounds?: any[]; // Round summaries for scoreboard (server/local engine)
}

export type GameAction = 
  | { type: 'JOIN_GAME'; payload: { playerId: string; playerName: string } }
  | { type: 'START_GAME' }
  | { type: 'DEAL_CARDS' }
  | { type: 'PLACE_BID'; payload: { playerId: string; bid: number } }
  | { type: 'PLAY_CARD'; payload: { playerId: string; card: Card } }
  | { type: 'COMPLETE_TRICK' }
  | { type: 'COMPLETE_ROUND' }
  | { type: 'NEXT_ROUND' }
  | { type: 'END_GAME' };
