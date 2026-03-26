import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload as UploadIcon, Loader2, AlertCircle, CheckCircle2, ArrowRight, Sparkles,
  Star, ArrowLeft,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { resumeApi, type StandaloneScoreResult } from '../lib/api';
import { resumeStore } from '../lib/storage';
import { saveResumeFile } from '../lib/idb';
import { useAuth } from '../contexts/AuthContext';

export function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<StandaloneScoreResult | null>(null);

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
      
      // Cache the raw file for the Editor to proudly show the "exact uploaded resume" later
      await saveResumeFile(res.id, file).catch(console.error);
      
      resumeStore.add({
        id: res.id,
        original_filename: file.name,
        created_at: new Date().toISOString(),
      });

      // Auto-score
      setScoring(true);
      setUploading(false);
      try {
        const score = await resumeApi.score(res.id);
        setScoreResult(score);
        resumeStore.update(res.id, { ats_score: score.ats_score });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'ATS scoring failed.');
      } finally {
        setScoring(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50 flex flex-col p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Back nav */}
      <div className="relative z-10 mb-4 w-full max-w-4xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex-1 flex flex-col items-center justify-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-gray-500 text-lg">
            Upload your resume and get an instant ATS compatibility score.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!scoreResult && !scoring ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Upload Area */}
              <div
                onClick={() => !uploading && fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`bg-white rounded-3xl border-2 border-dashed p-16 text-center transition-all cursor-pointer shadow-xl shadow-black/5 ${
                  dragging
                    ? 'border-orange-400 bg-orange-50 scale-[1.02]'
                    : 'border-gray-300 hover:border-orange-300 hover:bg-orange-50/30'
                } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-colors ${
                  dragging ? 'bg-orange-100 text-orange-600' : 'bg-orange-50 text-orange-500'
                }`}>
                  {uploading ? <Loader2 size={36} className="animate-spin" /> : <UploadIcon size={36} />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {uploading ? 'Processing your resume…' : 'Drop your resume here'}
                </h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                  {uploading
                    ? 'AI is extracting and analyzing your resume. This may take a moment.'
                    : 'Upload in PDF or DOCX format. We\'ll instantly analyze it and calculate your ATS score.'}
                </p>
                {!uploading && (
                  <button className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-black/80 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/15">
                    <UploadIcon size={16} /> Choose File
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileInput} />
            </motion.div>
          ) : scoring ? (
            <motion.div
              key="scoring"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-16 text-center shadow-xl shadow-black/5 border border-gray-200"
            >
              <div className="w-20 h-20 rounded-3xl bg-orange-50 flex items-center justify-center mx-auto mb-6">
                <Sparkles size={36} className="text-orange-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Calculating ATS Score…</h3>
              <p className="text-gray-500 text-sm">Our AI is analyzing your resume\'s format, content, and readability.</p>
              <div className="mt-8 w-48 h-2 bg-gray-100 rounded-full mx-auto overflow-hidden">
                <motion.div
                  initial={{ width: '5%' }}
                  animate={{ width: '90%' }}
                  transition={{ duration: 3, ease: 'easeInOut' }}
                  className="h-full bg-orange-400 rounded-full"
                />
              </div>
            </motion.div>
          ) : scoreResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 w-full flex flex-col md:flex-row gap-8 lg:gap-12 items-center md:items-stretch"
            >
              {/* Left: Gauge */}
              <div className="bg-[#fafafa] rounded-[1.5rem] border border-gray-100 flex flex-col items-center justify-center p-8 w-full md:w-[320px] shrink-0">
                <div className="relative w-48 h-48 mb-6">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                    <motion.circle
                      initial={{ strokeDasharray: '0 251.2' }}
                      animate={{ strokeDasharray: `${(scoreResult.ats_score / 100) * 251.2} 251.2` }}
                      transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                      cx="50" cy="50" r="40"
                      fill="none" stroke="#f97316"
                      strokeWidth="10" strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-5xl font-extrabold text-[#1f2937]"
                    >
                      {scoreResult.ats_score}
                    </motion.span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ATS Score</span>
                  </div>
                </div>
                <div className={`px-5 py-2 rounded-full text-sm font-bold ${
                  scoreResult.ats_score >= 80 ? 'bg-green-100 text-green-700' :
                  scoreResult.ats_score >= 60 ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {scoreResult.ats_score >= 80 ? 'Optimized' : scoreResult.ats_score >= 60 ? 'Good Start' : 'Needs Work'}
                </div>
              </div>

              {/* Right: Breakdown & Actions */}
              <div className="flex-1 flex flex-col justify-center py-2 w-full">
                <h3 className="text-lg font-bold text-[#1f2937] mb-6">Score Breakdown</h3>
                <div className="space-y-6">
                  {[
                    { label: 'Readability', value: scoreResult.breakdown.readability },
                    { label: 'Section Completeness', value: scoreResult.breakdown.section_completeness },
                    { label: 'Experience Depth', value: scoreResult.breakdown.experience_depth },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-semibold text-gray-500">{label}</span>
                        <span className="text-sm font-bold text-gray-600">{value}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${value}%` }}
                          transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                          className="h-full bg-[#f97316] rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Feedback */}
                {scoreResult.feedback && scoreResult.feedback.length > 0 && (
                  <div className="mt-8 bg-orange-50/50 border border-orange-100/50 rounded-xl p-4">
                    <div className="space-y-2">
                      {scoreResult.feedback.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          {f.includes('Great') || f.includes('Excellent') || f.includes('Good') ? (
                            <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <Star size={16} className="text-orange-400 shrink-0 mt-0.5" />
                          )}
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-100">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 bg-[#1f2937] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                  >
                    Go to Dashboard <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setScoreResult(null);
                    }}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    Upload Another Resume
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 mt-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm"
          >
            <AlertCircle size={18} className="shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
