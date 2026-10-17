# Judgement

The trick-taking card game Judgement (also called Oh Hell) in the browser:
a React and TypeScript client with a Socket.IO server for playing over a LAN
or the internet. I built it in September 2025. Most of the work went into
the mobile layout and into keeping a seat when a phone locks or a tab reloads.

## What it does

- Rooms with a 4-letter code. The first player in is the host and only the
  host can start. Up to 10 players; hand size is `min(10, 52 // players)` and
  shrinks by one card each round until the round with one card, then the
  game ends.
- Trump is random each round. Bids go round the table, the rest of the game
  is standard trick play (follow suit if you can, highest trump wins, else
  highest of the led suit). Scoring: an exact bid of 0 or 1 scores 10, any
  other exact bid scores 10 times the bid, a missed bid scores nothing.
- A seat survives a refresh or a locked phone: the server issues a player
  key, the client keeps it in `localStorage` and rejoins the same seat.
- Separate desktop and mobile layouts (`src/layouts/`), a scoreboard modal,
  and a short animation when a trick is collected.
- Entering a name with no room code starts a local demo game on one device
  with three auto-playing bots, driven by the reducer in
  `src/utils/gameLogic.ts`; the online game is authoritative on the server.

Stack: Vite, React 18, TypeScript, Tailwind, shadcn/ui components,
framer-motion; Express and Socket.IO on the server (`server/index.js`,
one file, in-memory rooms).

## Run it

```sh
npm i
cp .env.example .env        # VITE_SERVER_URL, defaults to http://localhost:4000
npm run server              # Socket.IO server on :4000
npm run dev                 # Vite on :8080
```

`npm run dev:lan` serves on all interfaces so phones on the same Wi-Fi can
join. Set `CLIENT_ORIGIN` (comma-separated) on the server to restrict CORS;
unset, it allows any origin. `PORT` overrides 4000.

To deploy, `npm run build` and host `dist/` on any static host, with
`VITE_SERVER_URL` pointing at wherever `server/index.js` is running.

## What I would change

- Rooms live in memory on one Node process. A server restart ends every
  game, and there is no persistence or horizontal scaling.
- In online mode the "add bots" option seats three bots but the server has no
  logic to bid or play for them, so a game with bots stalls on their turn.
  Bots only work in the local demo game.
- `src/config.ts` ships with `DEV_MODE = true` and `DEV_MIN_PLAYERS = 1`, and
  the server has the same constant, so a game can start with one player.
  Production should require three.
- Rounds only count down from the maximum hand; the up-and-down variant
  people often play is not implemented, nor is the house rule that the bids
  may not sum to the hand size (`DISALLOW_SUM_EQUALS_HANDSIZE` is off and the
  server does not enforce it).
- The server does not check that it is your turn before accepting a bid or a
  card; it only checks that the card is in your hand and follows suit.
- `src/integrations/supabase/` is generated scaffolding; nothing imports it. It
  should be deleted. (The key in it is a
  client-side anon key, not a secret.)
- No tests. The game logic in `gameLogic.ts` and the server's trick winner
  function are small enough to test, and should be.

## License

MIT, see [LICENSE](LICENSE).
