import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Clock, ArrowLeft, Plus } from 'lucide-react';

export const ScheduleCreate = () => {
  const [name, setName] = useState('');
  const [jobType, setJobType] = useState('send_email');
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [payloadJson, setPayloadJson] = useState('{\n  "to": "daily-report@example.com",\n  "subject": "Automated Daily Summary"\n}');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleCronPreset = (preset) => {
    setCronExpression(preset);
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
      const res = await api.post('/schedules', {
        name,
        jobType,
        cronExpression,
        payload: parsedPayload,
      });

      if (res.success) {
        navigate('/schedules');
      }
    } catch (err) {
      setError(err.message || 'Failed to create schedule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/schedules')}
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Recurring Job Schedule</h2>
          <p className="text-slate-400 text-sm">Configure automated cron trigger for background jobs</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Schedule Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Daily User Email Digest"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Job Handler Type *
          </label>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
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
            Cron Expression *
          </label>
          <input
            type="text"
            required
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            placeholder="0 9 * * *"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
          />
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className="text-slate-500 self-center">Presets:</span>
            <button
              type="button"
              onClick={() => handleCronPreset('*/5 * * * *')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
            >
              Every 5 mins (*/5 * * * *)
            </button>
            <button
              type="button"
              onClick={() => handleCronPreset('0 * * * *')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
            >
              Every Hour (0 * * * *)
            </button>
            <button
              type="button"
              onClick={() => handleCronPreset('0 9 * * *')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
            >
              Daily 9 AM (0 9 * * *)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Job Payload (JSON Format) *
          </label>
          <textarea
            rows={5}
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
          <Plus className="w-5 h-5" />
          {submitting ? 'Creating Schedule...' : 'Save Recurring Schedule'}
        </button>
      </form>
    </div>
  );
};
