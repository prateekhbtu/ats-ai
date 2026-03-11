import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, ExternalLink, Trash2, Loader2, AlertCircle, Tag, BarChart2 } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { jdApi } from '../lib/api';
import { jdStore, type JdRecord } from '../lib/storage';

export function Jobs() {
  const [jobs, setJobs] = useState<JdRecord[]>([]);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJobs(jdStore.list());
  }, []);

  async function handleSave() {
    if (!url.trim() && !text.trim()) {
      setError('Please provide a job URL or paste the job description.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload: { url?: string; text?: string } = {};
      if (url.trim()) payload.url = url.trim();
      if (text.trim()) payload.text = text.trim();

      const res = await jdApi.process(payload);
      const record: JdRecord = {
        id: res.id,
        title: res.extracted_data.title,
        company: res.extracted_data.company,
        created_at: new Date().toISOString(),
        url: url.trim() || undefined,
      };
      jdStore.add(record);
      setJobs(jdStore.list());
      setUrl('');
      setText('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process job description. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleRemove(id: string) {
    jdStore.remove(id);
    setJobs(jdStore.list());
  }

  return (
    <DashboardLayout>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Target Jobs</h1>
          <p className="text-gray-500">Save job descriptions to tailor your resumes against them.</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-gray-500 self-start sm:self-auto">
          <BarChart2 size={16} /> {jobs.length} saved
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Job Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Quick Add</h2>
          <p className="text-xs text-gray-400 mb-5">Our AI will extract the role, company, and required skills.</p>

          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Job URL (LinkedIn, Greenhouse…)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-gray-200" />
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase">OR</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Paste Description</label>
              <textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the full job description here…"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-[#0A0A0A] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : 'Save Job'}
            </button>
          </div>
        </motion.div>

        {/* Saved Jobs */}
        <div className="lg:col-span-2 space-y-4">
          {jobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm text-center px-6"
            >
              <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
                <Briefcase size={24} />
              </div>
              <p className="text-gray-500 text-sm">No jobs saved yet. Add a job using the form on the left.</p>
            </motion.div>
          ) : (
            jobs.map((job, i) => (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                key={job.id}
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-start justify-between group hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 mt-0.5 shrink-0">
                    <Briefcase size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                    <p className="text-gray-500 text-sm mb-3">{job.company}</p>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                        <Tag size={11} /> {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium hover:text-orange-700 transition-colors"
                        >
                          View Original <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(job.id)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
