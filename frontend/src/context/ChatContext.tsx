import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Conversation, Message, User } from '../types';
import { useAuth } from './AuthContext';

interface ChatContextType {
  socket: Socket | null;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loadingMessages: boolean;
  typingUsers: { [key: string]: string }; // userId -> username
  unreadCounts: { [conversationId: string]: number };
  selectConversation: (conv: Conversation) => void;
  sendMessage: (text: string, attachments?: any[], replyToId?: string | null) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  createDirectChat: (recipientId: string) => Promise<Conversation>;
  createGroupChat: (name: string, members: string[], description?: string, groupImage?: string) => Promise<Conversation>;
  pinChat: (convId: string) => Promise<void>;
  muteChat: (convId: string) => Promise<void>;
  deleteConversation: (convId: string) => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  fetchConversations: () => Promise<void>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [conversationId: string]: number }>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const activeConvRef = useRef<Conversation | null>(null);
  activeConvRef.current = activeConversation;

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Socket.IO client when user & token are valid
  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketInstance = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('[Socket connected successfully]', socketInstance.id);
    });

    socketInstance.on('receive_message', (newMsg: Message) => {
      // If message is for currently active conversation, append to list
      if (activeConvRef.current && activeConvRef.current._id === newMsg.conversation) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg.conversation)) return prev;
          return [...prev, newMsg];
        });
        socketInstance.emit('mark_read', { conversationId: newMsg.conversation });
      } else {
        // Increment unread count
        setUnreadCounts((prev) => ({
          ...prev,
          [newMsg.conversation]: (prev[newMsg.conversation] || 0) + 1,
        }));
      }

      // Audio notification ping if enabled and message from someone else
      if (newMsg.sender._id !== user._id) {
        playNotificationAudio();
        showBrowserNotification(newMsg);
      }

      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) => (c._id === newMsg.conversation ? { ...c, lastMessage: newMsg, updatedAt: new Date().toISOString() } : c))
      );
    });

    socketInstance.on('user_typing', ({ conversationId, userId, username }) => {
      if (activeConvRef.current && activeConvRef.current._id === conversationId && userId !== user._id) {
        setTypingUsers((prev) => ({ ...prev, [userId]: username }));
      }
    });

    socketInstance.on('user_stopped_typing', ({ conversationId, userId }) => {
      if (activeConvRef.current && activeConvRef.current._id === conversationId) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    });

    socketInstance.on('messages_read_update', ({ conversationId }) => {
      if (activeConvRef.current && activeConvRef.current._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            status: 'read',
          }))
        );
      }
    });

    socketInstance.on('user_status_change', ({ userId, status, lastSeen }) => {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          participants: conv.participants.map((p) => (p._id === userId ? { ...p, status, lastSeen } : p)),
        }))
      );

      if (activeConvRef.current) {
        setActiveConversation((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map((p) => (p._id === userId ? { ...p, status, lastSeen } : p)),
              }
            : null
        );
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user]);

  // Play subtle futuristic audio ping for new message
  const playNotificationAudio = () => {
    try {
      if (!soundEnabled) return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be restricted before first click
    }
  };

  const showBrowserNotification = (msg: Message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const senderName = msg.sender.username || 'Chatly';
      new Notification(`New message from ${senderName}`, {
        body: msg.text || 'Sent an attachment',
        icon: msg.sender.avatar || '/chatly-logo.png',
      });
    }
  };

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('[Fetch Conversations Error]', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  const selectConversation = async (conv: Conversation) => {
    if (activeConversation && socket) {
      socket.emit('leave_chat', activeConversation._id);
    }

    setActiveConversation(conv);
    setTypingUsers({});

    // Reset unread count for selected conversation
    setUnreadCounts((prev) => ({ ...prev, [conv._id]: 0 }));

    if (socket) {
      socket.emit('join_chat', conv._id);
      socket.emit('mark_read', { conversationId: conv._id });
    }

    // Fetch messages for conversation
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/${conv._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('[Fetch Messages Error]', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (text: string, attachments: any[] = [], replyToId: string | null = null) => {
    if (!activeConversation || !token) return;

    if (socket && socket.connected) {
      socket.emit('send_message', {
        conversationId: activeConversation._id,
        text,
        attachments,
        replyTo: replyToId,
      });
    } else {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: activeConversation._id,
          text,
          attachments,
          replyTo: replyToId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      }
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    if (!token) return;
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: newText }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => prev.map((m) => (m._id === messageId ? data.message : m)));
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!token) return;
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => prev.map((m) => (m._id === messageId ? data.message : m)));
    }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!token) return;
    const res = await fetch(`/api/messages/${messageId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emoji }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => prev.map((m) => (m._id === messageId ? data.message : m)));
    }
  };

  const createDirectChat = async (recipientId: string) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch('/api/conversations/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ recipientId }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not start conversation');

    await fetchConversations();
    selectConversation(data.conversation);
    return data.conversation;
  };

  const createGroupChat = async (name: string, members: string[], description?: string, groupImage?: string) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch('/api/conversations/group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, members, description, groupImage }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not create group chat');

    await fetchConversations();
    selectConversation(data.conversation);
    return data.conversation;
  };

  const pinChat = async (convId: string) => {
    if (!token) return;
    const res = await fetch(`/api/conversations/${convId}/pin`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setConversations((prev) =>
        prev.map((c) => (c._id === convId ? { ...c, isPinned: data.isPinned } : c))
      );
    }
  };

  const muteChat = async (convId: string) => {
    if (!token) return;
    const res = await fetch(`/api/conversations/${convId}/mute`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setConversations((prev) =>
        prev.map((c) => (c._id === convId ? { ...c, isMuted: data.isMuted } : c))
      );
    }
  };

  const deleteConversation = async (convId: string) => {
    if (!token) return;
    const res = await fetch(`/api/conversations/${convId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConversation && activeConversation._id === convId) {
        setActiveConversation(null);
        setMessages([]);
      }
    }
  };

  const startTyping = () => {
    if (socket && activeConversation && user) {
      socket.emit('typing_start', {
        conversationId: activeConversation._id,
        username: user.username,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    }
  };

  const stopTyping = () => {
    if (socket && activeConversation) {
      socket.emit('typing_stop', {
        conversationId: activeConversation._id,
      });
    }
  };

  return (
    <ChatContext.Provider
      value={{
        socket,
        conversations,
        activeConversation,
        messages,
        loadingMessages,
        typingUsers,
        unreadCounts,
        selectConversation,
        sendMessage,
        editMessage,
        deleteMessage,
        reactToMessage,
        createDirectChat,
        createGroupChat,
        pinChat,
        muteChat,
        deleteConversation,
        startTyping,
        stopTyping,
        fetchConversations,
        soundEnabled,
        setSoundEnabled,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
