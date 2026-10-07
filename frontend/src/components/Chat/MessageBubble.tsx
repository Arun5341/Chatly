import React, { useState } from 'react';
import { Message } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import {
  Check,
  CheckCheck,
  Reply,
  Smile,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  FileText,
  Download,
  Image as ImageIcon,
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onReply: (msg: Message) => void;
  onPreviewImage: (url: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onReply, onPreviewImage }) => {
  const { user } = useAuth();
  const { editMessage, deleteMessage, reactToMessage } = useChat();

  const [showActions, setShowActions] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>(message.text);
  const [copied, setCopied] = useState<boolean>(false);

  const isOwn = message.sender._id === user?._id;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowActions(false);
  };

  const handleSaveEdit = async () => {
    if (editText.trim() && editText !== message.text) {
      await editMessage(message._id, editText);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteMessage(message._id);
    setShowActions(false);
  };

  const quickEmojis = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

  const handleEmojiClick = async (emoji: string) => {
    await reactToMessage(message._id, emoji);
    setShowEmojiPicker(false);
    setShowActions(false);
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`group relative flex flex-col mb-3 animate-fade-in ${
        isOwn ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender Username for Group Chats */}
      {!isOwn && (
        <span className="text-[11px] font-semibold text-indigo-400 mb-1 ml-1">
          {message.sender.username}
        </span>
      )}

      {/* Main Bubble Wrapper */}
      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {/* Hover Action Floating Toolbar */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/60 shadow-lg ${
            isOwn ? '-left-28' : '-right-28'
          }`}
        >
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="React"
            className="p-1 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onReply(message)}
            title="Reply"
            className="p-1 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            title="Copy Text"
            className="p-1 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {isOwn && !message.isDeleted && (
            <button
              onClick={() => setShowActions(!showActions)}
              title="More Actions"
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Emoji Quick Picker Popup */}
        {showEmojiPicker && (
          <div
            className={`absolute z-20 bottom-full mb-2 flex gap-1 p-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl ${
              isOwn ? 'right-0' : 'left-0'
            }`}
          >
            {quickEmojis.map((e) => (
              <button
                key={e}
                onClick={() => handleEmojiClick(e)}
                className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 rounded-xl text-sm transition-transform hover:scale-125"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Action Dropdown Menu */}
        {showActions && (
          <div
            className={`absolute z-20 top-full mt-1 w-32 py-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs ${
              isOwn ? 'right-0' : 'left-0'
            }`}
          >
            <button
              onClick={() => {
                setIsEditing(true);
                setShowActions(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-950/40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}

        {/* Bubble Content */}
        <div
          className={`p-3.5 rounded-3xl shadow-sm text-sm ${
            isOwn
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-xs'
              : 'bg-slate-800/90 text-slate-100 border border-slate-700/50 rounded-tl-xs'
          }`}
        >
          {/* Quoted Message Reply Header */}
          {message.replyTo && (
            <div className="mb-2 p-2 rounded-xl bg-black/20 border-l-2 border-amber-400 text-xs text-slate-200">
              <span className="font-semibold block text-amber-300">
                {message.replyTo.sender?.username || 'User'}
              </span>
              <p className="truncate opacity-80">{message.replyTo.text || 'Attachment'}</p>
            </div>
          )}

          {/* Attachments Section */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 mb-2">
              {message.attachments.map((att, idx) => (
                <div key={idx}>
                  {att.fileType === 'image' ? (
                    <img
                      src={att.url}
                      alt="Attachment"
                      onClick={() => onPreviewImage(att.url)}
                      className="w-full max-h-60 object-cover rounded-2xl cursor-pointer hover:opacity-95 transition-opacity"
                    />
                  ) : (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2.5 bg-black/20 rounded-2xl hover:bg-black/30 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-indigo-300" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs truncate">{att.fileName || 'Document'}</p>
                        <span className="text-[10px] opacity-70">
                          {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : 'File'}
                        </span>
                      </div>
                      <Download className="w-4 h-4 opacity-70" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Edit Input vs Text */}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2 text-xs bg-black/30 border border-indigo-400/50 rounded-xl text-white focus:outline-none"
              />
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 text-[11px] bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-2 py-1 text-[11px] bg-indigo-500 hover:bg-indigo-400 rounded-lg text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className={`whitespace-pre-wrap leading-relaxed ${message.isDeleted ? 'italic opacity-60' : ''}`}>
              {message.text}
            </p>
          )}

          {/* Footer Time & Status */}
          <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-75">
            {message.isEdited && <span className="italic">edited</span>}
            <span>{formatTime(message.createdAt)}</span>
            {isOwn && (
              <span>
                {message.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                ) : (
                  <Check className="w-3.5 h-3.5 opacity-70" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Emoji Reactions Pill Bar */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            {message.reactions.map((r, i) => (
              <span
                key={i}
                onClick={() => handleEmojiClick(r.emoji)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 rounded-full cursor-pointer hover:bg-slate-700 transition-colors shadow-sm"
              >
                <span>{r.emoji}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {copied && (
        <span className="text-[10px] text-emerald-400 font-medium mt-0.5">Copied to clipboard!</span>
      )}
    </div>
  );
};
