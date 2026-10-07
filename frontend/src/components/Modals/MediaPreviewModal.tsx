import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { X, Send, FileText, Image as ImageIcon } from 'lucide-react';

interface MediaPreviewModalProps {
  file: File;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ file, onClose }) => {
  const { sendMessage } = useChat();
  const [caption, setCaption] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = file.type.startsWith('image/');
  const filePreviewUrl = isImage ? URL.createObjectURL(file) : null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('chatly_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'File upload failed');
      }

      // Attachment object
      const attachment = {
        url: data.url,
        fileType: data.fileType,
        fileName: data.fileName,
        fileSize: data.fileSize,
      };

      await sendMessage(caption, [attachment]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 shadow-2xl border border-indigo-500/20 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {isImage ? <ImageIcon className="w-4 h-4 text-indigo-400" /> : <FileText className="w-4 h-4 text-indigo-400" />}
            Preview Attachment
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 text-xs font-medium text-rose-300 bg-rose-950/60 border border-rose-500/30 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center my-4 overflow-hidden bg-slate-950/80 rounded-2xl p-4 border border-slate-800">
          {isImage && filePreviewUrl ? (
            <img src={filePreviewUrl} alt="Preview" className="max-h-64 rounded-xl object-contain shadow-lg" />
          ) : (
            <div className="text-center p-6">
              <FileText className="w-16 h-16 text-indigo-400 mx-auto mb-2 opacity-80" />
              <h4 className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</h4>
              <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="space-y-3 flex-shrink-0">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="w-full py-2.5 px-4 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Send File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
