import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
  Layers, CheckCircle, AlertTriangle, Clock, Activity, Server, RefreshCw
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [mRes, jRes] = await Promise.all([
        api.get('/metrics'),
        api.get('/jobs?limit=5&sort=-createdAt'),
      ]);
      if (mRes.success) setMetrics(mRes.data);
      if (jRes.success) setRecentJobs(jRes.data.jobs);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const overview = metrics?.overview || {};
  const performance = metrics?.performance || {};
  const jobsByType = metrics?.jobsByType || {};

  const typeData = [
    { name: 'Email', count: jobsByType.send_email || 0 },
    { name: 'PDF', count: jobsByType.generate_pdf || 0 },
    { name: 'Image', count: jobsByType.process_image || 0 },
    { name: 'API Req', count: jobsByType.api_request || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">System Overview</h2>
          <p className="text-slate-400 text-sm">Real-time status of distributed job queue execution</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Jobs</span>
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3 text-3xl font-bold text-white">{overview.total || 0}</div>
          <div className="mt-2 text-xs text-slate-500 font-mono">
            {overview.queueDepth || 0} queued/pending
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Processing</span>
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div className="mt-3 text-3xl font-bold text-indigo-400">{overview.processing || 0}</div>
          <div className="mt-2 text-xs text-slate-500 font-mono">Active in workers</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Successful</span>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3 text-3xl font-bold text-emerald-400">{overview.successful || 0}</div>
          <div className="mt-2 text-xs text-emerald-400/80 font-medium">
            {performance.successRatePercent || 0}% success rate
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Failed / DLQ</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-3 text-3xl font-bold text-rose-400">
            {(overview.failed || 0) + (overview.deadLetter || 0)}
          </div>
          <div className="mt-2 text-xs text-rose-400/80 font-medium">
            {overview.deadLetter || 0} in Dead Letter Queue
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Area Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <h3 className="text-base font-semibold text-slate-100 mb-4">Jobs Executed Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.jobsProcessedOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="successful" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                <Area type="monotone" dataKey="failed" stackId="1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Job Types Breakdown Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <h3 className="text-base font-semibold text-slate-100 mb-4">Jobs by Handler Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">Recent Job Activity</h3>
          <span className="text-xs text-slate-500 font-mono">Auto-refreshing every 5s</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Job ID</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Attempts</th>
                <th className="px-5 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-500 text-xs">
                    No recent job activity
                  </td>
                </tr>
              ) : (
                recentJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-mono text-xs text-indigo-400">{job._id}</td>
                    <td className="px-5 py-3 font-medium">{job.type}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{job.attempts} / {job.maxAttempts}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {new Date(job.createdAt).toLocaleString()}
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
