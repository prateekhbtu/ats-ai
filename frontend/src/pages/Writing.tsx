import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenLine, Loader2, AlertCircle, CheckCircle2, BarChart2,
  ChevronDown, ChevronUp, AlertTriangle, Info,
} from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { writingApi, type WritingAnalysisResult, type WritingIssue } from '../lib/api';
import { cn } from '../lib/utils';

const SEVERITY_META: Record<WritingIssue['severity'], { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  high: { label: 'High', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
  medium: { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle },
  low: { label: 'Low', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Info },
};

const TYPE_LABELS: Record<WritingIssue['type'], string> = {
  weak_phrasing: 'Weak Phrasing',
  long_sentence: 'Long Sentence',
  passive_voice: 'Passive Voice',
  grammar_risk: 'Grammar Risk',
  clarity: 'Clarity',
};

function IssueCard({ issue, index }: { issue: WritingIssue; index: number }) {
  const [open, setOpen] = useState(false);
  const meta = SEVERITY_META[issue.severity];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn('rounded-2xl border overflow-hidden', meta.border, meta.bg)}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-start gap-3 text-left"
      >
        <Icon size={16} className={cn('shrink-0 mt-0.5', meta.text)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded', meta.text, 'bg-white/60 border', meta.border)}>
              {meta.label}
            </span>
            <span className="text-[10px] font-medium text-gray-500 bg-white/60 px-2 py-0.5 rounded border border-gray-200">
              {TYPE_LABELS[issue.type]}
            </span>
          </div>
          <p className={cn('text-sm font-medium leading-snug', meta.text)}>
            "{issue.text.slice(0, 100)}{issue.text.length > 100 ? '…' : ''}"
          </p>
        </div>
        <div className={cn('shrink-0', meta.text)}>
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-3 border-t border-white/50">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Problematic Text</h4>
                <p className={cn('text-sm p-3 rounded-xl bg-white/70 border', meta.border, meta.text, 'font-medium')}>
                  "{issue.text}"
                </p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Suggestion
                </h4>
                <p className="text-sm text-gray-800 p-3 rounded-xl bg-green-50/60 border border-green-200 leading-relaxed">
                  {issue.suggestion}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const SAMPLE_TEXT = `I am a highly motivated and passionate software engineer with extensive experience in building scalable web applications. I was responsible for the development and maintenance of the frontend codebase. Various improvements were made by the team which resulted in better performance metrics being achieved. I have been involved in multiple projects where I worked collaboratively with cross-functional teams to deliver solutions that met the requirements of stakeholders.`;

export function Writing() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<WritingAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<WritingIssue['severity'] | 'all'>('all');

  async function handleAnalyze() {
    if (text.trim().length < 30) {
      setError('Please enter at least 30 characters of text to analyze.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await writingApi.analyze(text);
      setResult(res);
      setActiveFilter('all');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setActiveFilter('all');
  }

  const filtered = result
    ? activeFilter === 'all' ? result.issues : result.issues.filter((i) => i.severity === activeFilter)
    : [];

  const counts = result ? {
    all: result.issues.length,
    high: result.issues.filter((i) => i.severity === 'high').length,
    medium: result.issues.filter((i) => i.severity === 'medium').length,
    low: result.issues.filter((i) => i.severity === 'low').length,
  } : null;

  const scoreColor = result
    ? result.overall_score >= 80 ? 'text-green-600' : result.overall_score >= 60 ? 'text-amber-600' : 'text-red-600'
    : '';

  return (
    <DashboardLayout>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Writing Analysis</h1>
          <p className="text-gray-500">Analyze your resume text for clarity, tone, passive voice, and impact.</p>
        </div>
        {result && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-all shadow-sm self-start sm:self-auto"
          >
            Analyze New Text
          </button>
        )}
      </header>

      {!result ? (
        /* Input Panel */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <PenLine size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Paste Resume Text</h2>
                <p className="text-xs text-gray-400">Paste a section or your full resume for analysis.</p>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your resume text here — work experience, summary, cover letter, etc."
              rows={12}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none mb-4"
            />

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{text.length} characters</span>
                {text.trim().length === 0 && (
                  <button
                    onClick={() => setText(SAMPLE_TEXT)}
                    className="text-xs text-orange-500 hover:text-orange-700 font-medium transition-colors"
                  >
                    Try sample text →
                  </button>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={loading || text.trim().length < 30}
                className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-7 py-3 rounded-2xl text-sm font-medium hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-black/10"
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</> : <><BarChart2 size={15} /> Analyze Writing</>}
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Results */
        <div className="space-y-8">
          {/* Score Banner */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#F3F4F6" strokeWidth="8" />
                    <motion.circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke={result.overall_score >= 80 ? '#22C55E' : result.overall_score >= 60 ? '#F59E0B' : '#EF4444'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - result.overall_score / 100) }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn('text-xl font-bold', scoreColor)}>{result.overall_score}</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-0.5">Writing Score</h2>
                  <p className="text-sm text-gray-500">{result.issues.length} issue{result.issues.length !== 1 ? 's' : ''} detected</p>
                </div>
              </div>

              <div className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* Issue counts */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
              {(['high', 'medium', 'low'] as const).map((sev) => {
                const meta = SEVERITY_META[sev];
                const count = counts![sev];
                return (
                  <div key={sev} className={cn('p-3 rounded-xl border text-center', meta.bg, meta.border)}>
                    <div className={cn('text-2xl font-bold', meta.text)}>{count}</div>
                    <div className={cn('text-xs font-medium mt-0.5', meta.text)}>{meta.label} Issues</div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Issues List */}
          {result.issues.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h3 className="text-lg font-bold text-gray-900">Issues Found</h3>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'high', 'medium', 'low'] as const).map((f) => {
                    const count = counts![f];
                    if (count === 0 && f !== 'all') return null;
                    const meta = f !== 'all' ? SEVERITY_META[f] : null;
                    return (
                      <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-all',
                          activeFilter === f
                            ? 'bg-[#0A0A0A] text-white border-transparent'
                            : meta
                              ? cn('border', meta.border, meta.text, meta.bg)
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                        )}
                      >
                        {f === 'all' ? 'All' : SEVERITY_META[f].label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {filtered.map((issue, i) => (
                  <IssueCard key={i} issue={issue} index={i} />
                ))}
              </div>
            </div>
          )}

          {result.issues.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-16 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center mb-4">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Found</h3>
              <p className="text-gray-500 text-sm">Your writing is clear and professional. Great work!</p>
            </motion.div>
          )}

          {/* Re-analyze button */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Analyze Different Text</h3>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none mb-3"
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || text.trim().length < 30}
              className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
              {loading ? 'Analyzing…' : 'Re-analyze'}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
