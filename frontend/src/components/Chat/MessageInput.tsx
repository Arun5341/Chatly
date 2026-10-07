import React, { useRef, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { Message } from '../../types';
import { Paperclip, Send, Smile, X, Image as ImageIcon, FileText } from 'lucide-react';

interface MessageInputProps {
  replyingTo: Message | null;
  onClearReply: () => void;
  onSelectFile: (file: File) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ replyingTo, onClearReply, onSelectFile }) => {
  const { sendMessage, startTyping } = useChat();
  const [text, setText] = useState<string>('');
  const [showEmojiModal, setShowEmojiModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emojis = ['😊', '😂', '❤️', '🔥', '👍', '🎉', '😍', '🙌', '✨', '😎', '🙏', '💯', '🚀', '⭐', '💡', '💬'];

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    const messageText = text;
    setText('');
    setShowEmojiModal(false);

    await sendMessage(messageText, [], replyingTo?._id || null);
    if (replyingTo) onClearReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      startTyping();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="relative p-3 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2 mb-2 bg-indigo-950/60 border-l-4 border-indigo-500 rounded-xl text-xs text-slate-200 animate-fade-in">
          <div className="min-w-0 pr-2">
            <span className="font-semibold text-indigo-400">Replying to {replyingTo.sender?.username}</span>
            <p className="truncate text-slate-400">{replyingTo.text || 'Attachment'}</p>
          </div>
          <button onClick={onClearReply} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiModal && (
        <div className="absolute bottom-full mb-3 left-4 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-30 grid grid-cols-8 gap-2 w-64 animate-fade-in">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setText((prev) => prev + emoji);
              }}
              className="text-lg p-1.5 hover:bg-slate-800 rounded-xl transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* Input Form Controls */}
      <form onSubmit={handleSend} className="flex items-end gap-2">
        <div className="flex items-center gap-1 pb-1">
          <button
            type="button"
            onClick={() => setShowEmojiModal(!showEmojiModal)}
            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        {/* Expandable Textarea */}
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              startTyping();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Type a message..."
            className="w-full py-2.5 px-4 text-sm text-white bg-slate-950/70 border border-slate-800/80 rounded-2xl placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/80 transition-all resize-none max-h-32"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all active:scale-95 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
