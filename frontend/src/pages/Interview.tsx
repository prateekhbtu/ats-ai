import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Loader2, AlertCircle, ChevronDown, ChevronUp,
  Sparkles, Users, Wrench, Lightbulb,
} from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { interviewApi, type InterviewQuestion } from '../lib/api';
import { resumeStore, jdStore, type ResumeRecord, type JdRecord } from '../lib/storage';
import { cn } from '../lib/utils';

const CATEGORY_META: Record<InterviewQuestion['category'], { label: string; color: string; icon: React.ElementType }> = {
  technical: { label: 'Technical', color: 'blue', icon: Wrench },
  behavioral: { label: 'Behavioral', color: 'purple', icon: Users },
  situational: { label: 'Situational', color: 'green', icon: Lightbulb },
};

function QuestionCard({ q, index }: { q: InterviewQuestion; index: number }) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[q.category];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
          meta.color === 'blue' ? 'bg-blue-50 text-blue-600' :
          meta.color === 'purple' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600',
        )}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{q.question}</p>
        </div>
        <div className="shrink-0 text-gray-400 mt-0.5">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-3 border-t border-gray-100">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Context</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{q.context}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lightbulb size={11} /> Suggested Approach
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-orange-50/50 p-3 rounded-xl border border-orange-100">{q.suggested_approach}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Interview() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [jobs, setJobs] = useState<JdRecord[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [jdId, setJdId] = useState('');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<InterviewQuestion['category'] | 'all'>('all');

  useEffect(() => {
    const r = resumeStore.list();
    const j = jdStore.list();
    setResumes(r);
    setJobs(j);
    if (r.length > 0) setResumeId(r[0].id);
    if (j.length > 0) setJdId(j[0].id);
  }, []);

  async function handleGenerate() {
    if (!resumeId || !jdId) { setError('Please select a resume and a job first.'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await interviewApi.generate(resumeId, jdId);
      setQuestions(res.questions);
      setActiveCategory('all');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = activeCategory === 'all' ? questions : questions.filter((q) => q.category === activeCategory);
  const counts = {
    all: questions.length,
    technical: questions.filter((q) => q.category === 'technical').length,
    behavioral: questions.filter((q) => q.category === 'behavioral').length,
    situational: questions.filter((q) => q.category === 'situational').length,
  };

  const hasResumes = resumes.length > 0;
  const hasJobs = jobs.length > 0;

  return (
    <DashboardLayout>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Interview Prep</h1>
          <p className="text-gray-500">Generate targeted interview questions based on your resume and target job.</p>
        </div>
        {questions.length > 0 && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-all shadow-sm self-start sm:self-auto"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Regenerate
          </button>
        )}
      </header>

      {/* Setup Panel (shown when no questions yet) */}
      {questions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto"
        >
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-5">
              <Brain size={30} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Prepare for Your Interview</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
              Select the resume and job you're targeting. Our AI will generate tailored technical, behavioral, and situational questions.
            </p>

            {!hasResumes || !hasJobs ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex items-start gap-3 mb-6">
                <AlertCircle size={17} className="shrink-0 mt-0.5" />
                <span>
                  {!hasResumes && !hasJobs ? 'Please upload a resume and save a job description first.' :
                   !hasResumes ? 'Please upload a base resume first.' : 'Please save a job description first.'}
                </span>
              </div>
            ) : null}

            <div className="space-y-4 text-left mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Base Resume</label>
                <div className="relative">
                  <select
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                    disabled={!hasResumes}
                    className="w-full appearance-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-50 cursor-pointer"
                  >
                    {!hasResumes && <option>No resumes uploaded</option>}
                    {resumes.map((r) => <option key={r.id} value={r.id}>{r.original_filename}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Target Job</label>
                <div className="relative">
                  <select
                    value={jdId}
                    onChange={(e) => setJdId(e.target.value)}
                    disabled={!hasJobs}
                    className="w-full appearance-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-50 cursor-pointer"
                  >
                    {!hasJobs && <option>No jobs saved</option>}
                    {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !hasResumes || !hasJobs}
              className="w-full bg-[#0A0A0A] text-white py-3.5 rounded-2xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-black/10"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Generating Questions…</> : <><Brain size={16} /> Generate Interview Questions</>}
            </button>
          </div>
        </motion.div>
      )}

      {/* Questions */}
      {questions.length > 0 && (
        <div>
          {/* Header bar with category filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{questions.length} questions</span> generated for{' '}
              <span className="font-medium">{jobs.find((j) => j.id === jdId)?.title}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {(['all', 'technical', 'behavioral', 'situational'] as const).map((cat) => {
                const count = counts[cat];
                if (count === 0 && cat !== 'all') return null;
                const meta = cat !== 'all' ? CATEGORY_META[cat] : null;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      activeCategory === cat
                        ? 'bg-[#0A0A0A] text-white border-transparent shadow-md'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                    )}
                  >
                    {meta ? <span className="flex items-center gap-1"><meta.icon size={11} />{meta.label}</span> : 'All'} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {filtered.map((q, i) => (
              <QuestionCard key={i} q={q} index={i} />
            ))}
          </div>

          {/* Re-select controls at bottom */}
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Change Selection</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <select value={resumeId} onChange={(e) => setResumeId(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 cursor-pointer">
                  {resumes.map((r) => <option key={r.id} value={r.id}>{r.original_filename}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={jdId} onChange={(e) => setJdId(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 cursor-pointer">
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <button onClick={handleGenerate} disabled={loading}
              className="mt-4 inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-all disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? 'Generating…' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
