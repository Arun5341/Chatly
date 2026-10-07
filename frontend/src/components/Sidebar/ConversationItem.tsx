import React from 'react';
import { Conversation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Pin, VolumeX, Users, Check, CheckCheck } from 'lucide-react';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  unreadCount?: number;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onSelect,
  unreadCount = 0,
}) => {
  const { user } = useAuth();

  // Determine conversation display avatar & title
  let name = conversation.name;
  let avatar = conversation.groupImage;
  let isOnline = false;

  if (!conversation.isGroup && user) {
    const otherUser = conversation.participants.find((p) => p._id !== user._id);
    if (otherUser) {
      name = otherUser.username;
      avatar = otherUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.username}`;
      isOnline = otherUser.status === 'online';
    }
  } else if (conversation.isGroup && !avatar) {
    avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.name || 'group'}`;
  }

  // Format relative timestamp
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const lastMsg = conversation.lastMessage;
  let previewText = 'No messages yet';
  if (lastMsg) {
    if (lastMsg.isDeleted) {
      previewText = 'This message was deleted';
    } else if (lastMsg.text) {
      previewText = lastMsg.text;
    } else if (lastMsg.attachments && lastMsg.attachments.length > 0) {
      previewText = `📎 Attachment (${lastMsg.attachments[0].fileType})`;
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center gap-3.5 p-3 mx-2 rounded-2xl cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-indigo-600/25 border border-indigo-500/30 text-white shadow-sm'
          : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
      }`}
    >
      {/* Avatar Container */}
      <div className="relative flex-shrink-0">
        {conversation.isGroup ? (
          <div className="relative">
            <img
              src={avatar}
              alt={name}
              className="w-12 h-12 rounded-2xl object-cover bg-slate-800 border border-slate-700/60"
            />
            <span className="absolute -bottom-1 -right-1 p-0.5 bg-slate-900 rounded-lg text-indigo-400">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
        ) : (
          <div className="relative">
            <img
              src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
              alt={name}
              className="w-12 h-12 rounded-2xl object-cover bg-slate-800 border border-slate-700/60"
            />
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            )}
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <h4 className="text-sm font-semibold truncate text-slate-100 group-hover:text-white">{name}</h4>
          <span className="text-[11px] font-medium text-slate-400 flex-shrink-0">
            {formatTime(conversation.updatedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1">
          <p className="text-xs text-slate-400 truncate pr-1 group-hover:text-slate-300">
            {lastMsg?.sender?._id === user?._id && (
              <span className="inline-block mr-1">
                {lastMsg?.status === 'read' ? (
                  <CheckCheck className="inline w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Check className="inline w-3.5 h-3.5 text-slate-400" />
                )}
              </span>
            )}
            {previewText}
          </p>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {conversation.isMuted && <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            {conversation.isPinned && <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />}
            {unreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-indigo-600 rounded-full shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
