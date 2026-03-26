import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ExternalLink, Trash2, Loader2, AlertCircle, Tag, BarChart2, Edit3, X, Save } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { jdApi, type JdExtractedData } from '../lib/api';
import { jdStore, type JdRecord } from '../lib/storage';

export function Jobs() {
  const [jobs, setJobs] = useState<JdRecord[]>([]);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingJd, setEditingJd] = useState<JdRecord | null>(null);
  const [editFormData, setEditFormData] = useState<JdExtractedData | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    // Load local first for speed
    setJobs(jdStore.list());
    // Fetch latest from backend to sync
    jdApi.list()
      .then(res => {
        jdStore.setAll(res.jds);
        setJobs(res.jds);
      })
      .catch(err => console.error('Failed to sync JDs:', err));
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
        extracted_data: res.extracted_data,
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

  async function handleRemove(id: string) {
    // Optimistic delete
    jdStore.remove(id);
    setJobs(jdStore.list());
    try {
      await jdApi.delete(id);
    } catch (err) {
      console.error('Failed to delete JD:', err);
      // Optional: rollback on failure
    }
  }

  function handleEditClick(job: JdRecord) {
    setEditingJd(job);
    setEditFormData(job.extracted_data ? JSON.parse(JSON.stringify(job.extracted_data)) : null);
  }

  async function handleSaveEdit() {
    if (!editingJd || !editFormData) return;
    setSavingEdit(true);
    try {
      const res = await jdApi.update(editingJd.id, editFormData);
      const updatedJob = { ...editingJd, extracted_data: res.extracted_data, title: res.extracted_data.title, company: res.extracted_data.company };
      jdStore.update(editingJd.id, updatedJob);
      setJobs(jdStore.list());
      setEditingJd(null);
    } catch (err) {
      console.error('Failed to update JD', err);
      alert('Failed to update Job Description. Please try again.');
    } finally {
      setSavingEdit(false);
    }
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
                <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditClick(job)}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleRemove(job.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingJd && editFormData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              onClick={() => !savingEdit && setEditingJd(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Edit Required Skills & Metadata</h2>
                <button onClick={() => !savingEdit && setEditingJd(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Job Title</label>
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Company</label>
                    <input
                      type="text"
                      value={editFormData.company}
                      onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Required Skills (comma separated)</label>
                  <textarea
                    rows={3}
                    value={editFormData.required_skills.join(', ')}
                    onChange={(e) => setEditFormData({ ...editFormData, required_skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Role Expectations</label>
                  <textarea
                    rows={4}
                    value={editFormData.role_expectations.join('\n')}
                    onChange={(e) => setEditFormData({ ...editFormData, role_expectations: e.target.value.split('\n').filter(Boolean) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 whitespace-pre-wrap"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3">
                <button
                  onClick={() => setEditingJd(null)}
                  disabled={savingEdit}
                  className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
