import { Card, Suit, Rank, Player, GameTrick } from '@/types/game';

// Create a standard 52-card deck
export const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const deck: Card[] = [];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`,
      });
    });
  });
  
  return deck;
};

// Shuffle a deck using Fisher-Yates algorithm
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Calculate maximum cards per player for first round
export const calculateMaxCards = (numPlayers: number): number => {
  const totalCards = 52;
  return Math.floor(totalCards / numPlayers);
};

// Compute starting hand size with a hard cap (default 10)
export const computeMaxHand = (playersCount: number, cap = 10): number => {
  const perPlayer = Math.floor(52 / Math.max(1, playersCount));
  return Math.max(1, Math.min(cap, perPlayer));
};

// Get card value for comparison (Ace high)
export const getCardValue = (rank: Rank): number => {
  switch (rank) {
    case 'A': return 14;
    case 'K': return 13;
    case 'Q': return 12;
    case 'J': return 11;
    default: return parseInt(rank);
  }
};

// Determine trick winner
export const determineTrickWinner = (
  trick: GameTrick,
  trumpSuit: Suit
): string | null => {
  if (trick.cards.length === 0) return null;
  
  const leadSuit = trick.leadSuit || trick.cards[0].card.suit;
  let winningCard = trick.cards[0];
  
  // Check each card in the trick
  for (let i = 1; i < trick.cards.length; i++) {
    const currentCard = trick.cards[i];
    const current = currentCard.card;
    const winning = winningCard.card;
    
    // Trump beats non-trump
    if (current.suit === trumpSuit && winning.suit !== trumpSuit) {
      winningCard = currentCard;
    }
    // Higher trump beats lower trump
    else if (current.suit === trumpSuit && winning.suit === trumpSuit) {
      if (getCardValue(current.rank) > getCardValue(winning.rank)) {
        winningCard = currentCard;
      }
    }
    // Following suit: higher card wins
    else if (current.suit === leadSuit && winning.suit === leadSuit) {
      if (getCardValue(current.rank) > getCardValue(winning.rank)) {
        winningCard = currentCard;
      }
    }
    // Following suit beats non-following (if neither is trump)
    else if (current.suit === leadSuit && winning.suit !== leadSuit && winning.suit !== trumpSuit) {
      winningCard = currentCard;
    }
  }
  
  return winningCard.playerId;
};

// Check if a card can be played legally
export const canPlayCard = (
  card: Card,
  hand: Card[],
  leadSuit?: Suit,
  trumpSuit?: Suit
): boolean => {
  // If no lead suit (first card of trick), any card can be played
  if (!leadSuit) return true;
  
  // If player has cards of the lead suit, must play them
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);
  if (hasLeadSuit && card.suit !== leadSuit) return false;
  
  // Otherwise, any card can be played
  return true;
};

// Pick a simple AI card: follow suit with lowest if possible,
// otherwise play lowest overall. Prefer non-trump when discarding.
export const pickAiCard = (
  hand: Card[],
  leadSuit: Suit | undefined,
  trumpSuit: Suit | undefined
): Card => {
  const byValueAsc = (a: Card, b: Card) => getCardValue(a.rank) - getCardValue(b.rank);
  const following = leadSuit ? hand.filter(c => c.suit === leadSuit) : [];
  if (following.length) return [...following].sort(byValueAsc)[0];
  // try to discard lowest non-trump
  const nonTrump = trumpSuit ? hand.filter(c => c.suit !== trumpSuit) : hand;
  if (nonTrump.length) return [...nonTrump].sort(byValueAsc)[0];
  // otherwise just lowest
  return [...hand].sort(byValueAsc)[0];
};

// Calculate score for a round
export const calculateRoundScore = (bid: number, tricks: number): number => {
  if (bid !== tricks) return 0;
  if (bid === 0 || bid === 1) return 10;
  return bid * 10;
};

// Generate random trump suit
export const getRandomTrumpSuit = (): Suit => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  return suits[Math.floor(Math.random() * suits.length)];
};

// Deal cards to players
export const dealCards = (
  players: Player[],
  cardsPerPlayer: number
): { players: Player[]; deck: Card[] } => {
  const deck = shuffleDeck(createDeck());
  const updatedPlayers = players.map(player => ({ ...player, cards: [] }));
  
  // Deal cards round-robin style
  for (let cardIndex = 0; cardIndex < cardsPerPlayer; cardIndex++) {
    for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
      const card = deck.pop();
      if (card) {
        updatedPlayers[playerIndex].cards.push(card);
      }
    }
  }
  
  // Sort each player's hand
  updatedPlayers.forEach(player => {
    player.cards.sort((a, b) => {
      // Sort by suit first, then by value
      if (a.suit !== b.suit) {
        const suitOrder: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
        return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
      }
      return getCardValue(a.rank) - getCardValue(b.rank);
    });
  });
  
  return { players: updatedPlayers, deck };
};
