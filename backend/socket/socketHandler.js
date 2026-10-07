import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { isMongoConnected } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';

// Track online socket connections by userId
const userSocketsMap = new Map(); // userId -> Set(socketId)

export const initSocketHandler = (io) => {
  // Middleware to authenticate socket connection via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chatly_super_secret_jwt_key_2026_modern_chat');
      socket.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket Connected] User ${userId} connected on socket ${socket.id}`);

    // Track active user sockets
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, new Set());
    }
    userSocketsMap.get(userId).add(socket.id);

    // Join personal user notification room
    socket.join(`user_${userId}`);

    // Update presence status to online
    await updateUserPresence(userId, 'online');
    io.emit('user_status_change', { userId, status: 'online', lastSeen: new Date().toISOString() });

    // Event: Join chat room
    socket.on('join_chat', (conversationId) => {
      if (conversationId) {
        socket.join(`chat_${conversationId}`);
        console.log(`[Socket] User ${userId} joined room chat_${conversationId}`);
      }
    });

    // Event: Leave chat room
    socket.on('leave_chat', (conversationId) => {
      if (conversationId) {
        socket.leave(`chat_${conversationId}`);
        console.log(`[Socket] User ${userId} left room chat_${conversationId}`);
      }
    });

    // Event: Typing start
    socket.on('typing_start', ({ conversationId, username }) => {
      socket.to(`chat_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        username,
      });
    });

    // Event: Typing stop
    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(`chat_${conversationId}`).emit('user_stopped_typing', {
        conversationId,
        userId,
      });
    });

    // Event: Send Message (Real-time dispatch)
    socket.on('send_message', async (messageData) => {
      try {
        const { conversationId, text, attachments, replyTo } = messageData;
        let formattedMessage = null;
        let participantIds = [];

        if (isMongoConnected) {
          const newMsg = await Message.create({
            conversation: conversationId,
            sender: userId,
            text: text || '',
            attachments: attachments || [],
            replyTo: replyTo || null,
            status: 'sent',
            readBy: [userId],
          });

          const conv = await Conversation.findByIdAndUpdate(
            conversationId,
            { lastMessage: newMsg._id, updatedAt: new Date() },
            { new: true }
          );

          participantIds = conv ? conv.participants.map((p) => p.toString()) : [];

          formattedMessage = await Message.findById(newMsg._id)
            .populate('sender', '-password')
            .populate({
              path: 'replyTo',
              populate: { path: 'sender', select: '-password' },
            });
        } else {
          const newMsg = {
            _id: 'msg_' + Date.now(),
            conversation: conversationId,
            sender: userId,
            text: text || '',
            attachments: attachments || [],
            replyTo: replyTo || null,
            reactions: [],
            status: 'sent',
            readBy: [userId],
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toISOString(),
          };

          memoryStore.messages.push(newMsg);

          const conv = memoryStore.conversations.find((c) => c._id === conversationId);
          if (conv) {
            conv.lastMessage = newMsg._id;
            conv.updatedAt = new Date().toISOString();
            participantIds = conv.participants || [];
          }

          const senderObj = memoryStore.users.find((u) => u._id === userId);
          const { password, ...senderWithoutPass } = senderObj || { _id: userId, username: 'User' };

          let replyObj = null;
          if (replyTo) {
            const parent = memoryStore.messages.find((m) => m._id === replyTo);
            if (parent) {
              const pSender = memoryStore.users.find((u) => u._id === parent.sender);
              replyObj = { ...parent, sender: pSender ? { _id: pSender._id, username: pSender.username } : null };
            }
          }

          formattedMessage = {
            ...newMsg,
            sender: senderWithoutPass,
            replyTo: replyObj,
          };
        }

        // Emit to current chat room
        io.to(`chat_${conversationId}`).emit('receive_message', formattedMessage);

        // Notify all conversation participants for unread count & sidebar updates
        participantIds.forEach((pId) => {
          if (pId !== userId) {
            io.to(`user_${pId}`).emit('new_message_notification', {
              conversationId,
              message: formattedMessage,
            });
          }
        });
      } catch (err) {
        console.error('[Socket Send Message Error]', err);
      }
    });

    // Event: Read Receipts
    socket.on('mark_read', async ({ conversationId }) => {
      try {
        if (isMongoConnected) {
          await Message.updateMany(
            { conversation: conversationId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId }, $set: { status: 'read' } }
          );
        } else {
          memoryStore.messages.forEach((m) => {
            if (m.conversation === conversationId && !m.readBy.includes(userId)) {
              m.readBy.push(userId);
              m.status = 'read';
            }
          });
        }

        io.to(`chat_${conversationId}`).emit('messages_read_update', {
          conversationId,
          readByUserId: userId,
        });
      } catch (err) {
        console.error('[Socket Mark Read Error]', err);
      }
    });

    // Event: Disconnect
    socket.on('disconnect', async () => {
      console.log(`[Socket Disconnected] Socket ${socket.id} disconnected for user ${userId}`);
      const sockets = userSocketsMap.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSocketsMap.delete(userId);
          const lastSeenTime = new Date().toISOString();
          await updateUserPresence(userId, 'offline', lastSeenTime);
          io.emit('user_status_change', { userId, status: 'offline', lastSeen: lastSeenTime });
        }
      }
    });
  });
};

const updateUserPresence = async (userId, status, lastSeen = new Date()) => {
  if (isMongoConnected) {
    try {
      await User.findByIdAndUpdate(userId, { status, lastSeen });
    } catch (e) {
      console.error('[Presence Update Error]', e.message);
    }
  } else {
    const user = memoryStore.users.find((u) => u._id === userId);
    if (user) {
      user.status = status;
      user.lastSeen = typeof lastSeen === 'string' ? lastSeen : lastSeen.toISOString();
    }
  }
};
