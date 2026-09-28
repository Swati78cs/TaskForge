import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PlusCircle, ArrowLeft } from 'lucide-react';

export const JobCreate = () => {
  const [type, setType] = useState('send_email');
  const [priority, setPriority] = useState('NORMAL');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [payloadJson, setPayloadJson] = useState('{\n  "to": "user@example.com",\n  "subject": "Welcome to TaskForge",\n  "body": "Your background job was enqueued successfully."\n}');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'send_email') {
      setPayloadJson('{\n  "to": "user@example.com",\n  "subject": "Welcome to TaskForge",\n  "body": "Your background job was enqueued successfully."\n}');
    } else if (newType === 'generate_pdf') {
      setPayloadJson('{\n  "title": "Monthly Performance Report",\n  "content": "Detailed execution logs and worker telemetry analysis.",\n  "author": "TaskForge Architect"\n}');
    } else if (newType === 'process_image') {
      setPayloadJson('{\n  "width": 400,\n  "height": 400,\n  "format": "png"\n}');
    } else if (newType === 'api_request') {
      setPayloadJson('{\n  "url": "https://httpbin.org/get",\n  "method": "GET"\n}');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(payloadJson);
    } catch (err) {
      setError(`Invalid JSON payload format: ${err.message}`);
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        type,
        payload: parsedPayload,
        priority,
        maxAttempts: parseInt(maxAttempts, 10),
        idempotencyKey: idempotencyKey.trim() || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      };

      const res = await api.post('/jobs', payload);
      if (res.success) {
        navigate(`/jobs/${res.data._id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/jobs')}
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Submit Background Job</h2>
          <p className="text-slate-400 text-sm">Enqueue a new task for asynchronous processing by worker pool</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Job Handler Type *
            </label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="send_email">send_email (Resend Email API)</option>
              <option value="generate_pdf">generate_pdf (PDFKit PDF Export)</option>
              <option value="process_image">process_image (Sharp Image Resize)</option>
              <option value="api_request">api_request (Axios HTTP Request)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Queue Priority *
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="CRITICAL">CRITICAL (Top Priority)</option>
              <option value="HIGH">HIGH Priority</option>
              <option value="NORMAL">NORMAL Priority</option>
              <option value="LOW">LOW Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Max Retry Attempts *
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Idempotency Key (Optional)
            </label>
            <input
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              placeholder="e.g. welcome-user-9942"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Schedule Execution Time (Optional / Delayed Job)
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Job Payload (JSON Format) *
          </label>
          <textarea
            rows={7}
            value={payloadJson}
            onChange={(e) => setPayloadJson(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-indigo-600/20 text-sm flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          {submitting ? 'Enqueuing Job...' : 'Submit Job to Queue'}
        </button>
      </form>
    </div>
  );
};
