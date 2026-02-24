import { io, Socket } from 'socket.io-client';
import type { ConnectionStatus } from '@/types/momo';
import sound from '@/utils/sounds';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

let socket: Socket | null = null;
let connectionStatus: ConnectionStatus = 'disconnected';
let statusListeners: ((status: ConnectionStatus) => void)[] = [];

export function getSocket(): Socket | null {
  return socket;
}

export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

export function onConnectionStatusChange(cb: (status: ConnectionStatus) => void) {
  statusListeners.push(cb);
  return () => {
    statusListeners = statusListeners.filter(l => l !== cb);
  };
}

function setStatus(s: ConnectionStatus) {
  connectionStatus = s;
  statusListeners.forEach(cb => cb(s));
}

export function connectSocket(serverUrl?: string): Socket {
  if (socket) {
    socket.disconnect();
  }
  
  const url = serverUrl || SERVER_URL;
  setStatus('connecting');
  
  socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => { setStatus('connected'); sound.startup(); });
  socket.on('disconnect', () => { setStatus('disconnected'); sound.disconnect(); });
  socket.on('reconnect_attempt', () => setStatus('connecting'));
  socket.on('reconnect', () => { sound.reconnect(); });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    setStatus('disconnected');
  }
}
