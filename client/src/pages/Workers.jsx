import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Server, RefreshCw, Activity, Cpu } from 'lucide-react';

export const Workers = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch workers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    const timer = setInterval(fetchWorkers, 5000);
    return () => clearInterval(timer);
  }, []);

  const workers = data?.workers || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Worker Fleet Monitoring</h2>
          <p className="text-slate-400 text-sm">Telemetry and heartbeat monitoring for horizontal worker instances</p>
        </div>
        <button
          onClick={fetchWorkers}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Fleet Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <span className="text-slate-400 text-xs font-semibold uppercase">Total Worker Instances</span>
          <div className="mt-2 text-3xl font-bold text-white">{data?.totalWorkers || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <span className="text-slate-400 text-xs font-semibold uppercase">Active Online Pool</span>
          <div className="mt-2 text-3xl font-bold text-emerald-400">{data?.activeWorkers || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <span className="text-slate-400 text-xs font-semibold uppercase">Heartbeat Interval</span>
          <div className="mt-2 text-3xl font-bold text-indigo-400">10s</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Worker ID</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Concurrency</th>
                <th className="px-5 py-3">Jobs Processed</th>
                <th className="px-5 py-3">Jobs Failed</th>
                <th className="px-5 py-3">Last Heartbeat</th>
                <th className="px-5 py-3">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 font-sans">
                    <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
                    Loading worker fleet metrics...
                  </td>
                </tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 font-sans">
                    No active worker instances registered. Start a worker with <code className="bg-slate-950 px-2 py-1 rounded text-indigo-400">npm run worker</code>.
                  </td>
                </tr>
              ) : (
                workers.map((w) => (
                  <tr key={w._id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-bold text-indigo-400 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-slate-500" />
                      {w.workerId}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={w.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-200">{w.concurrency} slots</td>
                    <td className="px-5 py-3.5 text-emerald-400 font-semibold">{w.jobsProcessed}</td>
                    <td className="px-5 py-3.5 text-rose-400 font-semibold">{w.jobsFailed}</td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {w.lastHeartbeat ? new Date(w.lastHeartbeat).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {Math.floor(w.uptimeSeconds / 60)}m {w.uptimeSeconds % 60}s
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
