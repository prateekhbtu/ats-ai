import { useState, useEffect, useRef } from 'react';
import { X, Download, Layout, Expand, CheckCircle2, FileText } from 'lucide-react';
import type { ResumeSections } from '../lib/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'resume' | 'cover-letter';
  content: ResumeSections | string;
  metadata?: {
    userName?: string;
    jobTitle?: string;
    company?: string;
  };
}

const TEMPLATES = [
  { id: 'professional', name: 'Professional', desc: 'Classic, clean, ATS-optimized layout with serif accents.' },
  { id: 'technical', name: 'Technical', desc: 'Compact monospace styling, perfect for engineers.' },
  { id: 'assertive', name: 'Assertive', desc: 'Bold headers and high-contrast lines for impact.' },
  { id: 'modern', name: 'Modern', desc: 'Sleek sans-serif with orange accent highlights.' },
  { id: 'elegant', name: 'Elegant', desc: 'Minimalist whitespace, refined typography.' },
];

export function ExportModal({ isOpen, onClose, type, content, metadata }: ExportModalProps) {
  const [template, setTemplate] = useState(TEMPLATES[0].id);
  const [htmlDoc, setHtmlDoc] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setHtmlDoc(generateHtml(template));
  }, [isOpen, template, content, metadata]);

  if (!isOpen) return null;

  function escapeHtml(str: string): string {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getCssForTemplate(tmpl: string) {
    const base = `
      body { margin: 0; padding: 40px; color: #1f2937; line-height: 1.5; font-size: 14px; }
      * { box-sizing: border-box; }
      h1, h2, h3, h4 { margin: 0 0 10px; color: #111827; }
      p { margin: 0 0 10px; }
      ul { margin: 0 0 15px; padding-left: 20px; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
      .header h1 { font-size: 28px; text-transform: uppercase; letter-spacing: 2px; }
      .section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; color: #4b5563; }
      .item { margin-bottom: 15px; }
      .row { display: flex; justify-content: space-between; align-items: baseline; }
      .row h3 { font-size: 15px; font-weight: bold; }
      .row span { font-size: 13px; color: #6b7280; font-weight: 500; }
      .muted { color: #4b5563; font-weight: 600; font-size: 14px; margin-bottom: 5px; }
      li { font-size: 13px; margin-bottom: 4px; color: #374151; }
      .skills-container { font-size: 13px; line-height: 1.6; }
      .cl-body { font-size: 14px; white-space: pre-wrap; line-height: 1.7; }
      .cl-header { margin-bottom: 40px; }
      .cl-date { margin-bottom: 20px; color: #6b7280; }
    `;

    if (tmpl === 'technical') {
      return base + `
        body { font-family: 'Courier New', Courier, monospace; padding: 30px; }
        .header { text-align: left; border-bottom: 2px solid #374151; }
        .header h1 { font-size: 24px; font-weight: bold; letter-spacing: 0; }
        .section-title { border-bottom: 1px dashed #9ca3af; color: #111827; font-weight: bold; }
      `;
    }
    if (tmpl === 'assertive') {
      return base + `
        body { font-family: 'Inter', system-ui, sans-serif; }
        .header { border-bottom: 4px solid #111827; }
        .header h1 { font-weight: 900; letter-spacing: -1px; }
        .section-title { background: #111827; color: #fff; padding: 4px 10px; display: inline-block; margin-bottom: 15px; }
        .row h3 { font-size: 16px; font-weight: 800; }
      `;
    }
    if (tmpl === 'professional') {
      return base + `
        body { font-family: 'Georgia', serif; line-height: 1.6; }
        .header { text-align: center; border-bottom: 1px solid #111827; padding-bottom: 15px; margin-bottom: 25px; }
        .header h1 { font-family: 'Georgia', serif; letter-spacing: 3px; font-weight: normal; margin-bottom: 5px; }
        .section-title { font-family: 'Georgia', serif; font-weight: bold; color: #000; text-align: center; border-bottom: none; }
        .section-title::after { content: ''; display: block; width: 40px; height: 1px; background: #000; margin: 5px auto 0; }
        .row { display: block; }
        .row span { float: right; font-style: italic; }
        .muted { display: inline-block; font-style: italic; margin-bottom: 10px; }
      `;
    }
    // modern
    if (tmpl === 'modern') {
      return base + `
        body { font-family: 'Inter', system-ui, sans-serif; }
        .section-title { color: #ea580c; border-bottom: 2px solid #fed7aa; }
        .header h1 { color: #111827; font-weight: 800; }
        .header { border-bottom: 3px solid #ea580c; }
      `;
    }
    // elegant
    return base + `
      body { font-family: 'Georgia', serif; background: #fff; color: #1a1a1a; }
      .header { text-align: left; border-bottom: none; border-left: 4px solid #ea580c; padding-left: 16px; margin-bottom: 30px; }
      .header h1 { font-size: 26px; font-weight: normal; letter-spacing: 0; color: #1a1a1a; }
      .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #ea580c; border-bottom: none; margin-bottom: 12px; }
      li { font-size: 13.5px; margin-bottom: 5px; }
    `;
  }

  function generateHtml(tmpl: string) {
    let internalHtml = '';

    if (type === 'resume') {
      const sections = content as ResumeSections;
      const nm = metadata?.userName || 'User Name';
      const li = (items: string[]) => items.map(i => `<li>${escapeHtml(i)}</li>`).join('');

      const expHtml = (sections.experience || []).map((e) => `
        <div class="item">
          <div class="row"><h3>${escapeHtml(e.title || '')}</h3><span>${escapeHtml(e.duration || '')}</span></div>
          <p class="muted">${escapeHtml(e.company || '')}</p>
          <ul>${li(e.bullets || [])}</ul>
        </div>
      `).join('');

      const eduHtml = (sections.education || []).map((e) => `
        <div class="item">
          <div class="row"><h3>${escapeHtml(e.degree || '')}</h3><span>${escapeHtml(e.year || '')}</span></div>
          <p class="muted">${escapeHtml(e.institution || '')}</p>
        </div>
      `).join('');

      internalHtml = `
        <div class="header">
          <h1>${escapeHtml(nm)}</h1>
        </div>
        ${sections.summary ? `<h2 class="section-title">Professional Summary</h2><p style="font-size:13px; margin-bottom:20px;">${escapeHtml(sections.summary)}</p>` : ''}
        ${expHtml ? `<h2 class="section-title">Experience</h2>${expHtml}` : ''}
        ${eduHtml ? `<h2 class="section-title">Education</h2>${eduHtml}` : ''}
        ${sections.skills && sections.skills.length > 0 ? `<h2 class="section-title">Skills</h2><div class="skills-container" style="margin-bottom:20px;">${escapeHtml(sections.skills.join(' • '))}</div>` : ''}
      `;
    } else {
      const cl = content as string;
      // Split into paragraphs properly for a readable letter
      const paragraphs = cl.split(/\n\n+/).filter(p => p.trim());
      const clParagraphsHtml = paragraphs.map(p =>
        `<p style="margin:0 0 14px; font-size:13.5px; line-height:1.7;">${escapeHtml(p.replace(/\n/g, ' ').trim())}</p>`
      ).join('');
      internalHtml = `
        <div class="cl-header">
          <h1 style="font-size:24px; font-weight:bold; margin-bottom:4px;">${escapeHtml(metadata?.userName || 'Applicant')}</h1>
          ${metadata?.jobTitle ? `<div style="color:#6b7280; font-size:13px;">Application for ${escapeHtml(metadata.jobTitle)}${metadata.company ? ` at ${escapeHtml(metadata.company)}` : ''}</div>` : ''}
        </div>
        <div class="cl-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div class="cl-body">${clParagraphsHtml}</div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Export</title>
          <style>${getCssForTemplate(tmpl)}</style>
        </head>
        <body>
          ${internalHtml}
        </body>
      </html>
    `;
  }

  function handlePrint() {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[90vh] bg-gray-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-200">
        
        {/* Sidebar Controls */}
        <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col pt-6 pb-6 shadow-sm z-10">
          <div className="px-6 flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Download className="text-orange-600" size={20} /> Export {type === 'resume' ? 'Resume' : 'Cover Letter'}
            </h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors md:hidden">
              <X size={16} />
            </button>
          </div>

          <div className="px-6 mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Layout size={13} /> Select Template</h3>
            <div className="space-y-2.5">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 ${
                    template === t.id 
                      ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-500/10' 
                      : 'border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/30 text-gray-700'
                  }`}
                >
                  <div className={`mt-0.5 shrink-0 ${template === t.id ? 'text-orange-500' : 'text-gray-300'}`}>
                    <CheckCircle2 size={16} className={template === t.id ? 'fill-orange-500 text-white' : ''} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${template === t.id ? 'text-orange-900' : 'text-gray-900'}`}>{t.name}</h4>
                    <p className={`text-[11px] mt-0.5 leading-snug ${template === t.id ? 'text-orange-800/80' : 'text-gray-400'}`}>{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto px-6 pt-6 border-t border-gray-100">
            <button
              onClick={handlePrint}
              className="w-full bg-[#0A0A0A] text-white py-3.5 rounded-xl text-[14px] font-semibold hover:bg-black/80 transition-shadow shadow-[0_4px_14px_0_rgba(0,0,0,0.25)] flex items-center justify-center gap-2"
            >
              <FileText size={16} /> Export as PDF
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-3 font-medium tracking-wide">
              Print dialog will open. Select "Save as PDF".
            </p>
          </div>
        </div>

        {/* Live Preview Pane */}
        <div className="flex-1 bg-gray-100/50 p-4 sm:p-6 flex flex-col h-full overflow-hidden relative">
          <div className="absolute top-4 right-4 z-20 hidden md:block">
            <button onClick={onClose} className="p-2 bg-white/80 backdrop-blur border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm rounded-xl transition-all hover:scale-105">
              <X size={18} />
            </button>
          </div>
          <div className="mb-3 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Expand size={16} className="text-gray-400" /> Live PDF Preview
            </h3>
            <span className="bg-white border border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm">
              Letter • A4
            </span>
          </div>
          <div className="flex-1 w-full overflow-y-auto rounded-lg">
            <div className="w-full max-w-[850px] mx-auto bg-white shadow-2xl shadow-gray-200/50 border border-gray-200 min-h-[700px] h-fit">
              <iframe
                ref={iframeRef}
                srcDoc={htmlDoc}
                className="w-full border-none"
                style={{ minHeight: '900px', height: '100%' }}
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
