import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['message', 'reaction', 'group_invite'], required: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
