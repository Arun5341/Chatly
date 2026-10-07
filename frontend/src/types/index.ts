export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  status?: 'online' | 'offline';
  lastSeen?: string;
  pinnedChats?: string[];
  mutedChats?: string[];
  privacy?: {
    readReceipts?: boolean;
    lastSeenVisibility?: boolean;
  };
  notificationSettings?: {
    sound?: boolean;
    desktop?: boolean;
  };
}

export interface Attachment {
  _id?: string;
  url: string;
  fileType: 'image' | 'document' | 'audio' | 'video' | 'other';
  fileName?: string;
  fileSize?: number;
  publicId?: string;
}

export interface Reaction {
  _id?: string;
  user: User | string;
  emoji: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  text: string;
  attachments?: Attachment[];
  replyTo?: Message | null;
  reactions?: Reaction[];
  status?: 'sent' | 'delivered' | 'read';
  readBy?: string[];
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  _id: string;
  isGroup: boolean;
  name?: string;
  groupImage?: string;
  description?: string;
  admin?: User | string;
  participants: User[];
  lastMessage?: Message | null;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  recipient: string;
  sender: User;
  type: 'message' | 'reaction' | 'group_invite';
  conversation?: string;
  message?: string;
  read: boolean;
  createdAt: string;
}
