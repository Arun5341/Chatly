import express from 'express';
import Notification from '../models/Notification.js';
import { isMongoConnected } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const populateUserInMemory = (userId) => {
  const u = memoryStore.users.find((user) => user._id === userId);
  if (!u) return { _id: userId, username: 'Unknown', avatar: '' };
  const { password, ...withoutPass } = u;
  return withoutPass;
};

// @route   GET /api/notifications
router.get('/', protect, async (req, res) => {
  try {
    if (isMongoConnected) {
      const notifications = await Notification.find({ recipient: req.user._id })
        .populate('sender', '-password')
        .populate('conversation')
        .sort({ createdAt: -1 });
      res.json({ notifications });
    } else {
      const notifications = memoryStore.notifications
        .filter((n) => n.recipient === req.user._id)
        .map((n) => ({
          ...n,
          sender: typeof n.sender === 'string' ? populateUserInMemory(n.sender) : n.sender,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json({ notifications });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// @route   PUT /api/notifications/:id/read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notifId = req.params.id;
    if (isMongoConnected) {
      await Notification.findByIdAndUpdate(notifId, { read: true });
    } else {
      const notif = memoryStore.notifications.find((n) => n._id === notifId);
      if (notif) notif.read = true;
    }
    res.json({ message: 'Notification marked as read', notificationId: notifId });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// @route   PUT /api/notifications/read-all
router.put('/read-all', protect, async (req, res) => {
  try {
    if (isMongoConnected) {
      await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    } else {
      memoryStore.notifications.forEach((n) => {
        if (n.recipient === req.user._id) n.read = true;
      });
    }
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

export default router;
