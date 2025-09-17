// src/lib/socket.ts
import type { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket) return socket;

  const { io } = await import('socket.io-client');

  // Use build-time env in prod (Vercel), fallback to localhost in dev
  const envUrl = (import.meta as any).env?.VITE_SERVER_URL?.trim?.() ?? '';
  const url = envUrl.replace?.(/\/$/, '') || (
    typeof window !== 'undefined' && location.hostname === 'localhost'
      ? 'http://localhost:4000'
      : ''
  );

  if (!url) {
    // Don’t silently fall back to demo—surface the misconfig
    throw new Error('VITE_SERVER_URL is not set and no local fallback available.');
  }

  socket = io(url, {
    transports: ['websocket'],
    withCredentials: true,
    autoConnect: true,
    timeout: 7000,
  });

  return socket;
}

export function getPlayerKey(roomCode: string) {
  const key = localStorage.getItem(`PLAYER_KEY:${roomCode}`);
  return key || null;
}

export function setPlayerKey(roomCode: string, playerKey: string) {
  localStorage.setItem(`PLAYER_KEY:${roomCode}`, playerKey);
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
