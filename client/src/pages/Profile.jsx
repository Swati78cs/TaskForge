import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Calendar, Key } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">User Account Profile</h2>
        <p className="text-slate-400 text-sm">Authenticated session details and RBAC permissions</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{user.name}</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-1">
              Role: {user.role}
            </span>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3 text-slate-300">
            <Mail className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase">Email Address</div>
              <div className="font-mono text-slate-200">{user.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-300">
            <Shield className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase">Authorization Level</div>
              <div className="text-slate-200">
                {user.role === 'ADMIN'
                  ? 'Full Administrative privileges across all users & workers'
                  : 'Standard User access (isolated resource ownership)'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-300">
            <Calendar className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase">Account ID</div>
              <div className="font-mono text-xs text-indigo-400">{user._id}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
