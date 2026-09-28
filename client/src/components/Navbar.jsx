import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Cpu } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-tr from-indigo-500 to-blue-500 p-2 rounded-lg text-white font-bold shadow-lg shadow-indigo-500/20">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-100 tracking-tight text-lg">TaskForge</h1>
          <span className="text-xs text-slate-400 font-medium">Distributed Job Orchestration Platform</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 rounded-full">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{user.name}</div>
              <div className="text-[10px] text-indigo-400 font-mono">{user.role}</div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
