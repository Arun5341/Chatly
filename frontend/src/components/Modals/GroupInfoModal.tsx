import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Users, X, Shield, UserMinus, LogOut, Crown } from 'lucide-react';

interface GroupInfoModalProps {
  onClose: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { activeConversation, fetchConversations } = useChat();

  const [loading, setLoading] = useState<boolean>(false);

  if (!activeConversation || !activeConversation.isGroup) return null;

  const isAdmin =
    activeConversation.admin &&
    (typeof activeConversation.admin === 'object'
      ? activeConversation.admin._id === user?._id
      : activeConversation.admin === user?._id);

  const handleMemberAction = async (action: 'add' | 'remove', memberId: string) => {
    const token = localStorage.getItem('chatly_token');
    try {
      const res = await fetch(`/api/conversations/${activeConversation._id}/group/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, userId: memberId }),
      });
      if (res.ok) {
        await fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    setLoading(true);
    const token = localStorage.getItem('chatly_token');
    try {
      const res = await fetch(`/api/conversations/${activeConversation._id}/group/leave`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchConversations();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 shadow-2xl border border-indigo-500/20 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 flex-shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Group Information
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Group Header Info */}
        <div className="flex flex-col items-center text-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800 mb-4">
          <img
            src={
              activeConversation.groupImage ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${activeConversation.name}`
            }
            alt={activeConversation.name}
            className="w-20 h-20 rounded-3xl object-cover border-2 border-indigo-500/40 mb-3 shadow-lg"
          />
          <h2 className="text-xl font-extrabold text-white">{activeConversation.name}</h2>
          <p className="text-xs text-slate-400 mt-1">{activeConversation.description || 'No description provided'}</p>
          <span className="mt-2 px-3 py-1 text-[11px] font-semibold text-indigo-400 bg-indigo-600/15 rounded-full">
            {activeConversation.participants.length} Members
          </span>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Members</h4>
          {activeConversation.participants.map((member) => {
            const isMemberAdmin =
              activeConversation.admin &&
              (typeof activeConversation.admin === 'object'
                ? activeConversation.admin._id === member._id
                : activeConversation.admin === member._id);

            return (
              <div
                key={member._id}
                className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-2xl border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`}
                    alt={member.username}
                    className="w-9 h-9 rounded-2xl object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h5 className="text-xs font-semibold text-white">{member.username}</h5>
                      {isMemberAdmin && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md">
                          <Crown className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">{member.bio || 'Member'}</p>
                  </div>
                </div>

                {isAdmin && member._id !== user?._id && (
                  <button
                    onClick={() => handleMemberAction('remove', member._id)}
                    title="Remove Member"
                    className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
          <button
            onClick={handleLeaveGroup}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" /> Leave Group
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
