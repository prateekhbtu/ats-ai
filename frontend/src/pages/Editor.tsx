import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Download, CheckCircle2, AlertCircle, FileText,
  PenTool, MessageSquare, Loader2, RefreshCw, ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  analysisApi, enhancerApi, coverLetterApi,
  type UniScoreResult, type EnhancedResumeResult, type ResumeSections,
} from '../lib/api';
import { resumeStore, jdStore, optimizationStore, type ResumeRecord, type JdRecord } from '../lib/storage';

type Tab = 'resume' | 'coverLetter';
type AssistantTab = 'insights' | 'suggestions' | 'coverLetterSettings';

function renderSections(sections: ResumeSections) {
  return (
    <div className="space-y-6">
      {sections.summary && (
        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">Summary</h4>
          <p className="text-sm text-gray-700 leading-relaxed">{sections.summary}</p>
        </div>
      )}
      {sections.experience && sections.experience.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">Experience</h4>
          {sections.experience.map((exp, i) => (
            <div key={i} className="mb-5">
              <div className="flex justify-between items-baseline mb-0.5">
                <h5 className="font-semibold text-gray-900 text-sm">{exp.title}</h5>
                <span className="text-xs text-gray-500">{exp.duration}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2 italic">{exp.company}</p>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1.5 leading-relaxed">
                {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {sections.skills && sections.skills.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">Skills</h4>
          <div className="flex flex-wrap gap-2">
            {sections.skills.map((s, i) => (
              <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg border border-gray-200">{s}</span>
            ))}
          </div>
        </div>
      )}
      {sections.education && sections.education.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">Education</h4>
          {sections.education.map((edu, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between items-baseline">
                <h5 className="font-semibold text-gray-900 text-sm">{edu.degree}</h5>
                <span className="text-xs text-gray-500">{edu.year}</span>
              </div>
              <p className="text-xs text-gray-500">{edu.institution}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Editor() {
  const [activeTab, setActiveTab] = useState<Tab>('resume');
  const [assistantTab, setAssistantTab] = useState<AssistantTab>('insights');
  const [tone, setTone] = useState<'formal' | 'conversational' | 'assertive'>('formal');

  // Resource lists
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [jobs, setJobs] = useState<JdRecord[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [jdId, setJdId] = useState('');

  // Results
  const [scoreResult, setScoreResult] = useState<UniScoreResult | null>(null);
  const [enhanceResult, setEnhanceResult] = useState<EnhancedResumeResult | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);

  // Loading states
  const [scoring, setScoring] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [generatingCL, setGeneratingCL] = useState(false);

  // Refine
  const [refineInstructions, setRefineInstructions] = useState('');
  const [refining, setRefining] = useState(false);

  // Errors
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const r = resumeStore.list();
    const j = jdStore.list();
    setResumes(r);
    setJobs(j);
    if (r.length > 0) setResumeId(r[0].id);
    if (j.length > 0) setJdId(j[0].id);
  }, []);

  const selectedResume = resumes.find((r) => r.id === resumeId);
  const selectedJob = jobs.find((j) => j.id === jdId);

  async function handleScore() {
    if (!resumeId || !jdId) { setError('Please select a resume and a job.'); return; }
    setError(null);
    setScoring(true);
    try {
      const result = await analysisApi.uniscore(resumeId, jdId);
      setScoreResult(result);
      setAssistantTab('insights');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setScoring(false);
    }
  }

  async function handleEnhance() {
    if (!resumeId || !jdId) { setError('Please select a resume and a job.'); return; }
    if (!scoreResult) { setError('Run ATS analysis first.'); return; }
    setError(null);
    setEnhancing(true);
    try {
      const result = await enhancerApi.enhance(resumeId, jdId, scoreResult.id);
      setEnhanceResult(result);
      setAssistantTab('suggestions');
      setActiveTab('resume');
      // Save to optimization store
      const job = jobs.find((j) => j.id === jdId);
      const resume = resumes.find((r) => r.id === resumeId);
      if (job && resume) {
        optimizationStore.add({
          id: result.id,
          resume_id: resumeId,
          jd_id: jdId,
          resume_filename: resume.original_filename,
          jd_title: job.title,
          jd_company: job.company,
          uniscore: scoreResult.uniscore,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Enhancement failed.');
    } finally {
      setEnhancing(false);
    }
  }

  async function handleRefine() {
    if (!enhanceResult || !refineInstructions.trim()) return;
    setRefining(true);
    try {
      const result = await enhancerApi.refine(enhanceResult.id, refineInstructions);
      setEnhanceResult(result);
      setRefineInstructions('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Refinement failed.');
    } finally {
      setRefining(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!resumeId || !jdId) { setError('Please select a resume and a job.'); return; }
    setError(null);
    setGeneratingCL(true);
    try {
      const result = await coverLetterApi.generate(resumeId, jdId, tone);
      setCoverLetter(result.content);
      setActiveTab('coverLetter');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cover letter generation failed.');
    } finally {
      setGeneratingCL(false);
    }
  }

  const scoreColor = scoreResult
    ? scoreResult.uniscore >= 80 ? 'bg-green-500' : scoreResult.uniscore >= 60 ? 'bg-amber-500' : 'bg-red-500'
    : 'bg-orange-500';

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA] overflow-hidden font-sans">
      {/* Editor Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 shadow-sm relative">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors border border-gray-200 shadow-sm">
            <ArrowLeft size={16} />
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-gray-900 leading-tight">
              {selectedJob ? `${selectedJob.title} — ${selectedJob.company}` : 'Select a Job to Begin'}
            </h1>
            <p className="text-[10px] text-gray-400">{selectedResume?.original_filename ?? 'No resume selected'}</p>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="absolute left-1/2 -translate-x-1/2 flex bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => setActiveTab('resume')}
            className={cn("px-3 sm:px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5", activeTab === 'resume' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900")}
          >
            <FileText size={13} /> <span className="hidden sm:inline">Resume</span>
          </button>
          <button
            onClick={() => setActiveTab('coverLetter')}
            className={cn("px-3 sm:px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5", activeTab === 'coverLetter' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900")}
          >
            <MessageSquare size={13} /> <span className="hidden sm:inline">Cover Letter</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScore}
            disabled={scoring || !resumeId || !jdId}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {scoring ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Analyze
          </button>
          <button className="inline-flex items-center gap-1.5 bg-[#0A0A0A] text-white px-3 sm:px-4 py-2 rounded-lg text-xs font-medium hover:bg-black/80 transition-colors shadow-md">
            <Download size={14} /> <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </header>

      {/* Resource Selectors */}
      {(resumes.length > 0 || jobs.length > 0) && (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Working with:</span>
          <div className="relative">
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer"
            >
              {resumes.length === 0 && <option value="">No resumes — upload first</option>}
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.original_filename}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <span className="text-gray-300">→</span>
          <div className="relative">
            <select
              value={jdId}
              onChange={(e) => setJdId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer"
            >
              {jobs.length === 0 && <option value="">No jobs — save one first</option>}
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={handleScore}
            disabled={scoring || !resumeId || !jdId}
            className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {scoring ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Analyze
          </button>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400">✕</button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Document View */}
        <div className="flex-1 border-r border-gray-200 bg-gray-100/50 flex flex-col relative overflow-y-auto">
          <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
          <div className="p-4 sm:p-8 relative z-10 flex justify-center min-h-full items-start">
            <AnimatePresence mode="wait">
              {activeTab === 'resume' ? (
                <motion.div
                  key="resume"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full max-w-[800px] bg-white border border-gray-200 shadow-xl rounded-sm p-8 sm:p-12 min-h-[600px]"
                >
                  {enhanceResult ? (
                    <>
                      <div className="border-b border-gray-300 pb-6 mb-8 text-center">
                        <h3 className="text-2xl font-light tracking-tight text-gray-900 mb-1 uppercase">Enhanced Resume</h3>
                        <p className="text-xs text-gray-400">Version {enhanceResult.version} • AI-Optimized</p>
                      </div>
                      {renderSections(enhanceResult.enhanced_sections)}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
                      <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center mb-4">
                        <Sparkles size={28} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Optimize</h3>
                      <p className="text-gray-500 text-sm max-w-sm mb-6">
                        Select your resume and a target job, click <strong>Analyze</strong> to score your match, then <strong>Enhance</strong> to generate an AI-optimized version.
                      </p>
                      <button
                        onClick={handleScore}
                        disabled={scoring || !resumeId || !jdId}
                        className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black transition-all disabled:opacity-50"
                      >
                        {scoring ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</> : <><RefreshCw size={15} /> Run Analysis</>}
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="coverLetter"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full max-w-[800px] bg-white border border-gray-200 shadow-xl rounded-sm p-8 sm:p-12 min-h-[600px]"
                >
                  {coverLetter ? (
                    <div className="text-sm text-gray-800 leading-loose whitespace-pre-wrap">{coverLetter}</div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
                        <MessageSquare size={24} />
                      </div>
                      <p className="text-gray-500 text-sm">Generate a cover letter from the AI Assistant panel →</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: AI Assistant Panel */}
        <div className="w-[360px] lg:w-[420px] bg-white flex flex-col shrink-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] border-l border-gray-200 hidden md:flex">

          <div className="flex border-b border-gray-200 bg-gray-50/80">
            {(['insights', 'suggestions', 'coverLetterSettings'] as AssistantTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setAssistantTab(tab); if (tab === 'coverLetterSettings') setActiveTab('coverLetter'); }}
                className={cn("flex-1 py-3 text-[10px] font-semibold uppercase tracking-wider border-b-2 transition-colors", assistantTab === tab ? "border-orange-500 text-orange-600 bg-white" : "border-transparent text-gray-500 hover:text-gray-900")}
              >
                {tab === 'insights' ? 'ATS Insights' : tab === 'suggestions' ? 'Suggestions' : 'Cover Letter'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-white">
            <AnimatePresence mode="wait">

              {/* INSIGHTS */}
              {assistantTab === 'insights' && (
                <motion.div key="insights" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  {!scoreResult ? (
                    <div className="flex flex-col items-center text-center py-10">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center mb-3">
                        <RefreshCw size={22} />
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Run an analysis to see your ATS match score and feedback.</p>
                      <button
                        onClick={handleScore}
                        disabled={scoring || !resumeId || !jdId}
                        className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-black transition-all disabled:opacity-50"
                      >
                        {scoring ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</> : <><Sparkles size={14} /> Analyze Match</>}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Score Card */}
                      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
                        <div className="flex justify-between items-center mb-3 relative z-10">
                          <span className="text-sm font-semibold text-gray-900">ATS Match Score</span>
                          <span className="text-3xl font-bold text-gray-900 tracking-tighter">{scoreResult.uniscore}<span className="text-sm text-gray-400 font-normal">/100</span></span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-5 relative z-10">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${scoreResult.uniscore}%` }} transition={{ duration: 1, ease: "easeOut" }} className={`h-full ${scoreColor} rounded-full`} />
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-2 mb-5">
                          {Object.entries(scoreResult.breakdown).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 capitalize w-36 shrink-0">{key.replace(/_/g, ' ')}</span>
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full bg-orange-400 rounded-full" />
                              </div>
                              <span className="text-xs font-semibold text-gray-600 w-8 text-right">{val}</span>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2 relative z-10">
                          {scoreResult.strengths.slice(0, 2).map((s, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-green-50/50 p-2 rounded-lg border border-green-100">
                              <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" /> {s}
                            </div>
                          ))}
                          {scoreResult.weaknesses.slice(0, 2).map((w, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                              <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" /> {w}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Enhance button */}
                      <button
                        onClick={handleEnhance}
                        disabled={enhancing}
                        className="w-full bg-[#0A0A0A] text-white py-3 rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {enhancing ? <><Loader2 size={15} className="animate-spin" /> Enhancing…</> : <><Sparkles size={15} /> Enhance Resume with AI</>}
                      </button>
                    </>
                  )}
                </motion.div>
              )}

              {/* SUGGESTIONS */}
              {assistantTab === 'suggestions' && (
                <motion.div key="suggestions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  {!enhanceResult ? (
                    <div className="flex flex-col items-center text-center py-10">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                        <PenTool size={22} />
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Run analysis and enhance to see AI suggestions and diffs.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-xs mb-4">
                        <Sparkles size={15} className="shrink-0" />
                        <p><strong>{enhanceResult.diff.filter(d => d.change_type !== 'unchanged').length} changes</strong> applied in version {enhanceResult.version}.</p>
                      </div>

                      <div className="space-y-3 max-h-[360px] overflow-y-auto">
                        {enhanceResult.diff.filter(d => d.change_type !== 'unchanged').map((diff, i) => (
                          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white text-xs">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                              <span className="font-bold text-gray-500 uppercase tracking-wider">{diff.section}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                diff.change_type === 'added' ? 'bg-green-100 text-green-700' :
                                diff.change_type === 'removed' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                              }`}>{diff.change_type}</span>
                            </div>
                            {diff.original && (
                              <div className="px-3 py-2 bg-red-50/30 text-gray-500 line-through">{diff.original.slice(0, 120)}{diff.original.length > 120 ? '…' : ''}</div>
                            )}
                            {diff.enhanced && (
                              <div className="px-3 py-2 bg-green-50/30 text-gray-800 font-medium">{diff.enhanced.slice(0, 120)}{diff.enhanced.length > 120 ? '…' : ''}</div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Refine */}
                      <div className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <MessageSquare size={13} /> Interactive Refinement
                        </h3>
                        <textarea
                          value={refineInstructions}
                          onChange={(e) => setRefineInstructions(e.target.value)}
                          placeholder='e.g. "Make the summary more concise" or "Emphasize leadership"'
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none h-20"
                        />
                        <button
                          onClick={handleRefine}
                          disabled={refining || !refineInstructions.trim()}
                          className="w-full mt-2 bg-white border border-gray-200 text-gray-900 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {refining ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          {refining ? 'Refining…' : 'Refine with AI'}
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* COVER LETTER */}
              {assistantTab === 'coverLetterSettings' && (
                <motion.div key="cl" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <MessageSquare size={16} className="text-orange-500" /> Cover Letter Builder
                    </h3>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tone</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['formal', 'conversational', 'assertive'] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => setTone(t)}
                              className={cn(
                                "py-2 text-xs font-medium rounded-lg border capitalize transition-all",
                                tone === t ? "bg-orange-50 border-orange-200 text-orange-700 shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">
                          {tone === 'formal' && 'Standard business language. Best for corporate roles.'}
                          {tone === 'conversational' && 'Friendly tone. Best for startups and modern tech companies.'}
                          {tone === 'assertive' && 'Confident & direct. Best for leadership and senior roles.'}
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateCoverLetter}
                        disabled={generatingCL || !resumeId || !jdId}
                        className="w-full bg-[#0A0A0A] text-white font-medium py-3 rounded-xl hover:bg-black transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
                      >
                        {generatingCL ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={15} /> Generate Cover Letter</>}
                      </button>
                    </div>
                  </div>

                  {coverLetter && (
                    <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-800 flex items-center gap-2">
                      <CheckCircle2 size={15} /> Cover letter generated! View it in the left panel.
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                    Automatically tailored from your resume + job description.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
