import React, { useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { User } from '../../types';
import { Users, X, Check, Search, Plus } from 'lucide-react';

interface CreateGroupModalProps {
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose }) => {
  const { createGroupChat } = useChat();

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('chatly_token');
      try {
        const res = await fetch('/api/users/all', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableUsers(data.users || []);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();
  }, []);

  const toggleUser = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    if (selectedMembers.length === 0) {
      setError('Please select at least one member');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createGroupChat(name, selectedMembers, description);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 shadow-2xl border border-indigo-500/20 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 flex-shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Create New Group
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 text-xs font-medium text-rose-300 bg-rose-950/60 border border-rose-500/30 rounded-xl flex-shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-300">Group Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Systems Team"
              className="w-full py-2.5 px-4 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-300">Group Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              className="w-full py-2.5 px-4 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-semibold text-slate-300">Select Members ({selectedMembers.length} selected)</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-slate-950/60 border border-slate-800 rounded-2xl">
              {availableUsers.length === 0 ? (
                <p className="text-xs text-slate-500 p-2">No other users registered yet.</p>
              ) : (
                availableUsers.map((u) => {
                  const isChecked = selectedMembers.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleUser(u._id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                          alt={u.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <h5 className="text-xs font-semibold text-white">{u.username}</h5>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-700'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
