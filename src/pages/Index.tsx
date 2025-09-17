// src/pages/Index.tsx
import React, { useState, useReducer } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GameTable from '@/components/GameTable';
import useIsDesktop from '@/hooks/useIsDesktop';
import GameLayoutDesktop from '@/layouts/GameLayoutDesktop';
import GameLayoutMobile from '@/layouts/GameLayoutMobile';
import RoomCodePill from '@/components/RoomCodePill';
import ScoreboardModal from '@/components/ScoreboardModal';
import TrickCollectLayer from '@/components/TrickCollectLayer';
import { GameState, Player, Card, GameAction } from '@/types/game';
import {
  calculateMaxCards,
  dealCards,
  getRandomTrumpSuit,
  calculateRoundScore,
  determineTrickWinner,
  canPlayCard,
  pickAiCard,
  getCardValue,
  computeMaxHand,
} from '@/utils/gameLogic';
import { DEV_MODE, DEV_MIN_PLAYERS, DEV_AUTO_BID_DELAY_MS, DEV_AUTO_PLAY_DELAY_MS, DISALLOW_SUM_EQUALS_HANDSIZE } from '@/config';
import { cn } from '@/lib/utils';
import { Spade, Heart, Diamond, Club, Users } from 'lucide-react';
import { getSocket, joinRoom, rejoinLast, normalizeCode, disconnectSocket } from '@/lib/socket';

// ---------------- Reducer (demo/offline logic stays the same) ----------------
const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'JOIN_GAME': {
      const newPlayer: Player = {
        id: action.payload.playerId,
        name: action.payload.playerName,
        position: state.players.length,
        cards: [],
        tricks: 0,
        score: 0,
        isActive: false,
        isDealer: state.players.length === 0,
      };
      return { ...state, players: [...state.players, newPlayer] };
    }

    case 'START_GAME': {
      if (state.players.length < (DEV_MODE ? DEV_MIN_PLAYERS : 3)) return state;

      const maxCards = computeMaxHand(state.players.length, 10);
      const { players: updatedPlayers } = dealCards(state.players, maxCards);

      const nextState: GameState = {
        ...state,
        gamePhase: 'playing',
        players: updatedPlayers.map((p, i) => ({ ...p, isActive: i === 0 })),
        currentRound: {
          roundNumber: 1,
          cardsPerPlayer: maxCards,
          trumpSuit: getRandomTrumpSuit(),
          phase: 'bidding',
          currentTrick: { id: 'trick-1', cards: [], leadSuit: undefined },
          completedTricks: [],
          bids: {},
          currentPlayer: updatedPlayers[0].id,
        },
      };
      if (DEV_MODE) {
        console.log('[ROUND START]', {
          round: 1,
          cardsPerPlayer: nextState.currentRound?.cardsPerPlayer,
          trump: nextState.currentRound?.trumpSuit,
          players: nextState.players.map(p => ({ id: p.id, name: p.name })),
        });
      }
      return nextState;
    }

    case 'PLACE_BID': {
      if (!state.currentRound) return state;
      const round = { ...state.currentRound };
      round.bids = { ...round.bids, [action.payload.playerId]: action.payload.bid };
      // advance to next player for bidding
      const currentIndex = state.players.findIndex(p => p.id === round.currentPlayer);
      const nextIndex = (currentIndex + 1) % state.players.length;

      // Optional house rule guard (UI should also prevent)
      if (DISALLOW_SUM_EQUALS_HANDSIZE && Object.keys(round.bids).length === state.players.length - 1) {
        // last bidder guard — allow any bid in demo
      }

      round.currentPlayer = state.players[nextIndex].id;

      if (DEV_MODE) console.log('[BID]', action.payload.playerId, action.payload.bid, round.bids);

      // all bids placed? → start playing
      if (Object.keys(round.bids).length === state.players.length) {
        round.phase = 'playing';
      }
      return { ...state, currentRound: round };
    }

    case 'PLAY_CARD': {
      if (!state.currentRound) return state;

      const round = { ...state.currentRound };
      const players = state.players.map(p => ({ ...p, cards: [...p.cards] }));
      const playerIndex = players.findIndex(p => p.id === action.payload.playerId);
      if (playerIndex === -1) return state;

      const hand = players[playerIndex].cards;
      const cardIdx = hand.findIndex(c => c.id === action.payload.card.id);
      if (cardIdx === -1) return state;

      const card = hand[cardIdx];
      // enforce follow-suit legality
      const leadSuit = round.currentTrick?.leadSuit;
      if (!canPlayCard(card, hand, leadSuit, round.trumpSuit)) {
        return state;
      }

      // remove card from hand
      hand.splice(cardIdx, 1);

      const trick = round.currentTrick
        ? { ...round.currentTrick, cards: [...round.currentTrick.cards] }
        : { id: `trick-${round.completedTricks.length + 1}`, cards: [], leadSuit: undefined };

      if (!trick.leadSuit) trick.leadSuit = card.suit;
      trick.cards.push({ card, playerId: players[playerIndex].id, playerName: players[playerIndex].name });
      if (DEV_MODE) console.log('[PLAY]', players[playerIndex].name, card);

      // advance current player to next
      const currentIndex = state.players.findIndex(p => p.id === round.currentPlayer);
      round.currentPlayer = state.players[(currentIndex + 1) % state.players.length].id;
      round.currentTrick = trick;

      // if trick complete
      if (trick.cards.length === state.players.length) {
        const winnerId = determineTrickWinner(trick as any, round.trumpSuit);
        (trick as any).winner = winnerId;
        // increment tricks for winner
        const winIndex = players.findIndex(p => p.id === winnerId);
        if (winIndex !== -1) players[winIndex].tricks += 1;

        if (DEV_MODE) console.log('[TRICK WON]', winnerId, trick);

        round.completedTricks = [...round.completedTricks, trick];
        round.currentTrick = { id: `trick-${round.completedTricks.length + 1}`, cards: [], leadSuit: undefined };
        round.currentPlayer = winnerId || round.currentPlayer;
      }

      // if all cards played in round -> complete
      const cardsLeftTotal = players.reduce((sum, p) => sum + p.cards.length, 0);
      if (cardsLeftTotal === 0) {
        round.phase = 'complete';
        // score the round + build scoreboard summary
        const newScores: Record<string, number[]> = { ...state.scores };
        const results: any[] = [];
        players.forEach(p => {
          const bid = round.bids[p.id] ?? 0;
          const handsWon = p.tricks;
          const roundScore = calculateRoundScore(bid, handsWon);
          newScores[p.id] = [...(newScores[p.id] || []), roundScore];
          p.score += roundScore;
          results.push({ playerId: p.id, name: p.name, bid, handsWon, points: roundScore, cumulative: p.score });
          p.tricks = 0;
        });
        const rounds = [
          ...((state as any).rounds || []),
          { round: round.roundNumber - 1, handSize: round.cardsPerPlayer, trump: round.trumpSuit, results },
        ];
        if (DEV_MODE) console.log('[ROUND SCORE]', newScores);
        return { ...(state as any), currentRound: round, players, scores: newScores, rounds } as any;
      }

      return { ...state, currentRound: round, players };
    }

    case 'NEXT_ROUND': {
      if (!state.currentRound) return state;
      const prev = state.currentRound;
      const players = state.players.map((p, i) => ({ ...p, isActive: i === 0 }));
      let cardsPerPlayer = prev.cardsPerPlayer - 1;
      if (cardsPerPlayer < 1) {
        return { ...state, gamePhase: 'finished', currentRound: null, players };
      }
      const { players: dealt } = dealCards(players, cardsPerPlayer);
      return {
        ...state,
        players: dealt,
        currentRound: {
          roundNumber: prev.roundNumber + 1,
          cardsPerPlayer,
          trumpSuit: getRandomTrumpSuit(),
          phase: 'bidding',
          currentTrick: { id: 'trick-1', cards: [], leadSuit: undefined },
          completedTricks: [],
          bids: {},
          currentPlayer: dealt[0].id,
        },
      };
    }

    default:
      return state;
  }
};

// --------------------------- Component ---------------------------
const Index = () => {
  const [gameState, dispatch] = useReducer(gameReducer, {
    id: 'demo-game',
    players: [],
    currentRound: null,
    gamePhase: 'lobby',
    maxPlayers: 10,
    dealerIndex: 0,
    scores: {},
    rounds: [],
  });

  // Join/Create inputs
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createCode, setCreateCode] = useState<string>(() =>
    Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')
  );
  const [addBots, setAddBots] = useState(false);
  //Leave Code
const leaveRoom = async () => {
  try {
    const socket = await getSocket().catch(() => null as any);
    // Stop listening so we don't still process server updates
    socket?.off?.('state');
    socket?.off?.('hand:resolved');
    socket?.off?.('trick:resolved');

    // Tell server we're leaving (harmless no-op if server doesn't handle it)
    const code = (effectiveGameState as any)?.id || joinCode || createCode;
    if (socket && code && code.length === 4) {
      socket.emit('leave', { roomCode: code, forget: false });
    }
  } catch {}

  // Clear saved session so auto-rejoin won't trigger
  const room = (effectiveGameState as any)?.id || joinCode || createCode;
  if (room) localStorage.removeItem(`PLAYER_KEY:${room}`);
  localStorage.removeItem('LAST_ROOM');
  localStorage.removeItem('LAST_NAME');

  // Reset client UI
  setRemoteGameState(null);
  setUsingServer(false);
  setIsJoined(false);
  setMyId(null);

  // Fully drop socket so server marks you disconnected
  disconnectSocket();
};


  // Mode & session
  const [isJoined, setIsJoined] = useState(false);
  const [usingServer, setUsingServer] = useState(false);
  const [remoteGameState, setRemoteGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  // UI state
  const [trickPopup, setTrickPopup] = useState<{ winnerId: string; winnerName: string } | null>(null);
  const [playsLocked, setPlaysLocked] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [collectTrig, setCollectTrig] = useState<any>(null);

  // Helpers for code
  const toLobbyCode = (value: string) => normalizeCode(value);
  const randomLobbyCode = () =>
    Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');

  const effectiveGameState = usingServer && remoteGameState ? remoteGameState : gameState;

  // Current player (demo fallback)
  const currentPlayer =
    effectiveGameState.players.find(p => p.id === myId) ||
    effectiveGameState.players[0] || {
      id: 'demo-player',
      name: 'You',
      position: 0,
      cards: [],
      tricks: 0,
      score: 0,
      isActive: true,
      isDealer: true,
    };

  // ---------------- Auto-rejoin on reload ----------------
  React.useEffect(() => {
    (async () => {
      const ack = await rejoinLast();
      if (!ack) return;

      setUsingServer(true);
      setMyId(ack.playerId);

      const socket = await getSocket();

      // Ensure single listeners
      socket.off('state');
      socket.on('state', (state: any) => setRemoteGameState(state as GameState));

      const onHandResolved = (payload: any) => {
        if (!payload) return;
        try {
          setCollectTrig({
            trick: (payload.trick || []).map((c: any) => ({
              playerId: c.playerId,
              card: { code: c.card?.id || c.card?.code },
            })),
            winnerId: payload.winnerId,
            startedAt: Date.now(),
          });
        } catch {}
        setTrickPopup({ winnerId: payload.winnerId, winnerName: payload.winnerName });
        setPlaysLocked(true);
        setTimeout(() => {
          setTrickPopup(null);
          setPlaysLocked(false);
        }, 1600);
      };

      socket.off('hand:resolved');
      socket.off('trick:resolved');
      socket.on('hand:resolved', onHandResolved);
      socket.on('trick:resolved', onHandResolved);

      setIsJoined(true);
    })();
  }, []);

  // ---------------- Join/Create flow ----------------
  const doJoin = async (name: string, code?: string) => {
    const cleaned = name.trim();
    if (!cleaned) return;

    if (code && code.length === 4) {
      // Server mode
      setUsingServer(true);

      try {
        const ack = await joinRoom(code, cleaned);
        setMyId(ack.playerId);

        const socket = await getSocket();

        // Ensure single listeners
        socket.off('state');
        socket.on('state', (state: any) => setRemoteGameState(state as GameState));

        const onHandResolved = (payload: any) => {
          if (!payload) return;
          try {
            setCollectTrig({
              trick: (payload.trick || []).map((c: any) => ({
                playerId: c.playerId,
                card: { code: c.card?.id || c.card?.code },
              })),
              winnerId: payload.winnerId,
              startedAt: Date.now(),
            });
          } catch {}
          setTrickPopup({ winnerId: payload.winnerId, winnerName: payload.winnerName });
          setPlaysLocked(true);
          setTimeout(() => {
            setTrickPopup(null);
            setPlaysLocked(false);
          }, 1600);
        };

        socket.off('hand:resolved');
        socket.off('trick:resolved');
        socket.on('hand:resolved', onHandResolved);
        socket.on('trick:resolved', onHandResolved);

        if (addBots) socket.emit('addBots', { roomCode: code });

        setIsJoined(true);
      } catch (err: any) {
        alert(err?.message || 'Join failed');
        setUsingServer(false);
      }
    } else {
      // Demo/local only
      dispatch({ type: 'JOIN_GAME', payload: { playerId: 'demo-player', playerName: cleaned } });
      if (addBots) {
        setTimeout(() => {
          ['Alice', 'Bob', 'Charlie'].forEach((botName, i) => {
            dispatch({ type: 'JOIN_GAME', payload: { playerId: `bot-${i}`, playerName: botName } });
          });
        }, 300);
      }
      setIsJoined(true);
    }
  };

  // ---------------- Server / Demo actions ----------------
  const handleStartGame = async () => {
    if (usingServer && (joinCode.length === 4 || createCode.length === 4)) {
      const code = joinCode.length === 4 ? joinCode : createCode;
      const socket = await getSocket();
      socket.emit('startGame', { roomCode: code });
    } else {
      dispatch({ type: 'START_GAME' });
    }
  };

  const handlePlayCard = async (card: Card) => {
    if (usingServer && (joinCode.length === 4 || createCode.length === 4)) {
      const code = joinCode.length === 4 ? joinCode : createCode;
      const socket = await getSocket();
      socket.emit('playCard', { roomCode: code, card });
    } else {
      dispatch({ type: 'PLAY_CARD', payload: { playerId: currentPlayer.id, card } });
    }
  };

  const handlePlaceBid = async (bid: number) => {
    if (usingServer && (joinCode.length === 4 || createCode.length === 4)) {
      const code = joinCode.length === 4 ? joinCode : createCode;
      const socket = await getSocket();
      socket.emit('placeBid', { roomCode: code, bid });
    } else {
      dispatch({ type: 'PLACE_BID', payload: { playerId: currentPlayer.id, bid } });
    }
  };

  const handleNextRound = async () => {
    if (usingServer && (joinCode.length === 4 || createCode.length === 4)) {
      const code = joinCode.length === 4 ? joinCode : createCode;
      const socket = await getSocket();
      socket.emit('nextRound', { roomCode: code });
    } else {
      dispatch({ type: 'NEXT_ROUND' });
    }
  };

  // ---------------- Demo bot (unchanged) ----------------
  React.useEffect(() => {
    if (usingServer) return;
    if (!gameState.currentRound) return;
    if (playsLocked) return;

    const round = gameState.currentRound;
    const currentId = round.currentPlayer;
    const isBot = currentId && currentId.startsWith('bot-');
    if (!isBot) return;

    const bot = gameState.players.find(p => p.id === currentId);
    if (!bot) return;

    const delay = DEV_AUTO_PLAY_DELAY_MS;
    const t = setTimeout(() => {
      if (round.phase === 'bidding') {
        const bid = Math.floor(Math.random() * (round.cardsPerPlayer + 1));
        dispatch({ type: 'PLACE_BID', payload: { playerId: bot.id, bid } });
      } else if (round.phase === 'playing' && round.currentTrick) {
        const lead = round.currentTrick.leadSuit;
        const card = pickAiCard(bot.cards, lead, round.trumpSuit);
        dispatch({ type: 'PLAY_CARD', payload: { playerId: bot.id, card } });
      }
    }, delay);

    return () => clearTimeout(t);
  }, [usingServer, gameState.currentRound?.currentPlayer, gameState.currentRound?.phase, gameState.players, playsLocked]);

  // ---------------- Local trick popup (demo mode) ----------------
  const prevTricksRef = React.useRef(0);
  React.useEffect(() => {
    const completed = gameState.currentRound?.completedTricks?.length || 0;
    if (completed > prevTricksRef.current) {
      const last: any = gameState.currentRound?.completedTricks?.[completed - 1];
      const winnerId: string | undefined = last?.winner;
      const winner = gameState.players.find(p => p.id === winnerId);
      if (winnerId && winner) {
        try {
          if (last?.cards?.length) {
            setCollectTrig({
              trick: last.cards.map((c: any) => ({ playerId: c.playerId, card: { code: c.card.id } })),
              winnerId,
              startedAt: Date.now(),
            });
          }
        } catch {}
        setTrickPopup({ winnerId, winnerName: winner.name });
        setPlaysLocked(true);
        const timer = setTimeout(() => {
          setTrickPopup(null);
          setPlaysLocked(false);
        }, 1500);
        return () => clearTimeout(timer as any);
      }
    }
    prevTricksRef.current = completed;
  }, [gameState.currentRound?.completedTricks?.length]);

  // ---------------- Join/Create screen ----------------
  if (!isJoined) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center p-4 overflow-x-hidden">
        <div className="game-table lg:rounded-3xl p-8 w-full max-w-3xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 animate-fade-in-up">Judgement</h1>
            <p className="text-muted-foreground animate-fade-in-up">The ultimate trick-taking card game</p>
          </div>

          {/* Decorative suits */}
          <div className="flex justify-center gap-4 mb-8">
            {[Spade, Heart, Diamond, Club].map((Icon, i) => (
              <Icon
                key={i}
                className={cn('w-8 h-8 animate-bounce-in', i % 2 === 0 ? 'text-suit-black' : 'text-suit-red')}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>

          {/* Two-column: Join a Game | Create a Lobby */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-x-hidden">
            {/* Join a Game */}
            <div className="score-display rounded-xl p-6">
              <h3 className="text-center text-lg font-semibold mb-4">JOIN A GAME</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Lobby</label>
                  <Input
                    placeholder="ABCD"
                    value={joinCode}
                    onChange={(e) => setJoinCode(toLobbyCode(e.target.value))}
                    className="text-center uppercase"
                    maxLength={4}
                    inputMode="text"
                    pattern="[A-Z]{4}"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Your Name</label>
                  <Input
                    placeholder="Enter your name"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    className="text-center"
                  />
                </div>
                <Button
                  onClick={() => doJoin(joinName, joinCode)}
                  disabled={!joinName.trim() || joinCode.length !== 4}
                  className="w-full"
                  size="lg"
                >
                  <Users className="w-5 h-5 mr-2" />
                  JOIN
                </Button>
              </div>
            </div>

            {/* Create a Lobby */}
            <div className="score-display rounded-xl p-6">
              <h3 className="text-center text-lg font-semibold mb-4">CREATE A LOBBY</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Your Name</label>
                  <Input
                    placeholder="Enter your name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Lobby Code (auto-generated)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="ABCD"
                      value={createCode}
                      readOnly
                      disabled
                      className="text-center uppercase opacity-80"
                    />
                    <Button type="button" variant="outline" onClick={() => setCreateCode(randomLobbyCode())}>
                      New
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() => doJoin(createName, createCode)}
                  disabled={!createName.trim()}
                  className="w-full"
                  size="lg"
                >
                  <Users className="w-5 h-5 mr-2" />
                  CREATE LOBBY
                </Button>
                <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                  <input
                    id="add-bots"
                    type="checkbox"
                    checked={addBots}
                    onChange={(e) => setAddBots(e.target.checked)}
                  />
                  <label htmlFor="add-bots">Add bots</label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p className="mb-2">How to play:</p>
            <ul className="text-xs space-y-1">
              <li>• Bid exactly how many hands you'll win</li>
              <li>• Score: exact 0 → 10, 1 → 10, N≥2 → N×10</li>
              <li>• Follow suit or play trump to win hands</li>
              <li>• Rounds decrease from max cards to 1</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Main game screen ----------------
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
  const isBiddingOpen = Boolean(effectiveGameState?.currentRound?.phase === 'bidding');
  const sheetClass = isMobile && isBiddingOpen ? 'sheet-tall' : '';

  const round = effectiveGameState?.currentRound;

  return (
    <div className={cn('min-h-screen app-shell pad-for-sheet p-4', sheetClass)}>
      <div className="max-w-7xl mx-auto">
        {/* Top bar: room code (left) + actions (right) */}
<div className="m-topbar mx-2 flex items-center justify-between">
  <div className="flex items-center gap-2">
    {usingServer && effectiveGameState?.id && (
      <RoomCodePill code={effectiveGameState.id} />
    )}
  </div>

  <div className="flex items-center gap-2">
    <Button variant="outline" onClick={() => setShowScoreboard(true)}>
      Scoreboard
    </Button>
    <Button variant="destructive" onClick={leaveRoom}>
      Leave
    </Button>
  </div>
</div>

        {/* Game banner (mobile only, during gameplay) */}
        {effectiveGameState?.gamePhase === 'playing' && (
          <div className="mx-2 mt-2 text-center">
            <h1 className="text-3xl font-extrabold">Judgement</h1>
            <p className="text-sm text-muted-foreground">The ultimate trick-taking card game</p>
            <div className="flex justify-center gap-4 mt-2 opacity-90">
              {[Spade, Heart, Diamond, Club].map((Icon, i) => (
                <Icon key={i} className={cn('w-6 h-6', i % 2 === 0 ? 'text-suit-black' : 'text-suit-red')} />
              ))}
            </div>
          </div>
        )}

        {/* HUD strip: compact trump + round */}
        <div className="mx-2 m-hud">
          <span className="m-trump">Trump: {round?.trumpSuit ?? '—'}</span>
          <div className="m-round">
            <div className="font-semibold">Round {round?.roundNumber ?? 1}</div>
            <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
              Cards: {round?.cardsPerPlayer ?? 0}
            </div>
          </div>
        </div>

        {/* Players/Table section */}
        <section className="m-players mx-2">
          <GameTable
            gameState={effectiveGameState}
            currentPlayer={currentPlayer}
            onPlayCard={handlePlayCard}
            onPlaceBid={handlePlaceBid}
            onStartGame={handleStartGame}
            onNextRound={handleNextRound}
            playsLocked={playsLocked}
            trickPopup={trickPopup && { winnerName: trickPopup.winnerName }}
            isHost={(function () {
              if (!usingServer) return true;
              if (effectiveGameState.players.length === 1) return true;
              const me = effectiveGameState.players.find(p => p.id === myId);
              if (me && typeof (me as any).isHost !== 'undefined') return !!(me as any).isHost;
              const hostId = (effectiveGameState as any).hostId;
              return !!(hostId && myId && hostId === myId);
            })()}
          />
        </section>

        {/* Trick collect animation */}
        <TrickCollectLayer trigger={collectTrig} onDone={() => setCollectTrig(null)} />

        {/* Scoreboard */}
        {showScoreboard && (
          <ScoreboardModal
            rounds={(effectiveGameState as any).rounds || []}
            players={effectiveGameState.players}
            onClose={() => setShowScoreboard(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
