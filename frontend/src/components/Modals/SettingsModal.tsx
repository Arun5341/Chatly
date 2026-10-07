import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { Settings, X, Lock, Shield, Bell, Palette, Check, Save } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { soundEnabled, setSoundEnabled } = useChat();

  const [activeTab, setActiveTab] = useState<'privacy' | 'security' | 'theme' | 'notifications'>('privacy');

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [passMessage, setPassMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [passLoading, setPassLoading] = useState<boolean>(false);

  // Privacy tab state
  const [readReceipts, setReadReceipts] = useState<boolean>(user?.privacy?.readReceipts ?? true);
  const [lastSeenVisibility, setLastSeenVisibility] = useState<boolean>(user?.privacy?.lastSeenVisibility ?? true);
  const [privacySaving, setPrivacySaving] = useState<boolean>(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMessage(null);
    const token = localStorage.getItem('chatly_token');

    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setPassMessage({ text: 'Password updated successfully!', error: false });
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setPassMessage({ text: data.message || 'Error updating password', error: true });
      }
    } catch (err: any) {
      setPassMessage({ text: 'Failed to update password', error: true });
    } finally {
      setPassLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setPrivacySaving(true);
    try {
      await updateProfile({
        privacy: { readReceipts, lastSeenVisibility },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setPrivacySaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 shadow-2xl border border-indigo-500/20 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 flex-shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" /> Settings
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 mb-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex-shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'privacy' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Privacy
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'security' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Security
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" /> Notifications
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'theme' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" /> Theme
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Read Receipts</h4>
                  <p className="text-xs text-slate-400">Let contacts see when you have read their messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => {
                    setReadReceipts(e.target.checked);
                    handleSavePrivacy();
                  }}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Last Seen & Online Status</h4>
                  <p className="text-xs text-slate-400">Display your online presence to other users</p>
                </div>
                <input
                  type="checkbox"
                  checked={lastSeenVisibility}
                  onChange={(e) => {
                    setLastSeenVisibility(e.target.checked);
                    handleSavePrivacy();
                  }}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passMessage && (
                <div
                  className={`p-3 text-xs font-medium rounded-xl border ${
                    passMessage.error
                      ? 'text-rose-300 bg-rose-950/60 border-rose-500/30'
                      : 'text-emerald-300 bg-emerald-950/60 border-emerald-500/30'
                  }`}
                >
                  {passMessage.text}
                </div>
              )}

              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full py-2.5 px-4 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full py-2.5 px-4 text-sm text-white bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={passLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                <Save className="w-4 h-4" /> {passLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Audio Notifications</h4>
                  <p className="text-xs text-slate-400">Play futuristic sound effect when receiving messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Browser Notifications</h4>
                  <p className="text-xs text-slate-400">Request permission to send desktop alerts</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if ('Notification' in window) {
                      Notification.requestPermission();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-600/15 hover:bg-indigo-600/25 rounded-xl transition-colors"
                >
                  Enable
                </button>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select App Theme</h4>
              <div className="grid grid-cols-3 gap-3">
                <div
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-2xl border text-center cursor-pointer transition-all ${
                    theme === 'dark'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800 text-indigo-400">
                    🌙
                  </div>
                  <span className="text-xs font-bold block">Dark</span>
                </div>

                <div
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-2xl border text-center cursor-pointer transition-all ${
                    theme === 'light'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-300 text-amber-500">
                    ☀️
                  </div>
                  <span className="text-xs font-bold block">Light</span>
                </div>

                <div
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-2xl border text-center cursor-pointer transition-all ${
                    theme === 'system'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-700 text-emerald-400">
                    🖥️
                  </div>
                  <span className="text-xs font-bold block">System</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
