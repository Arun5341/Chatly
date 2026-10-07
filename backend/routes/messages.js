import express from 'express';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { isMongoConnected } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const populateUserInMemory = (userId) => {
  const u = memoryStore.users.find((user) => user._id === userId);
  if (!u) return { _id: userId, username: 'Unknown', avatar: '', status: 'offline' };
  const { password, ...withoutPass } = u;
  return withoutPass;
};

const formatMemoryMessage = (msg) => {
  const senderObj = typeof msg.sender === 'string' ? populateUserInMemory(msg.sender) : msg.sender;
  let replyObj = null;
  if (msg.replyTo) {
    if (typeof msg.replyTo === 'object' && msg.replyTo._id) {
      replyObj = msg.replyTo;
    } else {
      const parent = memoryStore.messages.find((m) => m._id === msg.replyTo);
      if (parent) replyObj = formatMemoryMessage(parent);
    }
  }

  const reactions = (msg.reactions || []).map((r) => ({
    ...r,
    user: typeof r.user === 'string' ? populateUserInMemory(r.user) : r.user,
  }));

  return {
    ...msg,
    sender: senderObj,
    replyTo: replyObj,
    reactions,
  };
};

// @route   GET /api/messages/:conversationId
router.get('/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (isMongoConnected) {
      const messages = await Message.find({ conversation: conversationId })
        .populate('sender', '-password')
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: '-password' },
        })
        .populate('reactions.user', '-password')
        .sort({ createdAt: 1 });

      res.json({ messages });
    } else {
      const messages = memoryStore.messages
        .filter((m) => m.conversation === conversationId)
        .map(formatMemoryMessage)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      res.json({ messages });
    }
  } catch (error) {
    console.error('[Get Messages Error]', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// @route   POST /api/messages
router.post('/', protect, async (req, res) => {
  try {
    const { conversationId, text, attachments, replyTo } = req.body;

    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }

    if (!text && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: 'Message text or attachment is required' });
    }

    if (isMongoConnected) {
      const message = await Message.create({
        conversation: conversationId,
        sender: req.user._id,
        text: text || '',
        attachments: attachments || [],
        replyTo: replyTo || null,
        status: 'sent',
        readBy: [req.user._id],
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: new Date(),
      });

      const populated = await Message.findById(message._id)
        .populate('sender', '-password')
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: '-password' },
        });

      res.status(201).json({ message: populated });
    } else {
      const newMessage = {
        _id: 'msg_' + Date.now(),
        conversation: conversationId,
        sender: req.user._id,
        text: text || '',
        attachments: attachments || [],
        replyTo: replyTo || null,
        reactions: [],
        status: 'sent',
        readBy: [req.user._id],
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };

      memoryStore.messages.push(newMessage);

      const conv = memoryStore.conversations.find((c) => c._id === conversationId);
      if (conv) {
        conv.lastMessage = newMessage._id;
        conv.updatedAt = new Date().toISOString();
      }

      const formatted = formatMemoryMessage(newMessage);
      res.status(201).json({ message: formatted });
    }
  } catch (error) {
    console.error('[Send Message Error]', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// @route   PUT /api/messages/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const { text } = req.body;
    const msgId = req.params.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Updated text cannot be empty' });
    }

    if (isMongoConnected) {
      const msg = await Message.findById(msgId);
      if (!msg) return res.status(404).json({ message: 'Message not found' });

      if (msg.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only edit your own messages' });
      }

      msg.text = text;
      msg.isEdited = true;
      await msg.save();

      const populated = await Message.findById(msg._id)
        .populate('sender', '-password')
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: '-password' },
        });

      res.json({ message: populated });
    } else {
      const msg = memoryStore.messages.find((m) => m._id === msgId);
      if (!msg) return res.status(404).json({ message: 'Message not found' });

      const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
      if (senderId !== req.user._id) {
        return res.status(403).json({ message: 'You can only edit your own messages' });
      }

      msg.text = text;
      msg.isEdited = true;

      const formatted = formatMemoryMessage(msg);
      res.json({ message: formatted });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error editing message' });
  }
});

// @route   DELETE /api/messages/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const msgId = req.params.id;

    if (isMongoConnected) {
      const msg = await Message.findById(msgId);
      if (!msg) return res.status(404).json({ message: 'Message not found' });

      if (msg.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only delete your own messages' });
      }

      msg.isDeleted = true;
      msg.text = 'This message was deleted';
      msg.attachments = [];
      await msg.save();

      const populated = await Message.findById(msg._id).populate('sender', '-password');
      res.json({ message: populated });
    } else {
      const msg = memoryStore.messages.find((m) => m._id === msgId);
      if (!msg) return res.status(404).json({ message: 'Message not found' });

      const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
      if (senderId !== req.user._id) {
        return res.status(403).json({ message: 'You can only delete your own messages' });
      }

      msg.isDeleted = true;
      msg.text = 'This message was deleted';
      msg.attachments = [];

      const formatted = formatMemoryMessage(msg);
      res.json({ message: formatted });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message' });
  }
});

// @route   POST /api/messages/:id/react
router.post('/:id/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const msgId = req.params.id;
    if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

    if (isMongoConnected) {
      const msg = await Message.findById(msgId);
      if (!msg) return res.status(404).json({ message: 'Message not found' });

      const existingIndex = msg.reactions.findIndex((r) => r.user.toString() === req.user._id.toString());

      if (existingIndex > -1) {
        if (msg.reactions[existingIndex].emoji === emoji) {
          msg.reactions.splice(existingIndex, 1);
        } else {
          msg.reactions[existingIndex].emoji = emoji;
        }
      } else {
        msg.reactions.push({ user: req.user._id, emoji });
      }

      await msg.save();

      const populated = await Message.findById(msg._id)
        .populate('sender', '-password')
        .populate('reactions.user', '-password');

      res.json({ message: populated });
    } else {
      const msg = memoryStore.messages.find((m) => m._id === msgId);
      if (!msg) return res.status(404).json({ message: 'Message not found' });

      msg.reactions = msg.reactions || [];
      const existingIndex = msg.reactions.findIndex((r) => {
        const uId = typeof r.user === 'object' ? r.user._id : r.user;
        return uId === req.user._id;
      });

      if (existingIndex > -1) {
        if (msg.reactions[existingIndex].emoji === emoji) {
          msg.reactions.splice(existingIndex, 1);
        } else {
          msg.reactions[existingIndex].emoji = emoji;
        }
      } else {
        msg.reactions.push({ user: req.user._id, emoji });
      }

      const formatted = formatMemoryMessage(msg);
      res.json({ message: formatted });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error adding reaction' });
  }
});

export default router;
