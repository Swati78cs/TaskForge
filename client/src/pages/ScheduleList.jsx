import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Clock, Plus, RefreshCw, Play, Pause, Trash2 } from 'lucide-react';

export const ScheduleList = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    try {
      const res = await api.get('/schedules');
      if (res.success) {
        setSchedules(res.data.schedules);
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleToggle = async (id) => {
    try {
      await api.post(`/schedules/${id}/toggle`);
      fetchSchedules();
    } catch (err) {
      alert(`Toggle status error: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recurring schedule?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      fetchSchedules();
    } catch (err) {
      alert(`Delete schedule error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Recurring Job Schedules</h2>
          <p className="text-slate-400 text-sm">Cron-based automated background job triggers</p>
        </div>
        <Link
          to="/schedules/create"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/20 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Schedule
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Schedule Name</th>
                <th className="px-5 py-3">Handler Type</th>
                <th className="px-5 py-3">Cron Expression</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Next Execution</th>
                <th className="px-5 py-3">Last Execution</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
                    Loading schedules...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No recurring schedules configured yet.
                  </td>
                </tr>
              ) : (
                schedules.map((sch) => (
                  <tr key={sch._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-100">{sch.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-indigo-400">{sch.jobType}</td>
                    <td className="px-5 py-3.5 font-mono text-xs bg-slate-950/40 rounded px-2 py-1 inline-block border border-slate-800 my-2">
                      {sch.cronExpression}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={sch.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-300 font-mono">
                      {sch.nextRunAt ? new Date(sch.nextRunAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                      {sch.lastRunAt ? new Date(sch.lastRunAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleToggle(sch._id)}
                        className={`inline-flex items-center p-1.5 rounded transition-colors ${
                          sch.status === 'active'
                            ? 'text-amber-400 hover:bg-amber-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={sch.status === 'active' ? 'Pause Schedule' : 'Activate Schedule'}
                      >
                        {sch.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDelete(sch._id)}
                        className="inline-flex items-center p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
