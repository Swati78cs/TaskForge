import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Filter, RefreshCw, Plus, Eye, RotateCcw, XCircle } from 'lucide-react';

export const JobList = () => {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(false);

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sort: '-createdAt',
      });
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const res = await api.get(`/jobs?${params.toString()}`);
      if (res.success) {
        setJobs(res.data.jobs);
        setPagination(res.data.pagination);

        // Check if any job is in non-terminal state
        const hasActiveJobs = res.data.jobs.some((job) =>
          ['PENDING', 'QUEUED', 'PROCESSING', 'RETRYING'].includes(job.status)
        );
        setPollingActive(hasActiveJobs);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [pagination.page, statusFilter, typeFilter, priorityFilter]);

  // Polling every 3 seconds while active jobs exist
  useEffect(() => {
    if (!pollingActive) return;
    const timer = setInterval(() => {
      fetchJobs();
    }, 3000);
    return () => clearInterval(timer);
  }, [pollingActive, pagination.page, statusFilter, typeFilter, priorityFilter]);

  const handleCancel = async (jobId) => {
    try {
      await api.delete(`/jobs/${jobId}`);
      fetchJobs();
    } catch (err) {
      alert(`Cancellation error: ${err.message}`);
    }
  };

  const handleRetry = async (jobId) => {
    try {
      await api.post(`/jobs/${jobId}/retry`);
      fetchJobs();
    } catch (err) {
      alert(`Retry error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Job Queue</h2>
          <p className="text-slate-400 text-sm">Monitor and manage background job executions</p>
        </div>
        <div className="flex items-center gap-3">
          {pollingActive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <RefreshCw className="w-3 h-3 animate-spin" /> Live Polling (3s)
            </span>
          )}
          <Link
            to="/jobs/create"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/20 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Submit Job
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase">
            <Filter className="w-4 h-4" /> Filters:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="QUEUED">QUEUED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="RETRYING">RETRYING</option>
            <option value="DEAD_LETTER">DEAD_LETTER</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Job Types</option>
            <option value="send_email">send_email</option>
            <option value="generate_pdf">generate_pdf</option>
            <option value="process_image">process_image</option>
            <option value="api_request">api_request</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="NORMAL">NORMAL</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        <button
          onClick={fetchJobs}
          className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Job Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Job ID</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Attempts</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
                    Loading jobs...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No jobs found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-indigo-400">
                      <Link to={`/jobs/${job._id}`} className="hover:underline">
                        {job._id}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-200">{job.type}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                        job.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                        job.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                        job.priority === 'NORMAL' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {job.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs">
                      {job.attempts} / {job.maxAttempts}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <Link
                        to={`/jobs/${job._id}`}
                        className="inline-flex items-center p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {['PENDING', 'QUEUED'].includes(job.status) && (
                        <button
                          onClick={() => handleCancel(job._id)}
                          className="inline-flex items-center p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          title="Cancel Job"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      {['FAILED', 'DEAD_LETTER'].includes(job.status) && (
                        <button
                          onClick={() => handleRetry(job._id)}
                          className="inline-flex items-center p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition-colors"
                          title="Retry Job"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total jobs)
          </div>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-200"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
