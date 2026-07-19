import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

let socketInstance = null;

/**
 * useSocket — singleton Socket.IO hook.
 *
 * Returns the socket instance and helpers to join/leave rooms.
 * Automatically authenticates with the current access token.
 */
const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Reuse existing connection
    if (socketInstance && socketInstance.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    socketInstance = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socketRef.current = socketInstance;

    return () => {
      // Don't disconnect on unmount — keep the singleton alive
    };
  }, [isAuthenticated, accessToken]);

  const joinSession = useCallback((sessionId) => {
    if (socketRef.current) {
      socketRef.current.emit('join:session', { sessionId });
    }
  }, []);

  const joinCourse = useCallback((courseId) => {
    if (socketRef.current) {
      socketRef.current.emit('join:course', { courseId });
    }
  }, []);

  const leaveSession = useCallback((sessionId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave:session', { sessionId });
    }
  }, []);

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  return {
    socket: socketRef.current,
    joinSession,
    joinCourse,
    leaveSession,
    on,
    off,
  };
};

export { useSocket };
