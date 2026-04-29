import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Sparkles, TrendingUp, Upload, Trash2, Loader2, AlertCircle,
  Eye, ChevronRight, Clock, Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { resumeApi, versionApi, type Version } from '../lib/api';
import type { ResumeRecord } from '../lib/storage';
import { useToast } from '../contexts/ToastContext';


export function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Version management
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    loadResumes();
  }, []);

  async function loadResumes() {
    setLoading(true);
    try {
      const { resumes: apiResumes } = await resumeApi.list();
      const serverResumes: ResumeRecord[] = apiResumes.map((r) => ({
        id: r.id,
        original_filename: r.original_filename,
        created_at: r.created_at,
      }));
      setResumes(serverResumes);
    } catch {
      setError('Failed to load resumes. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(ext ?? '')) {
      const msg = 'Only PDF or DOCX files are supported.';
      setError(msg);
      toast(msg, 'error');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const res = await resumeApi.upload(file);
      const record: ResumeRecord = {
        id: res.id,
        original_filename: file.name,
        created_at: new Date().toISOString(),
      };
      setResumes((prev) => [record, ...prev]);

      // Auto-score
      setScoringId(res.id);
      try {
        const score = await resumeApi.score(res.id);
        record.ats_score = score.ats_score;
        setResumes((prev) => prev.map((resume) => (
          resume.id === res.id ? { ...resume, ats_score: score.ats_score } : resume
        )));
      } catch { /* score failed, that's ok */ }
      setScoringId(null);

      await loadResumes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    try {
      await resumeApi.delete(id);
      setResumes((prev) => prev.filter((resume) => resume.id !== id));
      if (selectedResumeId === id) {
        setSelectedResumeId(null);
        setVersions([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete.');
    } finally {
      setRemoving(null);
    }
  }

  async function handleScoreResume(id: string) {
    setScoringId(id);
    setError(null);
    try {
      const score = await resumeApi.score(id);
      setResumes((prev) => prev.map((resume) => (
        resume.id === id ? { ...resume, ats_score: score.ats_score } : resume
      )));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scoring failed.');
    } finally {
      setScoringId(null);
    }
  }

  async function handleViewVersions(id: string) {
    if (selectedResumeId === id) {
      setSelectedResumeId(null);
      setVersions([]);
      return;
    }
    setSelectedResumeId(id);
    setLoadingVersions(true);
    try {
      const res = await versionApi.getHistory(id);
      setVersions(res.versions);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  const lastScore = (() => {
    // Sort by created_at desc, pick the first one that has a score
    const sorted = [...resumes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latest = sorted.find((r) => r.ats_score !== undefined);
    return latest?.ats_score ?? null;
  })();

  const stats = [
    { label: 'Total Resumes', value: String(resumes.length), icon: FileText, color: 'orange' },
    { label: 'Last ATS Score', value: lastScore !== null ? `${lastScore}` : '—', icon: TrendingUp, color: 'green' },
    { label: 'Quick Access', value: 'Enhance', icon: Sparkles, color: 'blue', link: '/editor' },
  ];

  return (
    <DashboardLayout>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">My Resumes</h1>
          <p className="text-gray-500">Upload, score, and manage all your resumes and their versions.</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10 self-start sm:self-auto disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading…' : 'Upload Resume'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = '';
        }} />
      </header>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm"
        >
          <AlertCircle size={18} className="shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-500">{stat.label}</div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stat.color === 'orange' ? 'bg-orange-50 text-orange-500' :
                stat.color === 'green' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-500'
              }`}>
                <stat.icon size={16} />
              </div>
            </div>
            {stat.link ? (
              <Link to={stat.link} className="text-xl font-bold text-blue-600 tracking-tight hover:underline flex items-center gap-1">
                {stat.value} <ChevronRight size={18} />
              </Link>
            ) : (
              <div className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Drop Zone (compact) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer mb-8 ${
          dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-300 bg-white hover:bg-gray-50'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <div className="flex items-center justify-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            dragging ? 'bg-orange-100 text-orange-600' : 'bg-orange-50 text-orange-500'
          }`}>
            {uploading ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">
              {uploading ? 'Processing…' : 'Drag & drop or click to upload'}
            </h3>
            <p className="text-gray-500 text-xs">PDF or DOCX • Auto-scored upon upload</p>
          </div>
        </div>
      </motion.div>

      {/* Resume List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Your Resumes</h2>
          <span className="text-xs text-gray-400 font-medium">{resumes.length} file{resumes.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading resumes…</span>
          </div>
        ) : resumes.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No resumes yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mb-6">Upload your first resume to get started.</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="bg-[#0A0A0A] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 transition-all"
            >
              Upload Resume
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {resumes.map((resume, i) => (
              <div key={resume.id}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate">{resume.original_filename}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <Clock size={11} />
                        <span>{new Date(resume.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* ATS Score */}
                  <div className="flex items-center gap-4 shrink-0">
                    {scoringId === resume.id ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Loader2 size={14} className="animate-spin" /> Scoring…
                      </div>
                    ) : resume.ats_score !== undefined ? (
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 font-medium uppercase mb-1">ATS Score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${resume.ats_score >= 80 ? 'bg-green-500' : resume.ats_score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${resume.ats_score}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold ${resume.ats_score >= 80 ? 'text-green-600' : resume.ats_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {resume.ats_score}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleScoreResume(resume.id)}
                        className="hidden md:inline-flex text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors gap-1.5 items-center"
                      >
                        <Zap size={12} /> Score
                      </button>
                    )}

                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <button
                        onClick={() => handleViewVersions(resume.id)}
                        aria-label="View versions"
                        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        title="View versions"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => navigate(`/editor?resume=${resume.id}`)}
                        aria-label="Enhance resume"
                        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Enhance resume"
                      >
                        <Sparkles size={16} />
                      </button>
                      <button
                        onClick={() => handleRemove(resume.id)}
                        disabled={removing === resume.id}
                        aria-label="Delete resume"
                        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {removing === resume.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Versions Panel */}
                {selectedResumeId === resume.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gray-50 border-t border-gray-100 px-6 py-4"
                  >
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Resume Versions</h4>
                    {loadingVersions ? (
                      <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                        <Loader2 size={14} className="animate-spin" /> Loading versions…
                      </div>
                    ) : versions.length === 0 ? (
                      <p className="text-sm text-gray-500 py-2">No versions yet. Enhance this resume to create versions.</p>
                    ) : (
                      <div className="space-y-2">
                        {versions.map((ver) => (
                          <div key={ver.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 text-xs font-bold">
                                v{ver.version_number}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Version {ver.version_number}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(ver.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => versionApi.restore(ver.id)}
                              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
