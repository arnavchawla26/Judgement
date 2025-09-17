// Lightweight Socket.IO server for LAN multiplayer Judgement
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const DEV_MIN_PLAYERS = 1; // allow solo for testing

const app = express();

const allowed = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowed.length ? allowed : true, credentials: true }));
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowed.length ? allowed : true, credentials: true }
});

// --- Card helpers ---
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const newDeck = () => {
  const deck = [];
  for (const s of suits) for (const r of ranks) deck.push({ suit: s, rank: r, id: `${s}-${r}` });
  return deck;
};
const shuffle = (deck) => {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const getVal = (r) => (r === 'A' ? 14 : r === 'K' ? 13 : r === 'Q' ? 12 : r === 'J' ? 11 : parseInt(r));
const calcMaxCards = (n) => Math.floor(52 / Math.max(1, n));
const randTrump = () => suits[Math.floor(Math.random() * suits.length)];

const canPlay = (card, hand, leadSuit) => {
  if (!leadSuit) return true;
  const hasLead = hand.some((c) => c.suit === leadSuit);
  if (hasLead && card.suit !== leadSuit) return false;
  return true;
};

const determineTrickWinner = (trick, trump) => {
  if (!trick.cards.length) return null;
  const lead = trick.leadSuit || trick.cards[0].card.suit;
  let win = trick.cards[0];
  for (let i = 1; i < trick.cards.length; i++) {
    const cur = trick.cards[i].card;
    const w = win.card;
    if (cur.suit === trump && w.suit !== trump) win = trick.cards[i];
    else if (cur.suit === trump && w.suit === trump) if (getVal(cur.rank) > getVal(w.rank)) win = trick.cards[i];
    else if (cur.suit === lead && w.suit === lead) if (getVal(cur.rank) > getVal(w.rank)) win = trick.cards[i];
    else if (cur.suit === lead && w.suit !== lead && w.suit !== trump) win = trick.cards[i];
  }
  return win.playerId;
};

const scoreExact = (bid, tricks) => {
  if (bid !== tricks) return 0;
  if (bid === 0 || bid === 1) return 10;
  return bid * 10;
};

// --- Rooms state ---
const rooms = new Map(); // code -> state
const socketToRoom = new Map();

const emptyState = (code) => ({
  id: code,
  players: [],
  currentRound: null,
  gamePhase: 'lobby',
  maxPlayers: 10,
  dealerIndex: 0,
  scores: {},
  rounds: [],
});

const broadcast = (code) => {
  const s = rooms.get(code);
  if (s) io.to(code).emit('state', s);
};

const deal = (players, cardsPerPlayer) => {
  const deck = shuffle(newDeck());
  const updated = players.map((p) => ({ ...p, cards: [] }));
  for (let c = 0; c < cardsPerPlayer; c++) {
    for (let i = 0; i < updated.length; i++) {
      const card = deck.pop();
      if (card) updated[i].cards.push(card);
    }
  }
  // sort hands
  updated.forEach((p) => {
    p.cards.sort((a, b) => {
      const order = ['spades', 'hearts', 'diamonds', 'clubs'];
      if (a.suit !== b.suit) return order.indexOf(a.suit) - order.indexOf(b.suit);
      return getVal(a.rank) - getVal(b.rank);
    });
  });
  return updated;
};

io.on('connection', (socket) => {
  socket.on('join', ({ roomCode, playerName, playerKey }) => {
    if (!roomCode || !playerName) return;
    let state = rooms.get(roomCode);
    if (!state) {
      state = emptyState(roomCode);
      state.hostId = socket.id;
      rooms.set(roomCode, state);
    }
    // reattach if playerKey matches an existing seat
    if (playerKey) {
      const seat = state.players.find((p) => p.playerKey === playerKey);
      if (seat) {
        seat.id = socket.id; // swap current socket id in-place
        seat.connected = true;
        seat.name = playerName || seat.name;
        if (seat.isHost) state.hostId = socket.id;
        socket.join(roomCode);
        socketToRoom.set(socket.id, roomCode);
        socket.emit('room:joined', { roomId: roomCode, playerId: seat.id, playerKey, isHost: !!seat.isHost });
        return broadcast(roomCode);
      }
    }
    // otherwise create new seat
    const isFirst = state.players.length === 0;
    state.players.push({
      id: socket.id,
      name: playerName,
      playerKey: playerKey || Math.random().toString(36).slice(2, 10),
      connected: true,
      position: state.players.length,
      cards: [],
      tricks: 0,
      score: 0,
      isActive: false,
      isDealer: isFirst,
      isHost: isFirst,
    });
    if (isFirst) state.hostId = socket.id;
    socket.join(roomCode);
    socketToRoom.set(socket.id, roomCode);
    socket.emit('room:joined', { roomId: roomCode, playerId: socket.id, playerKey: state.players[state.players.length-1].playerKey, isHost: isFirst });
    broadcast(roomCode);
  });

  socket.on('room:rejoin', ({ roomCode, playerKey, playerName }) => {
    const s = rooms.get(roomCode);
    if (!s || !playerKey) return;
    const seat = s.players.find((p) => p.playerKey === playerKey);
    if (!seat) return;
    seat.id = socket.id;
    seat.connected = true;
    if (playerName) seat.name = playerName;
    if (seat.isHost) s.hostId = socket.id;
    socket.join(roomCode);
    socketToRoom.set(socket.id, roomCode);
    socket.emit('room:joined', { roomId: roomCode, playerId: seat.id, playerKey, isHost: !!seat.isHost });
    broadcast(roomCode);
  });

  socket.on('addBots', ({ roomCode, names = ['Alice', 'Bob', 'Charlie'] }) => {
    const s = rooms.get(roomCode);
    if (!s) return;
    names.forEach((name, i) => {
      if (!s.players.find((p) => p.id === `bot-${i}`)) {
        s.players.push({
          id: `bot-${i}`,
          name,
          position: s.players.length,
          cards: [],
          tricks: 0,
          score: 0,
          isActive: false,
          isDealer: false,
        });
      }
    });
    broadcast(roomCode);
  });

  socket.on('startGame', ({ roomCode }) => {
    const s = rooms.get(roomCode);
    if (!s) return;
    if (s.hostId && socket.id !== s.hostId) {
      io.to(socket.id).emit('errorMsg', 'Only the host can start the game');
      return;
    }
    
    if (s.players.length < DEV_MIN_PLAYERS) return;
    const maxCards = Math.min(10, calcMaxCards(s.players.length));
    s.players.forEach((p) => (p.tricks = 0));
    const updated = deal(s.players, maxCards);
    s.players = updated.map((p, i) => ({ ...p, isActive: i === 0 }));
    s.gamePhase = 'playing';
    s.currentRound = {
      roundNumber: 1,
      cardsPerPlayer: maxCards,
      trumpSuit: randTrump(),
      phase: 'bidding',
      currentTrick: { id: 'trick-1', cards: [], leadSuit: undefined },
      completedTricks: [],
      bids: {},
      currentPlayer: s.players[0].id,
    };
    broadcast(roomCode);
  });

  socket.on('placeBid', ({ roomCode, bid }) => {
    const s = rooms.get(roomCode);
    if (!s || !s.currentRound) return;
    const r = s.currentRound;
    r.bids[socket.id] = bid;
    const idx = s.players.findIndex((p) => p.id === r.currentPlayer);
    r.currentPlayer = s.players[(idx + 1) % s.players.length].id;
    if (Object.keys(r.bids).length === s.players.length) {
      r.phase = 'playing';
    }
    broadcast(roomCode);
  });

  socket.on('playCard', ({ roomCode, card }) => {
    const s = rooms.get(roomCode);
    if (!s || !s.currentRound) return;
    const r = s.currentRound;
    const player = s.players.find((p) => p.id === socket.id);
    if (!player) return;
    const hand = player.cards;
    const idx = hand.findIndex((c) => c.id === card.id);
    if (idx === -1) return;
    if (!canPlay(hand[idx], hand, r.currentTrick?.leadSuit)) return;
    const play = hand.splice(idx, 1)[0];
    const trick = { ...r.currentTrick, cards: [...(r.currentTrick?.cards || [])] };
    if (!trick.leadSuit) trick.leadSuit = play.suit;
    trick.cards.push({ card: play, playerId: player.id, playerName: player.name });
    r.currentTrick = trick;
    const turnIdx = s.players.findIndex((p) => p.id === r.currentPlayer);
    r.currentPlayer = s.players[(turnIdx + 1) % s.players.length].id;

    if (trick.cards.length === s.players.length) {
      const winnerId = determineTrickWinner(trick, r.trumpSuit);
      const winIdx = s.players.findIndex((p) => p.id === winnerId);
      if (winIdx !== -1) s.players[winIdx].tricks += 1;
      trick.winner = winnerId;
      r.completedTricks.push(trick);
      r.currentTrick = { id: `trick-${r.completedTricks.length + 1}`, cards: [], leadSuit: undefined };
      r.currentPlayer = winnerId;
      const payload = { winnerId, winnerName: s.players[winIdx]?.name, trick, trump: r.trumpSuit };
      io.to(roomCode).emit('trick:resolved', payload);
      io.to(roomCode).emit('hand:resolved', payload);
    }

    // round end?
    const cardsLeft = s.players.reduce((sum, p) => sum + p.cards.length, 0);
    if (cardsLeft === 0) {
      r.phase = 'complete';
      s.scores = s.scores || {};
      const results = s.players.map((p) => {
        const bid = r.bids[p.id] ?? 0;
        const handsWon = p.tricks;
        const pts = scoreExact(bid, handsWon);
        return { playerId: p.id, name: p.name, bid, handsWon, points: pts };
      });
      results.forEach((row) => {
        const p = s.players.find((pp) => pp.id === row.playerId);
        if (!p) return;
        s.scores[p.id] = [...(s.scores[p.id] || []), row.points];
        p.score += row.points;
        row.cumulative = p.score;
      });
      s.rounds = s.rounds || [];
      s.rounds.push({ round: (r.roundNumber || 1) - 1, handSize: r.cardsPerPlayer, trump: r.trumpSuit, results });
    }
    broadcast(roomCode);
  });

  socket.on('nextRound', ({ roomCode }) => {
    const s = rooms.get(roomCode);
    if (!s || !s.currentRound) return;
    const prev = s.currentRound;
    let hand = prev.cardsPerPlayer - 1;
    if (hand < 1) {
      s.gamePhase = 'finished';
      s.currentRound = null;
      return broadcast(roomCode);
    }
    s.players.forEach((p) => (p.tricks = 0));
    const dealt = deal(s.players, hand);
    s.players = dealt;
    s.currentRound = {
      roundNumber: prev.roundNumber + 1,
      cardsPerPlayer: hand,
      trumpSuit: randTrump(),
      phase: 'bidding',
      currentTrick: { id: 'trick-1', cards: [], leadSuit: undefined },
      completedTricks: [],
      bids: {},
      currentPlayer: dealt[0].id,
    };
    broadcast(roomCode);
  });

  socket.on('disconnect', () => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    socketToRoom.delete(socket.id);
    const s = rooms.get(code);
    if (!s) return;
    const seat = s.players.find((p) => p.id === socket.id);
    if (seat) seat.connected = false;
    if (s.players.length === 0) rooms.delete(code);
    else broadcast(code);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO server running on http://0.0.0.0:${PORT}`);
});
