import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Download, CheckCircle2, AlertCircle, FileText,
  Loader2, ChevronDown, Play, Save, Edit3, X, Plus, Trash2, Wand2, Send,
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  resumeApi, jdApi, analysisApi, enhancerApi,
  type UniScoreResult, type EnhancedResumeResult, type ResumeSections,
  type ResumeDetail,
} from '../lib/api';
import { resumeStore, jdStore, type ResumeRecord, type JdRecord } from '../lib/storage';
import { ExportModal } from '../components/ExportModal';

// ─── Resume Preview Renderer ────────────────────────────────────────────────

function ResumePreview({
  sections,
  title,
  subtitle,
  onEditSection,
  editable = false,
}: {
  sections: ResumeSections;
  title: string;
  subtitle?: string;
  onEditSection?: (sectionKey: string, index?: number) => void;
  editable?: boolean;
}) {
  const sectionClass = editable
    ? 'cursor-pointer hover:bg-orange-50/50 rounded-lg px-2 -mx-2 py-1 transition-colors border border-transparent hover:border-orange-200 group relative'
    : '';

  const editHint = editable ? (
    <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
      Click to edit
    </span>
  ) : null;

  return (
    <div className="bg-white border border-gray-200 shadow-xl rounded-sm p-8 sm:p-10 min-h-[600px]">
      <div className="border-b border-gray-300 pb-4 mb-6 text-center">
        <h3 className="text-xl font-light tracking-tight text-gray-900 uppercase">{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-400 mt-1">{subtitle}</p>}
      </div>

      <div className="space-y-5">
        {sections.summary && (
          <div className={sectionClass} onClick={() => onEditSection?.('summary')}>
            {editHint}
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Summary</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{sections.summary}</p>
          </div>
        )}

        {sections.experience && sections.experience.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Experience</h4>
            {sections.experience.map((exp, i) => (
              <div key={i} className={`mb-4 ${sectionClass}`} onClick={() => onEditSection?.('experience', i)}>
                {editHint}
                <div className="flex justify-between items-baseline mb-0.5">
                  <h5 className="font-semibold text-gray-900 text-sm">{exp.title}</h5>
                  <span className="text-xs text-gray-500">{exp.duration}</span>
                </div>
                <p className="text-xs text-gray-500 mb-1.5 italic">{exp.company}</p>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 leading-relaxed">
                  {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {sections.skills && sections.skills.length > 0 && (
          <div className={sectionClass} onClick={() => onEditSection?.('skills')}>
            {editHint}
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {sections.skills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200">{s}</span>
              ))}
            </div>
          </div>
        )}

        {sections.education && sections.education.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Education</h4>
            {sections.education.map((edu, i) => (
              <div key={i} className={`mb-2 ${sectionClass}`} onClick={() => onEditSection?.('education', i)}>
                {editHint}
                <div className="flex justify-between items-baseline">
                  <h5 className="font-semibold text-gray-900 text-sm">{edu.degree}</h5>
                  <span className="text-xs text-gray-500">{edu.year}</span>
                </div>
                <p className="text-xs text-gray-500">{edu.institution}</p>
                {edu.details && <p className="text-xs text-gray-600 mt-1">{edu.details}</p>}
              </div>
            ))}
          </div>
        )}

        {sections.projects && sections.projects.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Projects</h4>
            {sections.projects.map((proj, i) => (
              <div key={i} className={`mb-3 ${sectionClass}`} onClick={() => onEditSection?.('projects', i)}>
                {editHint}
                <h5 className="font-semibold text-gray-900 text-sm">{proj.name}</h5>
                <p className="text-sm text-gray-700 mt-1">{proj.description}</p>
                {proj.technologies?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Technologies: {proj.technologies.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {sections.certifications && sections.certifications.length > 0 && (
          <div className={sectionClass} onClick={() => onEditSection?.('certifications')}>
            {editHint}
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Certifications</h4>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {sections.certifications.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}

        {sections.other && sections.other.length > 0 && (
          <div className={sectionClass} onClick={() => onEditSection?.('other')}>
            {editHint}
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Other</h4>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {sections.other.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inline Section Editor (Manual + AI Prompt) ─────────────────────────────

function SectionEditor({
  sections,
  sectionKey,
  sectionIndex,
  enhancedResumeId,
  onSave,
  onAiUpdate,
  onCancel,
}: {
  sections: ResumeSections;
  sectionKey: string;
  sectionIndex?: number;
  enhancedResumeId?: string;
  onSave: (updated: ResumeSections) => void;
  onAiUpdate: (result: EnhancedResumeResult) => void;
  onCancel: () => void;
}) {
  const [editSections, setEditSections] = useState<ResumeSections>(JSON.parse(JSON.stringify(sections)));
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [tab, setTab] = useState<'manual' | 'ai'>('manual');

  async function handleAiOptimize() {
    if (!aiPrompt.trim() || !enhancedResumeId) return;
    setAiLoading(true);
    try {
      const sectionPath = sectionIndex !== undefined
        ? `${sectionKey}.${sectionIndex}`
        : sectionKey;
      const result = await enhancerApi.optimizeSection(enhancedResumeId, sectionPath, aiPrompt.trim());
      onAiUpdate(result);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'AI optimization failed.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAiRefine() {
    if (!aiPrompt.trim() || !enhancedResumeId) return;
    setAiLoading(true);
    try {
      const result = await enhancerApi.refine(enhancedResumeId, aiPrompt.trim());
      onAiUpdate(result);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'AI refinement failed.');
    } finally {
      setAiLoading(false);
    }
  }

  const renderEditor = () => {
    switch (sectionKey) {
      case 'summary':
        return (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Professional Summary</label>
            <textarea
              value={editSections.summary || ''}
              onChange={(e) => setEditSections({ ...editSections, summary: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none h-32"
            />
          </div>
        );

      case 'experience': {
        const expList = editSections.experience || [];
        const exp = sectionIndex !== undefined ? expList[sectionIndex] : null;
        if (!exp) return <p className="text-sm text-gray-500">Select an experience entry to edit.</p>;
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                <input
                  value={exp.title}
                  onChange={(e) => {
                    const updated = [...expList];
                    updated[sectionIndex!] = { ...exp, title: e.target.value };
                    setEditSections({ ...editSections, experience: updated });
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company</label>
                <input
                  value={exp.company}
                  onChange={(e) => {
                    const updated = [...expList];
                    updated[sectionIndex!] = { ...exp, company: e.target.value };
                    setEditSections({ ...editSections, experience: updated });
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration</label>
              <input
                value={exp.duration}
                onChange={(e) => {
                  const updated = [...expList];
                  updated[sectionIndex!] = { ...exp, duration: e.target.value };
                  setEditSections({ ...editSections, experience: updated });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bullet Points</label>
              {exp.bullets.map((bullet, bi) => (
                <div key={bi} className="flex gap-2 mb-2">
                  <input
                    value={bullet}
                    onChange={(e) => {
                      const updated = [...expList];
                      const bullets = [...exp.bullets];
                      bullets[bi] = e.target.value;
                      updated[sectionIndex!] = { ...exp, bullets };
                      setEditSections({ ...editSections, experience: updated });
                    }}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <button
                    onClick={() => {
                      const updated = [...expList];
                      const bullets = exp.bullets.filter((_, j) => j !== bi);
                      updated[sectionIndex!] = { ...exp, bullets };
                      setEditSections({ ...editSections, experience: updated });
                    }}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const updated = [...expList];
                  updated[sectionIndex!] = { ...exp, bullets: [...exp.bullets, ''] };
                  setEditSections({ ...editSections, experience: updated });
                }}
                className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 mt-1"
              >
                <Plus size={12} /> Add Bullet
              </button>
            </div>
          </div>
        );
      }

      case 'skills':
        return (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Skills (comma-separated)</label>
            <textarea
              value={(editSections.skills || []).join(', ')}
              onChange={(e) => setEditSections({ ...editSections, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none h-24"
            />
          </div>
        );

      case 'education': {
        const eduList = editSections.education || [];
        const edu = sectionIndex !== undefined ? eduList[sectionIndex] : null;
        if (!edu) return <p className="text-sm text-gray-500">Select an education entry to edit.</p>;
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Degree</label>
                <input
                  value={edu.degree}
                  onChange={(e) => {
                    const updated = [...eduList];
                    updated[sectionIndex!] = { ...edu, degree: e.target.value };
                    setEditSections({ ...editSections, education: updated });
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
                <input
                  value={edu.year}
                  onChange={(e) => {
                    const updated = [...eduList];
                    updated[sectionIndex!] = { ...edu, year: e.target.value };
                    setEditSections({ ...editSections, education: updated });
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Institution</label>
              <input
                value={edu.institution}
                onChange={(e) => {
                  const updated = [...eduList];
                  updated[sectionIndex!] = { ...edu, institution: e.target.value };
                  setEditSections({ ...editSections, education: updated });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
        );
      }

      default:
        return (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{sectionKey}</label>
            <textarea
              value={Array.isArray((editSections as Record<string, unknown>)[sectionKey])
                ? ((editSections as Record<string, unknown>)[sectionKey] as string[]).join('\n')
                : String((editSections as Record<string, unknown>)[sectionKey] || '')}
              onChange={(e) => {
                const value = sectionKey === 'certifications' || sectionKey === 'other'
                  ? e.target.value.split('\n').filter(Boolean)
                  : e.target.value;
                setEditSections({ ...editSections, [sectionKey]: value } as unknown as ResumeSections);
              }}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none h-32"
            />
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-orange-200 rounded-2xl shadow-lg overflow-hidden"
    >
      {/* Tab Bar: Manual vs AI */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('manual')}
          className={`flex-1 py-3.5 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
            tab === 'manual'
              ? 'text-gray-900 border-b border-gray-200 bg-white'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-b border-gray-200'
          }`}
        >
          <Edit3 size={14} /> Manual Edit
        </button>
        <button
          onClick={() => setTab('ai')}
          className={`flex-1 py-3.5 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
            tab === 'ai'
              ? 'text-orange-500 bg-orange-50 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-b border-gray-200'
          }`}
        >
          <Wand2 size={14} /> AI Edit
        </button>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-extrabold text-[#111827] flex items-center gap-2.5">
            {tab === 'manual' ? <Edit3 size={18} className="text-gray-400" /> : <Wand2 size={18} className="text-orange-500" />}
            {tab === 'manual' ? 'Edit' : 'AI Optimize'}: <span className="capitalize">{sectionKey}</span>{sectionIndex !== undefined ? ` #${sectionIndex + 1}` : ''}
          </h3>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {tab === 'manual' ? (
          <>
            {renderEditor()}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onSave(editSections)}
                className="flex-1 bg-[#0A0A0A] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={14} /> Save Changes
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-orange-50/50 border border-orange-200 rounded-[14px] p-5 mb-4">
              <p className="text-[13px] text-orange-600 mb-4 font-medium">
                Describe how you want AI to modify <span className="font-extrabold capitalize">{sectionKey}</span>. Be specific for best results.
              </p>
              <div className="flex gap-2 mb-4">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={`e.g., "Make the bullet points more impactful with quantified results" or "Add relevant keywords for a data science role"`}
                  className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-gray-700 placeholder:text-gray-400 resize-none min-h-[90px] shadow-sm leading-relaxed"
                />
              </div>
              <div className="flex gap-3 mt-1">
                <button
                  onClick={handleAiOptimize}
                  disabled={aiLoading || !aiPrompt.trim() || !enhancedResumeId}
                  className="flex-1 bg-orange-500 text-white py-3.5 rounded-xl text-[14px] font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  Optimize This Section
                </button>
                <button
                  onClick={handleAiRefine}
                  disabled={aiLoading || !aiPrompt.trim() || !enhancedResumeId}
                  className="flex-1 bg-white border border-gray-200 text-orange-600 py-3.5 rounded-xl text-[14px] font-semibold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Refine Entire Resume
                </button>
              </div>
            </div>
            {!enhancedResumeId && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle size={14} />
                Run an enhancement first before using AI section editing.
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Editor Component ──────────────────────────────────────────────────

export function Editor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const preselectedResumeId = searchParams.get('resume') || '';

  // Resource lists
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [jobs, setJobs] = useState<JdRecord[]>([]);
  const [resumeId, setResumeId] = useState(preselectedResumeId);
  const [jdId, setJdId] = useState('');

  // Resume data
  const [originalResume, setOriginalResume] = useState<ResumeDetail | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Results
  const [scoreResult, setScoreResult] = useState<UniScoreResult | null>(null);
  const [enhanceResult, setEnhanceResult] = useState<EnhancedResumeResult | null>(null);

  // Loading states
  const [loadingResume, setLoadingResume] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Editing
  const [editingSection, setEditingSection] = useState<{ key: string; index?: number } | null>(null);

  // Load resources from both localStorage AND API
  useEffect(() => {
    async function loadResources() {
      // Load from localStorage first for instant display
      let r = resumeStore.list();
      const j = jdStore.list();
      setJobs(j);

      // Also fetch from API to get latest data
      try {
        const [resRes, jdRes] = await Promise.all([
          resumeApi.list(),
          jdApi.list()
        ]);
        
        // Merge resumes with local data
        r = resRes.resumes.map(ar => {
          const local = r.find(lr => lr.id === ar.id);
          return {
            id: ar.id,
            original_filename: ar.original_filename,
            created_at: ar.created_at,
            ats_score: local?.ats_score,
          };
        });
        
        // Sync JDs
        const validJds = jdRes.jds || [];
        jdStore.setAll(validJds);
        setJobs(validJds);
        
        if (validJds.length > 0 && !j.length) setJdId(validJds[0].id);
      } catch {
        // Offline / API error — use localStorage only
      }

      setResumes(r);
      if (!preselectedResumeId && r.length > 0) setResumeId(r[0].id);
      if (j.length > 0 && !jdId) setJdId(j[0].id);
    }
    loadResources();
  }, []);

  // Load original resume when selection changes
  useEffect(() => {
    if (!resumeId) {
      setOriginalResume(null);
      setPdfUrl(null);
      return;
    }
    setLoadingResume(true);
    setError(null);
    setPdfUrl(null); // Clear previous URL while loading

    resumeApi.get(resumeId)
      .then((data) => {
        // Backend returns the resume directly (not wrapped in { resume: ... })
        const resume = ('resume' in data ? data.resume : data) as unknown as ResumeDetail;
        setOriginalResume(resume);
        if (resume.file_url) {
          setPdfUrl(resume.file_url);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load resume.'))
      .finally(() => setLoadingResume(false));
  }, [resumeId]);

  async function handleRun() {
    if (!resumeId || !jdId) {
      setError('Please select both a resume and a job description.');
      return;
    }
    setError(null);
    setEnhancing(true);
    setSavedMsg(null);
    try {
      // Step 1: Analyze
      const score = await analysisApi.uniscore(resumeId, jdId);
      setScoreResult(score);

      // Step 2: Enhance
      const result = await enhancerApi.enhance(resumeId, jdId, score.analysis_id);
      setEnhanceResult(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Enhancement failed.');
    } finally {
      setEnhancing(false);
    }
  }

  async function handleSaveVersion() {
    if (!enhanceResult) return;
    setSaving(true);
    setError(null);
    try {
      const result = await enhancerApi.manualEdit(enhanceResult.id, enhanceResult.enhanced_sections);
      setEnhanceResult(result);
      setSavedMsg(`Version ${result.version} saved successfully!`);
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  function handleSectionEdit(sectionKey: string, index?: number) {
    if (!enhanceResult) return;
    setEditingSection({ key: sectionKey, index });
  }

  async function handleSaveEdit(updatedSections: ResumeSections) {
    if (!enhanceResult) return;
    setSaving(true);
    setError(null);
    try {
      const result = await enhancerApi.manualEdit(enhanceResult.id, updatedSections);
      setEnhanceResult(result);
      setEditingSection(null);
      setSavedMsg('Changes saved as new version!');
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  function handleAiUpdate(result: EnhancedResumeResult) {
    setEnhanceResult(result);
    setEditingSection(null);
    setSavedMsg(`AI updated — Version ${result.version} created!`);
    setTimeout(() => setSavedMsg(null), 3000);
  }



  function handleExportPdf() {
    if (!enhanceResult?.enhanced_sections) {
      setError('Nothing to export yet. Enhance a resume first.');
      return;
    }
    setExportModalOpen(true);
  }

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA] overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors border border-gray-200"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <Link to="/dashboard" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-semibold text-gray-900">Resume Enhancer</h1>
        </div>

        <div className="flex items-center gap-2">
          {enhanceResult && (
            <>
              <button
                onClick={handleSaveVersion}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save Version
              </button>
              <button
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#0A0A0A] rounded-lg hover:bg-black/80 transition-colors"
              >
                <Download size={13} /> Export PDF
              </button>
            </>
          )}
        </div>
      </header>

      {/* Selector Bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-500">Resume:</span>
        <div className="relative">
          <select
            value={resumeId}
            onChange={(e) => {
              setResumeId(e.target.value);
              setEnhanceResult(null);
              setScoreResult(null);
            }}
            className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer"
          >
            {resumes.length === 0 && <option value="">No resumes</option>}
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.original_filename}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <span className="text-gray-300">+</span>

        <span className="text-xs font-medium text-gray-500">Job Description:</span>
        <div className="relative">
          <select
            value={jdId}
            onChange={(e) => {
              setJdId(e.target.value);
              setEnhanceResult(null);
              setScoreResult(null);
            }}
            className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer"
          >
            {jobs.length === 0 && <option value="">No jobs — save one first</option>}
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={handleRun}
          disabled={enhancing || !resumeId || !jdId}
          className="ml-auto inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-black/80 transition-colors shadow-md disabled:opacity-50"
        >
          {enhancing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {enhancing ? 'Enhancing…' : 'Run Enhancement'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400">✕</button>
        </div>
      )}
      {savedMsg && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs">
          <CheckCircle2 size={14} /> {savedMsg}
        </div>
      )}

      {/* Main Split View */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* LEFT: Original Resume */}
        <div className="flex-1 lg:flex-[1_1_50%] border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-100/50 lg:overflow-y-auto relative flex flex-col min-h-[500px] lg:min-h-0">
          <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
          <div className={`p-4 sm:p-6 relative z-10 flex flex-col ${pdfUrl ? 'h-full w-full' : 'min-h-full items-start'}`}>
            {loadingResume ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-gray-500 w-full mt-20">
                <Loader2 size={24} className="animate-spin" />
                <p className="text-sm">Loading resume…</p>
              </div>
            ) : originalResume ? (
              <div className={`w-full flex flex-col pt-2 ${!pdfUrl ? 'max-w-[800px] mx-auto' : 'h-full'}`}>
                <div className="mb-3 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Original Resume</span>
                  {pdfUrl && <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest bg-green-100 px-2 py-0.5 rounded shadow-sm border border-green-300">Exact Uploaded File</span>}
                </div>
                {pdfUrl ? (
                  <div className="flex-1 w-full bg-white border border-gray-200 shadow-xl overflow-hidden rounded-md flex flex-col min-h-[500px]">
                    <iframe src={`${pdfUrl}#toolbar=0&navpanes=0`} className="flex-1 w-full h-full border-none m-0 p-0" title="Original Resume PDF" />
                  </div>
                ) : (
                  <ResumePreview
                    sections={originalResume.sections}
                    title="Original Resume"
                    subtitle={originalResume.original_filename}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Resume</h3>
                <p className="text-gray-500 text-sm max-w-xs">Choose a resume from the dropdown above to preview it here.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Enhanced Resume */}
        <div className="flex-1 lg:flex-[1_1_50%] bg-white lg:overflow-y-auto relative min-h-[500px] lg:min-h-0">
          <div className="p-4 sm:p-6 flex justify-center min-h-full items-start">
            {enhancing ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                  <Sparkles size={28} className="animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">AI is enhancing your resume…</h3>
                <p className="text-gray-500 text-sm max-w-sm">Analyzing job requirements and optimizing your resume sections for better ATS compatibility.</p>
                <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '5%' }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 8, ease: 'easeInOut' }}
                    className="h-full bg-orange-400 rounded-full"
                  />
                </div>
              </div>
            ) : enhanceResult ? (
              <div className="w-full max-w-[700px]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Enhanced by AI</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">Version {enhanceResult.version}</span>
                    {enhanceResult.diff && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                        {enhanceResult.diff.filter(d => d.change_type !== 'unchanged').length} changes
                      </span>
                    )}
                  </div>
                </div>

                {editingSection ? (
                  <SectionEditor
                    sections={enhanceResult.enhanced_sections}
                    sectionKey={editingSection.key}
                    sectionIndex={editingSection.index}
                    enhancedResumeId={enhanceResult.id}
                    onSave={handleSaveEdit}
                    onAiUpdate={handleAiUpdate}
                    onCancel={() => setEditingSection(null)}
                  />
                ) : (
                  <ResumePreview
                    sections={enhanceResult.enhanced_sections}
                    title="Enhanced Resume"
                    subtitle={`Version ${enhanceResult.version} • Click any section to edit`}
                    onEditSection={handleSectionEdit}
                    editable
                  />
                )}

                {/* Diff Summary */}
                {enhanceResult.diff && enhanceResult.diff.filter(d => d.change_type !== 'unchanged').length > 0 && !editingSection && (
                  <div className="mt-6 bg-gray-50 rounded-2xl border border-gray-200 p-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Changes Made</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {enhanceResult.diff.filter(d => d.change_type !== 'unchanged').map((diff, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden bg-white text-xs">
                          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-500 uppercase tracking-wider">{diff.section}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              diff.change_type === 'added' ? 'bg-green-100 text-green-700' :
                              diff.change_type === 'removed' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>{diff.change_type}</span>
                          </div>
                          {diff.original && (
                            <div className="px-3 py-1.5 bg-red-50/30 text-gray-500 line-through text-[11px]">
                              {diff.original.slice(0, 100)}{diff.original.length > 100 ? '…' : ''}
                            </div>
                          )}
                          {diff.enhanced && (
                            <div className="px-3 py-1.5 bg-green-50/30 text-gray-800 font-medium text-[11px]">
                              {diff.enhanced.slice(0, 100)}{diff.enhanced.length > 100 ? '…' : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score Card */}
                {scoreResult && !editingSection && (
                  <div className="mt-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-orange-300 uppercase tracking-wider">ATS Match Score</span>
                      <span className="text-2xl font-bold">{scoreResult.uniscore}<span className="text-sm text-white/40">/100</span></span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${scoreResult.uniscore}%` }}
                        transition={{ duration: 1 }}
                        className={`h-full rounded-full ${scoreResult.uniscore >= 80 ? 'bg-green-400' : scoreResult.uniscore >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center mb-4">
                  <Sparkles size={28} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Enhance</h3>
                <p className="text-gray-500 text-sm max-w-sm mb-6">
                  Select a resume and a job description above, then click <strong>Run Enhancement</strong> to generate an AI-optimized version.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">1</div>
                  <span>Select Resume</span>
                  <span className="text-gray-300">→</span>
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">2</div>
                  <span>Select JD</span>
                  <span className="text-gray-300">→</span>
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">3</div>
                  <span className="text-orange-500 font-medium">Run</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <ExportModal 
        isOpen={exportModalOpen} 
        onClose={() => setExportModalOpen(false)} 
        type="resume" 
        content={enhanceResult?.enhanced_sections!} 
        metadata={{ userName: originalResume?.candidate_name || originalResume?.original_filename?.replace(/\.[^/.]+$/, "") || 'Your Name' }} 
      />
    </div>
  );
}
