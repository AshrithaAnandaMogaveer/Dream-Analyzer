import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

const SocketContext = createContext();

// Custom hook to use the socket
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { user } = useAuth();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const initializeSocket = useCallback(() => {
    if (!user) return null;

    // Prevent multiple initializations
    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    // Clean up any existing socket
    if (socketRef.current) {
      socketRef.current.off();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('🔌 Initializing socket connection...');
    
    try {
      const socket = io(process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket'],
        upgrade: true,
        autoConnect: true,
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        timeout: 10000,
        closeOnBeforeunload: false, // Prevent closing before unload to avoid race conditions
      });

      // Connection established
      socket.on('connect', () => {
        if (!connected) {
          console.log('✅ Socket connected:', socket.id);
        }
        setConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        // Avoid toast spam on reconnect
        
        // Join user's room after connection
        try {
          const uid = user?._id || user?.id;
          if (uid) {
            socket.emit('join-room', uid);
          }
        } catch (error) {
          console.error('Error joining room:', error);
        }
      });

      // Connection error
      socket.on('connect_error', (error) => {
        console.debug('Socket connect_error (suppressed):', error?.message);
        setConnected(false);
        
        // Only show error toast if we're not in a reconnection attempt
        if (reconnectAttempts.current === 0) {
          toast.error('Connection error. Attempting to reconnect...');
        }
        
        reconnectAttempts.current += 1;
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          const errorMsg = 'Connection failed. Please check your internet connection and refresh the page.';
          setConnectionError(errorMsg);
          toast.error(errorMsg, { duration: 5000 });
        }
      });

      // Reconnection events
      socket.on('reconnect_attempt', (attempt) => {
        if (reconnectAttempts.current !== attempt) {
          reconnectAttempts.current = attempt;
          console.log(`🔄 Reconnection attempt ${attempt}`);
        }
      });

      socket.on('reconnect_failed', () => {
        const errorMsg = 'Failed to connect to server. Please refresh the page.';
        console.error('❌ Failed to reconnect to socket');
        setConnectionError(errorMsg);
        toast.error(errorMsg);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setConnected(false);
        
        if (reason === 'io server disconnect') {
          // The disconnection was initiated by the server, we need to reconnect manually
          socket.connect();
        }
      });
      
      // Store the socket in ref
      socketRef.current = socket;
      return socket;
      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setConnected(false);
        
        if (reason === 'io server disconnect') {
          // The server has forcefully disconnected the socket
          toast.error('Disconnected from server. Please log in again.');
        } else if (reason !== 'io client disconnect') {
          // Only attempt to reconnect if we didn't manually disconnect
          toast('Disconnected. Attempting to reconnect...');
        }
      });

      // Handle reconnection after successful reconnect
      socket.on('reconnect', (attemptNumber) => {
        console.log('✅ Reconnected after', attemptNumber, 'attempts');
        setConnected(true);
        // no toast to avoid duplicates
        
        // Re-join user's room after reconnection
        try {
          const uid = user?._id || user?.id;
          if (uid) {
            socket.emit('join-room', uid);
          }
        } catch (error) {
          console.error('Error rejoining room after reconnect:', error);
        }
      });

      return socket;
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      setConnectionError(error.message);
      toast.error('Failed to connect to server');
      return null;
    }
  }, [user, maxReconnectAttempts]);

  // Initialize socket when user logs in or changes
  useEffect(() => {
    const socket = initializeSocket();
    
    // Store the socket reference
    if (socket) {
      socketRef.current = socket;
      
      // Cleanup function
      return () => {
        console.log('🧹 Cleaning up socket connection...');
        if (socket) {
          socket.off('connect');
          socket.off('connect_error');
          socket.off('reconnect_attempt');
          socket.off('reconnect_failed');
          socket.off('disconnect');
          socket.off('reconnect');
          socket.disconnect();
          socketRef.current = null;
        }
        setConnected(false);
      };
    }
  }, [initializeSocket]);

  const joinRoom = (room) => {
    const s = socketRef.current;
    if (s && connected) {
      s.emit('join-room', room);
    }
  };

  const leaveRoom = (room) => {
    const s = socketRef.current;
    if (s && connected) {
      s.emit('leave-room', room);
    }
  };

  const emit = (event, data) => {
    const s = socketRef.current;
    if (s && connected) {
      s.emit(event, data);
    }
  };

  const on = (event, callback) => {
    const s = socketRef.current;
    if (s) {
      s.on(event, callback);
    }
  };

  const off = (event, callback) => {
    const s = socketRef.current;
    if (s) {
      s.off(event, callback);
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const value = React.useMemo(() => ({
    socket: socketRef.current,
    isConnected: connected,
    connectionError,
    joinRoom,
    leaveRoom,
    emit,
    on,
    off
  }), [connected, connectionError, joinRoom, leaveRoom, emit, on, off]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};












