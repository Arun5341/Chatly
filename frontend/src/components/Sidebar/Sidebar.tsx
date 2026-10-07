import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { ConversationItem } from './ConversationItem';
import { User } from '../../types';
import {
  Search,
  Plus,
  Users,
  Settings,
  Sun,
  Moon,
  LogOut,
  MessageSquarePlus,
  X,
} from 'lucide-react';

interface SidebarProps {
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenCreateGroup: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenProfile,
  onOpenSettings,
  onOpenCreateGroup,
}) => {
  const { user, logout } = useAuth();
  const { conversations, activeConversation, selectConversation, unreadCounts, createDirectChat } = useChat();
  const { theme, setTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups'>('all');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState<boolean>(false);

  // Search users API query when user types in search box
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (q.trim().length > 1) {
      setIsSearchingUsers(true);
      try {
        const token = localStorage.getItem('chatly_token');
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserSearchResults(data.users || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingUsers(false);
      }
    } else {
      setUserSearchResults([]);
    }
  };

  const handleSelectSearchedUser = async (recipientId: string) => {
    try {
      await createDirectChat(recipientId);
      setSearchQuery('');
      setUserSearchResults([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter conversations by tab and local search query
  const filteredConversations = conversations.filter((conv) => {
    if (activeTab === 'direct' && conv.isGroup) return false;
    if (activeTab === 'groups' && !conv.isGroup) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (conv.isGroup) {
        return conv.name?.toLowerCase().includes(q);
      } else {
        const other = conv.participants.find((p) => p._id !== user?._id);
        return other?.username.toLowerCase().includes(q);
      }
    }
    return true;
  });

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const unpinnedConversations = filteredConversations.filter((c) => !c.isPinned);

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col h-full glass-panel border-r border-slate-800/80 bg-slate-900/90 text-slate-100 flex-shrink-0 select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
        >
          <div className="relative">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
              alt={user?.username}
              className="w-10 h-10 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-md group-hover:border-indigo-400"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate text-white leading-tight">{user?.username}</h3>
            <p className="text-[11px] text-slate-400 truncate">{user?.bio || 'Active'}</p>
          </div>
        </div>

        {/* Action Quick Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenCreateGroup}
            title="Create Group Chat"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle Theme"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search users or chats..."
            className="w-full py-2 pl-9 pr-8 text-xs text-white bg-slate-950/60 border border-slate-800/80 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setUserSearchResults([]);
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Drawer */}
      {searchQuery.trim().length > 1 && (
        <div className="mx-3 mb-2 p-2 bg-slate-950/90 rounded-2xl border border-slate-800 max-h-48 overflow-y-auto">
          <h5 className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
            User Search Results
          </h5>
          {isSearchingUsers ? (
            <p className="text-xs text-slate-500 px-2 py-2">Searching...</p>
          ) : userSearchResults.length === 0 ? (
            <p className="text-xs text-slate-500 px-2 py-2">No users found</p>
          ) : (
            userSearchResults.map((u) => (
              <div
                key={u._id}
                onClick={() => handleSelectSearchedUser(u._id)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-indigo-600/20 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                    alt={u.username}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <div>
                    <h5 className="text-xs font-semibold text-white">{u.username}</h5>
                    <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  </div>
                </div>
                <MessageSquarePlus className="w-4 h-4 text-indigo-400" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center px-3 gap-1 mb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all ${
            activeTab === 'all' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('direct')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all ${
            activeTab === 'direct' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Direct
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all ${
            activeTab === 'groups' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Groups
        </button>
      </div>

      {/* Conversations Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-1 pb-4">
        {pinnedConversations.length > 0 && (
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 py-1">
              Pinned
            </span>
            {pinnedConversations.map((conv) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                isActive={activeConversation?._id === conv._id}
                onSelect={() => selectConversation(conv)}
                unreadCount={unreadCounts[conv._id] || 0}
              />
            ))}
          </div>
        )}

        {unpinnedConversations.length > 0 && (
          <div>
            {pinnedConversations.length > 0 && (
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 py-1 mt-2">
                All Conversations
              </span>
            )}
            {unpinnedConversations.map((conv) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                isActive={activeConversation?._id === conv._id}
                onSelect={() => selectConversation(conv)}
                unreadCount={unreadCounts[conv._id] || 0}
              />
            ))}
          </div>
        )}

        {filteredConversations.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No conversations found.</p>
            <button
              onClick={onOpenCreateGroup}
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-600/10 hover:bg-indigo-600/20 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Start a conversation
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
