import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isMongoConnected } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'chatly_super_secret_jwt_key_2026_modern_chat', {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, avatar, bio } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    if (isMongoConnected) {
      const userExists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
      if (userExists) {
        return res.status(400).json({ message: 'User with this email or username already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        bio: bio || 'Hey there! I am using Chatly.',
        status: 'online',
        lastSeen: new Date(),
      });

      const userObj = user.toObject();
      delete userObj.password;

      return res.status(201).json({
        user: userObj,
        token: generateToken(user._id),
      });
    } else {
      const exists = memoryStore.users.find(
        (u) => u.email === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
      );
      if (exists) {
        return res.status(400).json({ message: 'User with this email or username already exists' });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const newUser = {
        _id: 'user_' + Date.now(),
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        bio: bio || 'Hey there! I am using Chatly.',
        status: 'online',
        lastSeen: new Date().toISOString(),
        pinnedChats: [],
        mutedChats: [],
        privacy: { readReceipts: true, lastSeenVisibility: true },
        notificationSettings: { sound: true, desktop: true },
      };

      memoryStore.users.push(newUser);
      const { password: _, ...userWithoutPass } = newUser;

      return res.status(201).json({
        user: userWithoutPass,
        token: generateToken(newUser._id),
      });
    }
  } catch (error) {
    console.error('[Signup Error]', error);
    res.status(500).json({ message: 'Server error during sign up' });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (isMongoConnected) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user && (await bcrypt.compare(password, user.password))) {
        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();

        const userObj = user.toObject();
        delete userObj.password;

        return res.json({
          user: userObj,
          token: generateToken(user._id),
        });
      } else {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    } else {
      const user = memoryStore.users.find((u) => u.email === email.toLowerCase());
      if (user && bcrypt.compareSync(password, user.password)) {
        user.status = 'online';
        user.lastSeen = new Date().toISOString();

        const { password: _, ...userWithoutPass } = user;
        return res.json({
          user: userWithoutPass,
          token: generateToken(user._id),
        });
      } else {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    }
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// @route   POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  try {
    if (isMongoConnected) {
      await User.findByIdAndUpdate(req.user._id, { status: 'offline', lastSeen: new Date() });
    } else {
      const user = memoryStore.users.find((u) => u._id === req.user._id);
      if (user) {
        user.status = 'offline';
        user.lastSeen = new Date().toISOString();
      }
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out' });
  }
});

export default router;
