import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { Message } from '../../types';
import {
  Pin,
  VolumeX,
  Trash2,
  Users,
  Search,
  ArrowLeft,
  X,
  MessageSquare,
} from 'lucide-react';

interface ChatAreaProps {
  onBackToSidebar?: () => void;
  onOpenGroupInfo?: () => void;
  onSelectFile: (file: File) => void;
  onPreviewImage: (url: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onBackToSidebar,
  onOpenGroupInfo,
  onSelectFile,
  onPreviewImage,
}) => {
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    loadingMessages,
    typingUsers,
    pinChat,
    muteChat,
    deleteConversation,
  } = useChat();

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchInChat, setSearchInChat] = useState<string>('');
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/70 text-center select-none">
        <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-3xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 shadow-xl">
          <MessageSquare className="w-10 h-10 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Chatly</h2>
        <p className="max-w-md text-sm text-slate-400">
          Select a conversation from the sidebar or search users to start chatting instantly in real-time.
        </p>
      </div>
    );
  }

  // Active recipient info calculation
  let title = activeConversation.name;
  let avatar = activeConversation.groupImage;
  let subtitle = '';

  if (!activeConversation.isGroup && user) {
    const recipient = activeConversation.participants.find((p) => p._id !== user._id);
    if (recipient) {
      title = recipient.username;
      avatar = recipient.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${recipient.username}`;
      subtitle = recipient.status === 'online' ? 'Online' : 'Offline';
    }
  } else if (activeConversation.isGroup) {
    if (!avatar) avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${activeConversation.name}`;
    subtitle = `${activeConversation.participants.length} members`;
  }

  // Filter messages by search in chat query
  const filteredMessages = messages.filter((m) => {
    if (!searchInChat.trim()) return true;
    return m.text.toLowerCase().includes(searchInChat.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/80 relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToSidebar && (
            <button onClick={onBackToSidebar} className="md:hidden text-slate-400 hover:text-white p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={activeConversation.isGroup ? onOpenGroupInfo : undefined}
            className={`flex items-center gap-3 min-w-0 ${
              activeConversation.isGroup ? 'cursor-pointer hover:opacity-90' : ''
            }`}
          >
            <div className="relative flex-shrink-0">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                alt={title}
                className="w-10 h-10 rounded-2xl object-cover border border-slate-700/60"
              />
              {!activeConversation.isGroup && subtitle === 'Online' && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-400 truncate">
                {subtitle === 'Online' ? <span className="text-emerald-400 font-medium">Online</span> : subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-1.5">
          {showSearchBox ? (
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl px-2 py-1">
              <input
                type="text"
                value={searchInChat}
                onChange={(e) => setSearchInChat(e.target.value)}
                placeholder="Find in chat..."
                className="w-28 sm:w-40 text-xs bg-transparent text-white focus:outline-none"
              />
              <button
                onClick={() => {
                  setShowSearchBox(false);
                  setSearchInChat('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearchBox(true)}
              title="Search in Chat"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => pinChat(activeConversation._id)}
            title="Pin Chat"
            className={`p-2 rounded-xl transition-colors ${
              activeConversation.isPinned ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>

          <button
            onClick={() => muteChat(activeConversation._id)}
            title="Mute Notifications"
            className={`p-2 rounded-xl transition-colors ${
              activeConversation.isMuted ? 'text-rose-400 bg-rose-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <VolumeX className="w-4 h-4" />
          </button>

          {activeConversation.isGroup && (
            <button
              onClick={onOpenGroupInfo}
              title="Group Info"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this conversation?')) {
                deleteConversation(activeConversation._id);
              }
            }}
            title="Delete Conversation"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages History List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            Loading messages...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
            <p>No messages yet. Send a message to start conversing!</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              onReply={(m) => setReplyingTo(m)}
              onPreviewImage={onPreviewImage}
            />
          ))
        )}

        <TypingIndicator typingUsers={typingUsers} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar Footer */}
      <MessageInput
        replyingTo={replyingTo}
        onClearReply={() => setReplyingTo(null)}
        onSelectFile={onSelectFile}
      />
    </div>
  );
};
