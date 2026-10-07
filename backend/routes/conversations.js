import express from 'express';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { isMongoConnected } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper to populate user details in memory fallback
const populateUserInMemory = (userId) => {
  const u = memoryStore.users.find((user) => user._id === userId);
  if (!u) return { _id: userId, username: 'Unknown', avatar: '', status: 'offline', lastSeen: new Date() };
  const { password, ...withoutPass } = u;
  return withoutPass;
};

// Helper to populate conversation details in memory fallback
const formatMemoryConversation = (conv, currentUserId) => {
  const participants = (conv.participants || []).map(populateUserInMemory);
  let lastMsg = null;
  if (conv.lastMessage) {
    lastMsg = memoryStore.messages.find((m) => m._id === conv.lastMessage) || null;
    if (lastMsg && typeof lastMsg.sender === 'string') {
      lastMsg = { ...lastMsg, sender: populateUserInMemory(lastMsg.sender) };
    }
  }

  const currentUser = memoryStore.users.find((u) => u._id === currentUserId);
  const isPinned = currentUser?.pinnedChats?.includes(conv._id) || false;
  const isMuted = currentUser?.mutedChats?.includes(conv._id) || false;

  return {
    ...conv,
    participants,
    lastMessage: lastMsg,
    isPinned,
    isMuted,
  };
};

// @route   GET /api/conversations
router.get('/', protect, async (req, res) => {
  try {
    if (isMongoConnected) {
      const conversations = await Conversation.find({
        participants: req.user._id,
      })
        .populate('participants', '-password')
        .populate({
          path: 'lastMessage',
          populate: { path: 'sender', select: '-password' },
        })
        .populate('admin', '-password')
        .sort({ updatedAt: -1 });

      const user = await User.findById(req.user._id);

      const formatted = conversations.map((conv) => {
        const convObj = conv.toObject();
        convObj.isPinned = user.pinnedChats.includes(conv._id);
        convObj.isMuted = user.mutedChats.includes(conv._id);
        return convObj;
      });

      res.json({ conversations: formatted });
    } else {
      const convs = memoryStore.conversations
        .filter((c) => c.participants.includes(req.user._id))
        .map((c) => formatMemoryConversation(c, req.user._id))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      res.json({ conversations: convs });
    }
  } catch (error) {
    console.error('[Get Conversations Error]', error);
    res.status(500).json({ message: 'Error fetching conversations' });
  }
});

// @route   POST /api/conversations/direct
router.post('/direct', protect, async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) return res.status(400).json({ message: 'Recipient ID is required' });

    if (isMongoConnected) {
      let conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [req.user._id, recipientId], $size: 2 },
      })
        .populate('participants', '-password')
        .populate({
          path: 'lastMessage',
          populate: { path: 'sender', select: '-password' },
        });

      if (!conversation) {
        conversation = await Conversation.create({
          isGroup: false,
          participants: [req.user._id, recipientId],
        });

        conversation = await Conversation.findById(conversation._id).populate('participants', '-password');
      }

      const convObj = conversation.toObject();
      const user = await User.findById(req.user._id);
      convObj.isPinned = user.pinnedChats.includes(conversation._id);
      convObj.isMuted = user.mutedChats.includes(conversation._id);

      res.status(201).json({ conversation: convObj });
    } else {
      let conv = memoryStore.conversations.find(
        (c) => !c.isGroup && c.participants.includes(req.user._id) && c.participants.includes(recipientId)
      );

      if (!conv) {
        conv = {
          _id: 'conv_' + Date.now(),
          isGroup: false,
          name: '',
          groupImage: '',
          description: '',
          admin: null,
          participants: [req.user._id, recipientId],
          lastMessage: null,
          unreadCounts: {},
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        memoryStore.conversations.push(conv);
      }

      const formatted = formatMemoryConversation(conv, req.user._id);
      res.status(201).json({ conversation: formatted });
    }
  } catch (error) {
    console.error('[Create Direct Conversation Error]', error);
    res.status(500).json({ message: 'Error creating conversation' });
  }
});

// @route   POST /api/conversations/group
router.post('/group', protect, async (req, res) => {
  try {
    const { name, members, description, groupImage } = req.body;
    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: 'Group name and at least one member are required' });
    }

    const participants = Array.from(new Set([req.user._id, ...members]));

    if (isMongoConnected) {
      const group = await Conversation.create({
        isGroup: true,
        name,
        description: description || '',
        groupImage: groupImage || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
        admin: req.user._id,
        participants,
      });

      const populatedGroup = await Conversation.findById(group._id)
        .populate('participants', '-password')
        .populate('admin', '-password');

      res.status(201).json({ conversation: populatedGroup });
    } else {
      const group = {
        _id: 'conv_group_' + Date.now(),
        isGroup: true,
        name,
        description: description || '',
        groupImage: groupImage || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
        admin: req.user._id,
        participants,
        lastMessage: null,
        unreadCounts: {},
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      memoryStore.conversations.push(group);
      const formatted = formatMemoryConversation(group, req.user._id);
      res.status(201).json({ conversation: formatted });
    }
  } catch (error) {
    console.error('[Create Group Error]', error);
    res.status(500).json({ message: 'Error creating group chat' });
  }
});

// @route   PUT /api/conversations/:id/pin
router.put('/:id/pin', protect, async (req, res) => {
  try {
    const convId = req.params.id;

    if (isMongoConnected) {
      const user = await User.findById(req.user._id);
      const isPinned = user.pinnedChats.includes(convId);

      if (isPinned) {
        user.pinnedChats = user.pinnedChats.filter((id) => id.toString() !== convId);
      } else {
        user.pinnedChats.push(convId);
      }

      await user.save();
      res.json({ isPinned: !isPinned, conversationId: convId });
    } else {
      const user = memoryStore.users.find((u) => u._id === req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.pinnedChats = user.pinnedChats || [];
      const index = user.pinnedChats.indexOf(convId);
      let isPinned = false;

      if (index > -1) {
        user.pinnedChats.splice(index, 1);
      } else {
        user.pinnedChats.push(convId);
        isPinned = true;
      }

      res.json({ isPinned, conversationId: convId });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error pinning conversation' });
  }
});

// @route   PUT /api/conversations/:id/mute
router.put('/:id/mute', protect, async (req, res) => {
  try {
    const convId = req.params.id;

    if (isMongoConnected) {
      const user = await User.findById(req.user._id);
      const isMuted = user.mutedChats.includes(convId);

      if (isMuted) {
        user.mutedChats = user.mutedChats.filter((id) => id.toString() !== convId);
      } else {
        user.mutedChats.push(convId);
      }

      await user.save();
      res.json({ isMuted: !isMuted, conversationId: convId });
    } else {
      const user = memoryStore.users.find((u) => u._id === req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.mutedChats = user.mutedChats || [];
      const index = user.mutedChats.indexOf(convId);
      let isMuted = false;

      if (index > -1) {
        user.mutedChats.splice(index, 1);
      } else {
        user.mutedChats.push(convId);
        isMuted = true;
      }

      res.json({ isMuted, conversationId: convId });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error muting conversation' });
  }
});

// @route   DELETE /api/conversations/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const convId = req.params.id;

    if (isMongoConnected) {
      await Conversation.findByIdAndDelete(convId);
      await Message.deleteMany({ conversation: convId });
      res.json({ message: 'Conversation deleted successfully', conversationId: convId });
    } else {
      memoryStore.conversations = memoryStore.conversations.filter((c) => c._id !== convId);
      memoryStore.messages = memoryStore.messages.filter((m) => m.conversation !== convId);
      res.json({ message: 'Conversation deleted successfully', conversationId: convId });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting conversation' });
  }
});

// @route   PUT /api/conversations/:id/group/members
router.put('/:id/group/members', protect, async (req, res) => {
  try {
    const { action, userId } = req.body; // action: 'add' | 'remove'
    const convId = req.params.id;

    if (isMongoConnected) {
      const conv = await Conversation.findById(convId);
      if (!conv || !conv.isGroup) return res.status(400).json({ message: 'Group not found' });

      if (conv.admin.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only group admins can manage members' });
      }

      if (action === 'add') {
        if (!conv.participants.includes(userId)) conv.participants.push(userId);
      } else if (action === 'remove') {
        conv.participants = conv.participants.filter((p) => p.toString() !== userId);
      }

      await conv.save();
      const updated = await Conversation.findById(convId)
        .populate('participants', '-password')
        .populate('admin', '-password');

      res.json({ conversation: updated });
    } else {
      const conv = memoryStore.conversations.find((c) => c._id === convId && c.isGroup);
      if (!conv) return res.status(400).json({ message: 'Group not found' });

      if (conv.admin !== req.user._id) {
        return res.status(403).json({ message: 'Only group admins can manage members' });
      }

      if (action === 'add') {
        if (!conv.participants.includes(userId)) conv.participants.push(userId);
      } else if (action === 'remove') {
        conv.participants = conv.participants.filter((p) => p !== userId);
      }

      const formatted = formatMemoryConversation(conv, req.user._id);
      res.json({ conversation: formatted });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating group members' });
  }
});

// @route   PUT /api/conversations/:id/group/leave
router.put('/:id/group/leave', protect, async (req, res) => {
  try {
    const convId = req.params.id;

    if (isMongoConnected) {
      const conv = await Conversation.findById(convId);
      if (!conv || !conv.isGroup) return res.status(400).json({ message: 'Group not found' });

      conv.participants = conv.participants.filter((p) => p.toString() !== req.user._id.toString());
      if (conv.admin.toString() === req.user._id.toString() && conv.participants.length > 0) {
        conv.admin = conv.participants[0];
      }

      await conv.save();
      res.json({ message: 'Left group successfully', conversationId: convId });
    } else {
      const conv = memoryStore.conversations.find((c) => c._id === convId && c.isGroup);
      if (!conv) return res.status(400).json({ message: 'Group not found' });

      conv.participants = conv.participants.filter((p) => p !== req.user._id);
      if (conv.admin === req.user._id && conv.participants.length > 0) {
        conv.admin = conv.participants[0];
      }

      res.json({ message: 'Left group successfully', conversationId: convId });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error leaving group' });
  }
});

export default router;
