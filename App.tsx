
import React, { useState, useEffect } from 'react';
import { ViewType } from './types';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import VoiceView from './components/VoiceView';
import ImageView from './components/ImageView';
import VideoView from './components/VideoView';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.CHAT);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const renderView = () => {
    switch (currentView) {
      case ViewType.CHAT:
        return <ChatView />;
      case ViewType.VOICE:
        return <VoiceView />;
      case ViewType.IMAGE:
        return <ImageView />;
      case ViewType.VIDEO:
        return <VideoView />;
      case ViewType.INFO:
        return (
          <div className="h-full flex items-center justify-center p-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-2xl bg-white dark:bg-slate-900/50 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 text-center shadow-2xl">
              <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <i className="fa-solid fa-bolt text-white text-4xl"></i>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">About OhM Assistant</h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                OhM is a state-of-the-art multimodal AI assistant designed for speed, accuracy, and versatility.
              </p>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h3 className="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2">Grounded</h3>
                  <p className="text-slate-500 text-sm">Powered by Google Search for up-to-date knowledge.</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h3 className="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2">Multimodal</h3>
                  <p className="text-slate-500 text-sm">Native audio, image & cinematic video generation.</p>
                </div>
              </div>
              <p className="text-slate-400 dark:text-slate-600 text-sm pt-4 border-t border-slate-100 dark:border-slate-800">
                Version 1.1.0 • Cinematic Intelligence Update
              </p>
            </div>
          </div>
        );
      default:
        return <ChatView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Sidebar currentView={currentView} setView={setCurrentView} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <main className="flex-1 h-full overflow-hidden relative">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
