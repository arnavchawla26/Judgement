// src/lib/socket.ts
import type { Socket } from 'socket.io-client';

type JoinAck = { roomId: string; playerId: string; playerKey?: string; isHost?: boolean };

let socket: Socket | null = null;

/** Force 4-letter uppercase code (UI should also enforce this) */
export function normalizeCode(input: string): string {
  return (input || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
}

/** Create (or reuse) the singleton socket. Uses VITE_SERVER_URL in prod, localhost fallback in dev. */
export async function getSocket(): Promise<Socket> {
  if (socket) return socket;

  const { io } = await import('socket.io-client');

  const envUrl = (import.meta as any).env?.VITE_SERVER_URL?.trim?.() ?? '';
  const url =
    envUrl.replace?.(/\/$/, '') ||
    (typeof window !== 'undefined' && location.hostname === 'localhost'
      ? 'http://localhost:4000'
      : '');

  if (!url) {
    throw new Error('VITE_SERVER_URL is not set and no local fallback available.');
  }

  socket = io(url, {
    transports: ['websocket'],
    withCredentials: true,
    autoConnect: true,
    timeout: 8000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2500,
  });

  // Optional: lightweight diagnostics
  socket.on('connect', () => console.log('[socket] connected', socket?.id));
  socket.on('disconnect', (r) => console.log('[socket] disconnect', r));
  socket.on('connect_error', (e) => console.warn('[socket] connect_error', e?.message || e));
  socket.on('errorMsg', (msg) => console.warn('[server]', msg));

  return socket;
}

/** Subscribe to server state; returns an unsubscribe fn */
export async function onState(cb: (s: any) => void): Promise<() => void> {
  const s = await getSocket();
  s.on('state', cb);
  return () => s.off('state', cb);
}

/** Persist per-room seat key issued by server */
export function getPlayerKey(roomCode: string) {
  return localStorage.getItem(`PLAYER_KEY:${roomCode}`) || null;
}
export function setPlayerKey(roomCode: string, playerKey: string) {
  localStorage.setItem(`PLAYER_KEY:${roomCode}`, playerKey);
}

/** Persist last session for auto-rejoin */
export function setLastSession(room: string, name: string) {
  localStorage.setItem('LAST_ROOM', room);
  localStorage.setItem('LAST_NAME', name);
}
export function getLastSession() {
  return {
    room: localStorage.getItem('LAST_ROOM') || '',
    name: localStorage.getItem('LAST_NAME') || '',
  };
}
export function clearLastSession() {
  localStorage.removeItem('LAST_ROOM');
  localStorage.removeItem('LAST_NAME');
}

/** Join (or create) a room; resolves when server confirms */
export async function joinRoom(roomCode: string, playerName: string): Promise<JoinAck> {
  const code = normalizeCode(roomCode);
  if (!/^[A-Z]{4}$/.test(code)) throw new Error('Room code must be 4 letters (A–Z).');
  if (!playerName?.trim()) throw new Error('Name required.');

  const s = await getSocket();
  const playerKey = getPlayerKey(code) || undefined;

  return new Promise<JoinAck>((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup();
      reject(new Error('Join timed out. Is the server reachable?'));
    }, 8000);

    const onJoined = (payload: JoinAck) => {
      if (!payload?.roomId || payload.roomId !== code) return;
      if (payload.playerKey) setPlayerKey(code, payload.playerKey);
      setLastSession(code, playerName);
      cleanup();
      resolve(payload);
    };
    const onErr = (msg: string) => {
      cleanup();
      reject(new Error(msg || 'Server rejected join.'));
    };
    const cleanup = () => {
      clearTimeout(t);
      s.off('room:joined', onJoined);
      s.off('errorMsg', onErr);
    };

    s.once('room:joined', onJoined);
    s.once('errorMsg', onErr);
    s.emit('join', { roomCode: code, playerName, playerKey });
  });
}

/** Rejoin previous seat if possible (after refresh, tab reopen, etc.) */
export async function rejoinLast(): Promise<JoinAck | null> {
  const { room, name } = getLastSession();
  const code = normalizeCode(room);
  const playerKey = getPlayerKey(code);
  if (!/^[A-Z]{4}$/.test(code) || !name || !playerKey) return null;

  const s = await getSocket();
  return new Promise<JoinAck | null>((resolve) => {
    const t = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 6000);

    const onJoined = (payload: JoinAck) => {
      if (payload?.roomId === code) {
        if (payload.playerKey) setPlayerKey(code, payload.playerKey);
        cleanup();
        resolve(payload);
      }
    };
    const cleanup = () => {
      clearTimeout(t);
      s.off('room:joined', onJoined);
    };

    s.once('room:joined', onJoined);
    s.emit('room:rejoin', { roomCode: code, playerKey, playerName: name });
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
