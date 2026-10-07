import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import { AuthModal } from './components/Auth/AuthModal';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatArea } from './components/Chat/ChatArea';
import { ProfileModal } from './components/Modals/ProfileModal';
import { CreateGroupModal } from './components/Modals/CreateGroupModal';
import { GroupInfoModal } from './components/Modals/GroupInfoModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { MediaPreviewModal } from './components/Modals/MediaPreviewModal';
import { X } from 'lucide-react';

const ChatlyMain: React.FC = () => {
  const { user, loading } = useAuth();

  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState<boolean>(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-indigo-400">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-white text-xl font-bold">
            💬
          </div>
          <p className="text-sm font-semibold tracking-wider text-slate-300">Loading Chatly...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Sidebar View */}
      <div className={`${showMobileSidebar ? 'block' : 'hidden'} md:block w-full md:w-auto h-full`}>
        <Sidebar
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenCreateGroup={() => setShowCreateGroupModal(true)}
        />
      </div>

      {/* Main Chat Area View */}
      <div className={`${!showMobileSidebar ? 'block' : 'hidden'} md:block flex-1 h-full`}>
        <ChatArea
          onBackToSidebar={() => setShowMobileSidebar(true)}
          onOpenGroupInfo={() => setShowGroupInfoModal(true)}
          onSelectFile={(file) => setSelectedFile(file)}
          onPreviewImage={(url) => setLightboxImage(url)}
        />
      </div>

      {/* Modals & Drawers */}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
      {showCreateGroupModal && <CreateGroupModal onClose={() => setShowCreateGroupModal(false)} />}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
      {showGroupInfoModal && <GroupInfoModal onClose={() => setShowGroupInfoModal(false)} />}
      {selectedFile && <MediaPreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} />}

      {/* Lightbox Image Viewer Overlay */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in cursor-pointer"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-slate-800/80 rounded-2xl"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size view"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <ChatlyMain />
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
