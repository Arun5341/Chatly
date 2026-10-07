import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: 'Hey there! I am using Chatly.' },
    status: { type: String, enum: ['online', 'offline'], default: 'offline' },
    lastSeen: { type: Date, default: Date.now },
    pinnedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }],
    mutedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }],
    privacy: {
      readReceipts: { type: Boolean, default: true },
      lastSeenVisibility: { type: Boolean, default: true },
    },
    notificationSettings: {
      sound: { type: Boolean, default: true },
      desktop: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
