import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, User as UserIcon, Camera, Save } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, updateProfile } = useAuth();

  const [username, setUsername] = useState<string>(user?.username || '');
  const [bio, setBio] = useState<string>(user?.bio || '');
  const [avatar, setAvatar] = useState<string>(user?.avatar || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const defaultAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProfile({ username, bio, avatar });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 shadow-2xl border border-indigo-500/20">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-indigo-400" /> User Profile
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 text-xs font-medium text-rose-300 bg-rose-950/60 border border-rose-500/30 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded-xl">
            Profile saved successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                alt="Profile Avatar"
                className="w-24 h-24 rounded-3xl object-cover border-4 border-indigo-500/40 shadow-xl"
              />
            </div>
            <span className="text-xs text-slate-400">Select preset avatar:</span>
            <div className="flex gap-2">
              {defaultAvatars.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt="Preset"
                  onClick={() => setAvatar(url)}
                  className={`w-10 h-10 rounded-2xl object-cover cursor-pointer border-2 transition-transform hover:scale-105 ${
                    avatar === url ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-300">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full py-2.5 px-4 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-300">Bio Status</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others a little about yourself..."
              className="w-full py-2.5 px-4 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
