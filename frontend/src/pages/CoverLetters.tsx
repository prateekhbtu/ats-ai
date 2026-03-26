import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileText, Sparkles, Loader2, Download,
  AlertCircle, Edit3, CheckCircle2, RefreshCw,
} from 'lucide-react';
import { resumeStore, jdStore, type ResumeRecord, type JdRecord } from '../lib/storage';
import { coverLetterApi } from '../lib/api';
import { ExportModal } from '../components/ExportModal';

type Tone = 'formal' | 'conversational' | 'assertive' | 'enthusiastic';

const TONES: { id: Tone; label: string; icon: string; desc: string }[] = [
  { id: 'formal',         label: 'Formal',         icon: '', desc: 'Classic professional business tone' },
  { id: 'conversational', label: 'Conversational',  icon: '', desc: 'Warm, direct & relatable style' },
  { id: 'assertive',      label: 'Assertive',       icon: '', desc: 'Bold, confident, high-impact' },
  { id: 'enthusiastic',   label: 'Enthusiastic',    icon: '', desc: 'Energetic & genuinely excited tone' },
];

const DROPDOWN_SVG = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;
const SELECT_STYLE = {
  backgroundImage: DROPDOWN_SVG,
  backgroundPosition: 'right 0.5rem center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '1.5em 1.5em',
};

export function CoverLetters() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [jobs, setJobs] = useState<JdRecord[]>([]);

  const [resumeId, setResumeId] = useState('');
  const [jdId, setJdId] = useState('');
  const [tone, setTone] = useState<Tone>('formal');

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editedContent, setEditedContent] = useState('');
  const [generated, setGenerated] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);

  const selectedResume = resumes.find(r => r.id === resumeId);
  const selectedJd = jobs.find(j => j.id === jdId);

  useEffect(() => {
    const rList = resumeStore.list();
    setResumes(rList);
    if (rList.length > 0) setResumeId(rList[0].id);

    const jList = jdStore.list();
    setJobs(jList);
    if (jList.length > 0) setJdId(jList[0].id);
  }, []);

  async function handleGenerate() {
    if (!resumeId) { setError('Please select a resume first.'); return; }
    if (!jdId) { setError('Please select a job description first.'); return; }

    setError(null);
    setGenerating(true);
    setGenerated(false);

    try {
      const result = await coverLetterApi.generate(resumeId, jdId, tone);
      setEditedContent(result.content);
      setGenerated(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate cover letter. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function handleExport() {
    if (!generated || !editedContent) {
      setError('Nothing to export yet. Generate a cover letter first.');
      return;
    }
    setExportModalOpen(true);
  }

  const canGenerate = !generating && !!resumeId && !!jdId;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans">
      {/* ── Header ── */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors border border-gray-200"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex flex-col leading-none">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Dashboard</span><span>/</span><span className="text-gray-600">Cover Letters</span>
            </div>
            <h1 className="text-sm font-extrabold text-gray-900 mt-0.5">AI Letter Generator</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {generated && (
            <button
              onClick={() => { setGenerated(false); setEditedContent(''); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={13} /> New
            </button>
          )}
          {generated && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#0A0A0A] rounded-lg hover:bg-black/80 transition-colors shadow-sm"
            >
              <Download size={13} /> Export PDF
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium shadow-sm"
          >
            <AlertCircle size={16} className="shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 transition font-bold">✕</button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT SIDEBAR ── */}
          <div className="lg:col-span-4 space-y-5">

            {/* Source selector card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={15} className="text-orange-500" /> Source Documents
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Resume
                  </label>
                  <select
                    value={resumeId}
                    onChange={e => setResumeId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition appearance-none font-medium cursor-pointer"
                    style={SELECT_STYLE}
                  >
                    {resumes.length === 0
                      ? <option value="" disabled>No resumes uploaded</option>
                      : resumes.map(r => <option key={r.id} value={r.id}>{r.original_filename}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Target Job Description
                  </label>
                  <select
                    value={jdId}
                    onChange={e => setJdId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition appearance-none font-medium cursor-pointer"
                    style={SELECT_STYLE}
                  >
                    {jobs.length === 0
                      ? <option value="" disabled>No jobs saved</option>
                      : jobs.map(j => (
                          <option key={j.id} value={j.id}>
                            {j.title}{j.company ? ` — ${j.company}` : ''}
                          </option>
                        ))
                    }
                  </select>
                </div>
              </div>
            </div>

            {/* Tone picker */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles size={15} className="text-orange-500" /> Writing Tone
              </h2>
              <div className="space-y-2.5">
                {TONES.map(t => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      tone === t.id
                        ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-500/10'
                        : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/40'
                    }`}
                  >
                    <input type="radio" name="tone" value={t.id} checked={tone === t.id}
                      onChange={() => setTone(t.id)} className="sr-only" />
                    <span className="text-lg leading-none">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold ${tone === t.id ? 'text-orange-900' : 'text-gray-900'}`}>
                        {t.label}
                      </div>
                      <div className={`text-[11px] mt-0.5 leading-snug ${tone === t.id ? 'text-orange-800/70' : 'text-gray-400'}`}>
                        {t.desc}
                      </div>
                    </div>
                    {tone === t.id && <CheckCircle2 size={16} className="shrink-0 text-orange-500 fill-orange-100" />}
                  </label>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full mt-5 bg-orange-500 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-orange-600 active:scale-[0.98] transition-all shadow-[0_4px_14px_0_rgba(249,115,22,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {generating
                  ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                  : <><Sparkles size={16} /> {generated ? 'Regenerate' : 'Generate Letter'}</>
                }
              </button>
            </div>
          </div>

          {/* ── RIGHT: Letter Pane ── */}
          <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[560px]">

            {/* Generating animation */}
            {generating && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-orange-50/60 to-white">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center mb-5 shadow-sm">
                  <Sparkles size={28} className="animate-pulse" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">Drafting your letter…</h3>
                <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
                  Merging{' '}
                  <strong className="text-gray-700">{selectedResume?.original_filename ?? 'your resume'}</strong>
                  {' '}with{' '}
                  <strong className="text-gray-700">{selectedJd?.title ?? 'the job'}</strong>
                  {selectedJd?.company ? <> at <strong className="text-gray-700">{selectedJd.company}</strong></> : null}
                  {' '}in a <strong className="text-gray-700">{TONES.find(t => t.id === tone)?.label}</strong> tone.
                </p>
                <div className="w-56 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-6">
                  <motion.div
                    initial={{ width: '5%' }}
                    animate={{ width: '88%' }}
                    transition={{ duration: 6, ease: 'easeInOut' }}
                    className="h-full bg-orange-400 rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Generated editor */}
            {!generating && generated && (
              <div className="flex-1 flex flex-col p-5 sm:p-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Edit3 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-extrabold text-gray-900">Edit Before Exporting</h3>
                    <p className="text-[11px] text-gray-500 leading-snug">Tweak the AI draft directly — then choose a template to export as PDF.</p>
                  </div>
                  <span className="shrink-0 hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                    {TONES.find(t => t.id === tone)?.icon} {tone}
                  </span>
                </div>
                <textarea
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  className="flex-1 w-full bg-gray-50/60 text-gray-800 p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none font-sans text-sm leading-relaxed min-h-[380px] sm:min-h-[420px]"
                  placeholder="Your generated cover letter will appear here…"
                />
              </div>
            )}

            {/* Empty state */}
            {!generating && !generated && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center mb-4">
                  <FileText size={26} />
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2 tracking-tight">Ready to Draft</h3>
                <p className="text-gray-500 text-sm max-w-xs leading-relaxed mb-6">
                  Select a resume and a job on the left, pick a tone, and let AI draft a perfectly tailored cover letter in seconds.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-extrabold text-[11px]">1</div>
                  <span>Pick resume & JD</span>
                  <span className="text-gray-300">→</span>
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-extrabold text-[11px]">2</div>
                  <span>Choose tone</span>
                  <span className="text-gray-300">→</span>
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold text-[11px]">3</div>
                  <span className="text-orange-600 font-semibold">Generate</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        type="cover-letter"
        content={editedContent}
        metadata={{
          userName: selectedResume?.original_filename?.replace(/\.[^/.]+$/, '') ?? 'Your Name',
          jobTitle: selectedJd?.title,
          company: selectedJd?.company,
        }}
      />
    </div>
  );
}
