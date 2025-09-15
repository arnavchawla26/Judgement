import type { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export async function getSocket() {
  if (socket) return socket;
  // Dynamically import to keep optional until installed
  const { io } = await import('socket.io-client');
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  socket = io(`http://${host}:4000`, {
    transports: ['websocket'],
    autoConnect: true,
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
