import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('cf_token');
    const wsBase = import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL?.replace('/api', '') ||
      'http://localhost:5000';

    const s = io(wsBase, {
      withCredentials: true,
      auth: { token: token || '' },
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      timeout: 8000,
      autoConnect: true,
    });

    s.on('connect_error', () => {});
    s.on('reconnect_error', () => {});
    s.on('reconnect_failed', () => {});

    s.on('connect', () => { s.emit('join', user.id); });

    s.on('notification', (notif) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
    });

    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  const markRead = (ids) => {
    if (ids.length === 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } else {
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - ids.length));
    }
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, setNotifications, unreadCount, setUnreadCount, markRead }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
