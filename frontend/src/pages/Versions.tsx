import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History, FileText, ArrowRight, RotateCcw, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { versionApi, type Version } from '../lib/api';
import { resumeStore, type ResumeRecord } from '../lib/storage';

export function Versions() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const list = resumeStore.list();
    setResumes(list);
    if (list.length > 0) setSelectedResumeId(list[0].id);
  }, []);

  useEffect(() => {
    if (!selectedResumeId) return;
    setLoading(true);
    setError(null);
    setVersions([]);
    versionApi.getHistory(selectedResumeId)
      .then((res) => setVersions(res.versions))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load versions.'))
      .finally(() => setLoading(false));
  }, [selectedResumeId]);

  async function handleRestore(versionId: string) {
    setRestoring(versionId);
    setSuccessMsg(null);
    try {
      await versionApi.restore(versionId);
      setSuccessMsg('Version restored successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restore version.');
    } finally {
      setRestoring(null);
    }
  }

  return (
    <DashboardLayout>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Version History</h1>
          <p className="text-gray-500">Track all AI-enhanced variations generated from your base resumes.</p>
        </div>

        {/* Resume selector */}
        {resumes.length > 0 && (
          <div className="relative self-start sm:self-auto">
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-sm cursor-pointer"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.original_filename}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
      </header>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <AlertCircle size={18} className="shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
          <History size={18} className="shrink-0" /> {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      {resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
            <FileText size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No resumes uploaded</h3>
          <p className="text-gray-500 text-sm max-w-sm">Upload a base resume first, then run an optimization to generate version history.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <History size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Generated Versions</h2>
            {!loading && (
              <span className="ml-auto text-xs text-gray-400 font-medium">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Loading versions…</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
                <History size={22} />
              </div>
              <p className="text-gray-500 text-sm">No versions yet for this resume. Run an optimization in the Editor to create one.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {versions.map((ver, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  key={ver.id}
                  className="p-6 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="hidden sm:flex flex-col items-center shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                          <FileText size={18} />
                        </div>
                        <span className="text-[10px] font-medium text-gray-400 mt-1 uppercase">v{ver.version_number}</span>
                      </div>

                      <div className="hidden sm:flex flex-col items-center justify-center px-2 text-gray-300">
                        <ArrowRight size={16} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900">Version {ver.version_number}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
                            {ver.entity_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">Entity ID: <span className="font-mono text-xs">{ver.entity_id}</span></p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(ver.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleRestore(ver.id)}
                        disabled={restoring === ver.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {restoring === ver.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <RotateCcw size={13} />}
                        Restore
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
