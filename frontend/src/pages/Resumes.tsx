import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, MoreVertical, Calendar, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { resumeApi } from '../lib/api';
import { resumeStore, type ResumeRecord } from '../lib/storage';

export function Resumes() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setResumes(resumeStore.list());
  }, []);

  async function handleUpload(file: File) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(ext ?? '')) {
      setError('Only PDF or DOCX files are supported.');
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
      resumeStore.add(record);
      setResumes(resumeStore.list());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function handleRemove(id: string) {
    resumeStore.remove(id);
    setResumes(resumeStore.list());
  }

  return (
    <DashboardLayout>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Base Resumes</h1>
          <p className="text-gray-500">Upload and manage your master resumes to use as starting points.</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-900 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading…' : 'Upload Resume'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileInput} />
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

      {/* Upload Dropzone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-colors cursor-pointer mb-12 ${
          dragging
            ? 'border-orange-400 bg-orange-50'
            : 'border-gray-300 bg-white hover:bg-gray-50'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
          dragging ? 'bg-orange-100 text-orange-600' : 'bg-orange-50 text-orange-500'
        }`}>
          {uploading ? <Loader2 size={28} className="animate-spin" /> : <Upload size={28} />}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {uploading ? 'Processing your resume…' : 'Click to upload or drag and drop'}
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          {uploading
            ? 'AI is extracting your experience. This may take a moment.'
            : "Upload your existing resume in PDF or DOCX format. We'll extract your experience for future optimizations."}
        </p>
      </motion.div>

      {/* Resume List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Your Documents</h2>
          <span className="text-xs text-gray-400 font-medium">{resumes.length} file{resumes.length !== 1 ? 's' : ''}</span>
        </div>

        {resumes.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
              <FileText size={24} />
            </div>
            <p className="text-gray-500 text-sm">No resumes uploaded yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {resumes.map((resume, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                key={resume.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{resume.original_filename}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <Calendar size={11} />
                      <span>{new Date(resume.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">Ready</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRemove(resume.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
