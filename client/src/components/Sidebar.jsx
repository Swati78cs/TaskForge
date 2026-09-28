import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  PlusCircle,
  Clock,
  Server,
  BarChart3,
  UserCheck,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/jobs', label: 'All Jobs', icon: ListTodo },
  { path: '/jobs/create', label: 'Submit Job', icon: PlusCircle },
  { path: '/schedules', label: 'Recurring Schedules', icon: Clock },
  { path: '/workers', label: 'Worker Monitoring', icon: Server },
  { path: '/metrics', label: 'System Metrics', icon: BarChart3 },
  { path: '/profile', label: 'Profile', icon: UserCheck },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-500 font-mono">
        v1.0.0-production
      </div>
    </aside>
  );
};
