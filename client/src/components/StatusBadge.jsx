import React from 'react';

const statusStyles = {
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  QUEUED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PROCESSING: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse',
  SUCCESS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  RETRYING: 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse',
  DEAD_LETTER: 'bg-red-950 text-red-300 border-red-800',
  CANCELLED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  ONLINE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OFFLINE: 'bg-slate-800 text-slate-400 border-slate-700',
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export const StatusBadge = ({ status }) => {
  const style = statusStyles[status] || 'bg-slate-800 text-slate-300 border-slate-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75" />
      {status}
    </span>
  );
};
