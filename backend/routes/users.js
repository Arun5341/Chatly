import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { isMongoConnected } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users/search?q=
router.get('/search', protect, async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      return res.json({ users: [] });
    }

    if (isMongoConnected) {
      const users = await User.find({
        _id: { $ne: req.user._id },
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      }).select('-password');
      res.json({ users });
    } else {
      const q = query.toLowerCase();
      const users = memoryStore.users
        .filter(
          (u) =>
            u._id !== req.user._id &&
            (u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        )
        .map(({ password, ...u }) => u);
      res.json({ users });
    }
  } catch (error) {
    console.error('[Search Users Error]', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

// @route   PUT /api/users/profile
router.get('/all', protect, async (req, res) => {
  try {
    if (isMongoConnected) {
      const users = await User.find({ _id: { $ne: req.user._id } }).select('-password');
      res.json({ users });
    } else {
      const users = memoryStore.users
        .filter((u) => u._id !== req.user._id)
        .map(({ password, ...u }) => u);
      res.json({ users });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// @route   PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { username, bio, avatar, privacy, notificationSettings } = req.body;

    if (isMongoConnected) {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (username && username !== user.username) {
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ message: 'Username is already taken' });
        user.username = username;
      }

      if (bio !== undefined) user.bio = bio;
      if (avatar !== undefined) user.avatar = avatar;
      if (privacy) user.privacy = { ...user.privacy, ...privacy };
      if (notificationSettings) user.notificationSettings = { ...user.notificationSettings, ...notificationSettings };

      await user.save();
      const updatedObj = user.toObject();
      delete updatedObj.password;

      res.json({ user: updatedObj });
    } else {
      const user = memoryStore.users.find((u) => u._id === req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (username && username !== user.username) {
        const existing = memoryStore.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
        if (existing) return res.status(400).json({ message: 'Username is already taken' });
        user.username = username;
      }

      if (bio !== undefined) user.bio = bio;
      if (avatar !== undefined) user.avatar = avatar;
      if (privacy) user.privacy = { ...user.privacy, ...privacy };
      if (notificationSettings) user.notificationSettings = { ...user.notificationSettings, ...notificationSettings };

      const { password: _, ...updatedWithoutPass } = user;
      res.json({ user: updatedWithoutPass });
    }
  } catch (error) {
    console.error('[Update Profile Error]', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// @route   PUT /api/users/password
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }

    if (isMongoConnected) {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } else {
      const user = memoryStore.users.find((u) => u._id === req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (!bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(400).json({ message: 'Incorrect current password' });
      }

      user.password = bcrypt.hashSync(newPassword, 10);
      res.json({ message: 'Password updated successfully' });
    }
  } catch (error) {
    console.error('[Update Password Error]', error);
    res.status(500).json({ message: 'Error updating password' });
  }
});

// @route   GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
  try {
    if (isMongoConnected) {
      const user = await User.findById(req.params.id).select('-password');
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json({ user });
    } else {
      const user = memoryStore.users.find((u) => u._id === req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const { password, ...userWithoutPass } = user;
      res.json({ user: userWithoutPass });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

export default router;
