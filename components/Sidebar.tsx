
import React from 'react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isDarkMode, toggleTheme }) => {
  const navItems = [
    { type: ViewType.CHAT, icon: 'fa-comments', label: 'Chat' },
    { type: ViewType.VOICE, icon: 'fa-microphone', label: 'Voice' },
    { type: ViewType.IMAGE, icon: 'fa-wand-magic-sparkles', label: 'Create' },
    { type: ViewType.VIDEO, icon: 'fa-video', label: 'Studio' },
    { type: ViewType.INFO, icon: 'fa-circle-info', label: 'About' },
  ];

  return (
    <aside className="w-20 md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full transition-all duration-300 shadow-xl">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <i className="fa-solid fa-bolt text-white text-xl"></i>
        </div>
        <span className="hidden md:block font-bold text-2xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          OhM
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-2 mt-4">
        {navItems.map((item) => (
          <button
            key={item.type}
            onClick={() => setView(item.type)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === item.type
                ? 'bg-indigo-600 text-white dark:bg-indigo-600/10 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-xl w-6 text-center group-hover:scale-110 transition-transform`}></i>
            <span className="hidden md:block font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 space-y-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        >
          <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-xl w-6 text-center`}></i>
          <span className="hidden md:block font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div className="hidden md:flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <img src="https://picsum.photos/seed/user/100/100" alt="User" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate text-slate-900 dark:text-slate-200">Guest User</p>
            <p className="text-xs text-slate-500">Free Tier</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
