import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

export const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount >= 5) {
      console.log(`[Chatly Seed] Database already contains ${userCount} users. Skipping seed.`);
      return;
    }

    console.log(`[Chatly Seed] Seeding database with random demo users...`);

    const defaultPassword = await bcrypt.hash('password123', 10);

    const initialUsers = [
      {
        username: 'alex',
        email: 'alex@chatly.io',
        password: defaultPassword,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        bio: 'Creating smooth real-time web applications! 🚀',
        status: 'online',
        lastSeen: new Date(),
      },
      {
        username: 'sarah',
        email: 'sarah@chatly.io',
        password: defaultPassword,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
        bio: 'UI/UX Designer & Frontend Dev ✨',
        status: 'online',
        lastSeen: new Date(),
      },
      {
        username: 'david_tech',
        email: 'david@chatly.io',
        password: defaultPassword,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        bio: 'Fullstack developer & coffee enthusiast ☕',
        status: 'offline',
        lastSeen: new Date(Date.now() - 3600000),
      },
      {
        username: 'emily_pm',
        email: 'emily@chatly.io',
        password: defaultPassword,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
        bio: 'Product Manager 📊 Building Chatly features!',
        status: 'online',
        lastSeen: new Date(),
      },
      {
        username: 'michael_dev',
        email: 'michael@chatly.io',
        password: defaultPassword,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
        bio: 'Mobile iOS & Android Engineer 📱',
        status: 'offline',
        lastSeen: new Date(Date.now() - 7200000),
      },
      {
        username: 'jessica_ops',
        email: 'jessica@chatly.io',
        password: defaultPassword,
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
        bio: 'DevOps & Cybersecurity Specialist 🔒',
        status: 'online',
        lastSeen: new Date(),
      },
      {
        username: 'liam_ai',
        email: 'liam@chatly.io',
        password: defaultPassword,
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
        bio: 'AI & Machine Learning Researcher 🤖',
        status: 'offline',
        lastSeen: new Date(Date.now() - 14400000),
      },
      {
        username: 'sophia_gaming',
        email: 'sophia@chatly.io',
        password: defaultPassword,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
        bio: 'Community Lead & Gamer 🎮',
        status: 'online',
        lastSeen: new Date(),
      },
    ];

    const createdUsers = [];
    for (const u of initialUsers) {
      const user = await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
      createdUsers.push(user);
    }

    const alex = createdUsers.find((u) => u.username === 'alex');
    const sarah = createdUsers.find((u) => u.username === 'sarah');
    const david = createdUsers.find((u) => u.username === 'david_tech');
    const emily = createdUsers.find((u) => u.username === 'emily_pm');

    if (alex && sarah) {
      // 1-on-1 Direct Chat
      let directConv = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [alex._id, sarah._id] },
      });

      if (!directConv) {
        directConv = await Conversation.create({
          isGroup: false,
          participants: [alex._id, sarah._id],
        });

        const msg1 = await Message.create({
          conversation: directConv._id,
          sender: sarah._id,
          text: 'Hey Alex! Have you tested the new Chatly interface?',
          status: 'read',
          readBy: [alex._id, sarah._id],
          reactions: [{ user: alex._id, emoji: '❤️' }],
        });

        const msg2 = await Message.create({
          conversation: directConv._id,
          sender: alex._id,
          text: 'Yes! The smooth glassmorphic UI and real-time Socket.IO sync are super fast 🔥',
          replyTo: msg1._id,
          status: 'read',
          readBy: [alex._id, sarah._id],
        });

        directConv.lastMessage = msg2._id;
        await directConv.save();
      }

      // Group Chat
      let groupConv = await Conversation.findOne({ name: 'Chatly Core Team' });
      if (!groupConv) {
        groupConv = await Conversation.create({
          isGroup: true,
          name: 'Chatly Core Team',
          description: 'Collaborating on Chatly real-time features',
          groupImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=300&q=80',
          admin: alex._id,
          participants: [alex._id, sarah._id, david._id, emily._id],
        });

        const groupMsg = await Message.create({
          conversation: groupConv._id,
          sender: emily._id,
          text: 'Welcome everyone to the Chatly Core Team group! 🚀',
          status: 'read',
          readBy: [alex._id, sarah._id, david._id, emily._id],
          reactions: [{ user: alex._id, emoji: '🎉' }],
        });

        groupConv.lastMessage = groupMsg._id;
        await groupConv.save();
      }
    }

    console.log(`[Chatly Seed] Successfully seeded ${createdUsers.length} random users and sample conversations!`);
  } catch (error) {
    console.error('[Chatly Seed Error]', error.message);
  }
};
