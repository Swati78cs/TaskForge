import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, RefreshCw, RotateCcw, XCircle, Clock, Server, CheckCircle2, AlertCircle } from 'lucide-react';

export const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchJobDetails = async () => {
    try {
      const res = await api.get(`/jobs/${id}`);
      if (res.success) {
        setJob(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  // Poll every 3 seconds if job is in non-terminal state
  useEffect(() => {
    if (!job) return;
    const isNonTerminal = ['PENDING', 'QUEUED', 'PROCESSING', 'RETRYING'].includes(job.status);
    if (!isNonTerminal) return;

    const timer = setInterval(fetchJobDetails, 3000);
    return () => clearInterval(timer);
  }, [job?.status, id]);

  const handleCancel = async () => {
    try {
      await api.delete(`/jobs/${id}`);
      fetchJobDetails();
    } catch (err) {
      alert(`Cancellation error: ${err.message}`);
    }
  };

  const handleRetry = async () => {
    try {
      await api.post(`/jobs/${id}/retry`);
      fetchJobDetails();
    } catch (err) {
      alert(`Retry error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
        <p className="font-medium">{error || 'Job not found'}</p>
        <button
          onClick={() => navigate('/jobs')}
          className="mt-4 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm"
        >
          Back to Job Queue
        </button>
      </div>
    );
  }

  const isNonTerminal = ['PENDING', 'QUEUED', 'PROCESSING', 'RETRYING'].includes(job.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white font-mono tracking-tight">{job._id}</h2>
              <StatusBadge status={job.status} />
              {isNonTerminal && (
                <span className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Polling...
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-0.5">Job Type: <span className="font-semibold text-slate-200">{job.type}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {['PENDING', 'QUEUED'].includes(job.status) && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-medium transition-colors"
            >
              <XCircle className="w-4 h-4" /> Cancel Job
            </button>
          )}

          {['FAILED', 'DEAD_LETTER'].includes(job.status) && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
            >
              <RotateCcw className="w-4 h-4" /> Retry Execution
            </button>
          )}
        </div>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs font-semibold uppercase">Priority</span>
          <div className="text-lg font-bold text-slate-100 mt-1">{job.priority}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs font-semibold uppercase">Attempts</span>
          <div className="text-lg font-bold text-slate-100 mt-1">{job.attempts} / {job.maxAttempts}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs font-semibold uppercase">Idempotency Key</span>
          <div className="text-sm font-mono text-indigo-400 mt-1 truncate">{job.idempotencyKey || 'N/A'}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs font-semibold uppercase">Submitted</span>
          <div className="text-xs text-slate-300 mt-1">{new Date(job.createdAt).toLocaleString()}</div>
        </div>
      </div>

      {job.lastError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm text-rose-400">Execution Error</div>
            <div className="text-xs font-mono mt-1">{job.lastError}</div>
          </div>
        </div>
      )}

      {/* Attempt Execution Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" /> Execution Attempt History Timeline
        </h3>

        {job.attemptHistory.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            Job is queued. No execution attempts recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Attempt #</th>
                  <th className="px-4 py-2.5">Worker ID</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5">Started At</th>
                  <th className="px-4 py-2.5">Error Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {job.attemptHistory.map((att, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold text-indigo-400">Attempt {att.attemptNumber}</td>
                    <td className="px-4 py-3 text-slate-300">{att.workerId || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={att.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {att.duration !== undefined ? `${att.duration}ms` : 'In Progress'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {att.startedAt ? new Date(att.startedAt).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-rose-400 max-w-xs truncate">
                      {att.error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payload Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-100 mb-3">Job Payload Parameters</h3>
        <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800">
          {JSON.stringify(job.payload, null, 2)}
        </pre>
      </div>
    </div>
  );
};
