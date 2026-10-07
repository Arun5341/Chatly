import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Lock, Mail, User as UserIcon, Sparkles, ArrowRight } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [avatar, setAvatar] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const defaultAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  ];

  const demoAccounts = [
    { name: 'Alex', email: 'alex@chatly.io' },
    { name: 'Sarah', email: 'sarah@chatly.io' },
    { name: 'David', email: 'david@chatly.io' },
    { name: 'Emily', email: 'emily@chatly.io' },
    { name: 'Michael', email: 'michael@chatly.io' },
    { name: 'Jessica', email: 'jessica@chatly.io' },
    { name: 'Liam', email: 'liam@chatly.io' },
    { name: 'Sophia', email: 'sophia@chatly.io' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup({
          username,
          email,
          password,
          bio: bio || 'Hey there! I am using Chatly.',
          avatar: avatar || defaultAvatars[0],
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, 'password123');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md overflow-hidden glass-panel rounded-3xl shadow-2xl border border-indigo-500/20 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="relative px-8 pt-6 pb-4 text-center bg-gradient-to-b from-indigo-600/20 to-transparent flex-shrink-0">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-2 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 animate-pulse-glow">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Chatly</h2>
          <p className="text-xs text-slate-400">Next-generation real-time conversation platform</p>
        </div>

        {/* Form Container */}
        <div className="px-8 pb-6 flex-1 overflow-y-auto">
          {/* Tabs Switcher */}
          <div className="flex p-1 mb-4 rounded-xl bg-slate-800/80 border border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                !isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3 mb-4 text-xs font-medium text-rose-300 bg-rose-950/60 border border-rose-500/30 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-300">Username</label>
                <div className="relative">
                  <UserIcon className="absolute w-4 h-4 text-slate-400 left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
                    className="w-full py-2 pl-10 pr-4 text-sm text-white bg-slate-900/80 border border-slate-700/70 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block mb-1 text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute w-4 h-4 text-slate-400 left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@chatly.io"
                  className="w-full py-2 pl-10 pr-4 text-sm text-white bg-slate-900/80 border border-slate-700/70 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute w-4 h-4 text-slate-400 left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2 pl-10 pr-4 text-sm text-white bg-slate-900/80 border border-slate-700/70 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block mb-1 text-xs font-medium text-slate-300">Bio (Optional)</label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Short status or intro..."
                    className="w-full py-2 px-4 text-sm text-white bg-slate-900/80 border border-slate-700/70 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-xs font-medium text-slate-300">Choose Avatar</label>
                  <div className="flex gap-2">
                    {defaultAvatars.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="Avatar option"
                        onClick={() => setAvatar(url)}
                        className={`w-9 h-9 rounded-full object-cover cursor-pointer border-2 transition-transform hover:scale-105 ${
                          avatar === url ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 text-xs font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Instant Demo Accounts:
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleDemoLogin(acc.email)}
                  className="px-2 py-1.5 text-[11px] font-medium bg-slate-800/90 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700/70 rounded-xl transition-all truncate"
                >
                  {acc.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
