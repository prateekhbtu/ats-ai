import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, LayoutGrid, LayoutTemplate, Briefcase, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';

const templates = [
  { id: 'minimal', title: 'Minimal Clean Design', icon: Layout, desc: 'Whitespace-first, sans-serif, zero-distraction layout for engineering and design roles.' },
  { id: 'modern', title: 'Modern Professional Layout', icon: LayoutGrid, desc: 'Clean, contemporary layouts designed to highlight experience, skills, and impact for modern roles.' },
  { id: 'creative', title: 'Creative Visual Style', icon: LayoutTemplate, desc: 'Bold color accents and two-column layout for designers, marketers, and creative leaders.' },
  { id: 'ats', title: 'ATS Friendly Format', icon: Layout, desc: 'Stripped-down, single-column format proven to rank highest in applicant tracking systems.' },
  { id: 'corporate', title: 'Professional Corporate Resume', icon: Briefcase, desc: 'Serif headings and conservative typography for finance, consulting, and executive roles.' },
];

function TemplatePreview({ id }: { id: string }) {
  const Line = ({ w = 'w-full', c = 'bg-gray-200', h = 'h-1.5' }: { w?: string; c?: string; h?: string }) => (
    <div className={`${w} ${h} ${c} rounded`} />
  );

  if (id === 'minimal') {
    return (
      <div className="w-full h-full bg-white border border-gray-100 shadow-sm rounded-md p-8 flex flex-col gap-5 font-sans">
        <div>
          <h4 className="text-2xl font-light tracking-tight text-gray-900">Kelly Kennedy</h4>
          <p className="text-xs text-gray-400 mt-1 tracking-wider uppercase">Product Designer · San Francisco</p>
        </div>
        <div className="w-8 h-0.5 bg-gray-900" />
        <div className="space-y-2">
          <Line w="w-full" />
          <Line w="w-5/6" />
          <Line w="w-4/6" />
        </div>
        <div className="mt-2">
          <p className="text-[10px] font-semibold text-gray-900 tracking-widest uppercase mb-3">Experience</p>
          <div className="space-y-2">
            <Line w="w-1/2" c="bg-gray-700" h="h-2" />
            <Line w="w-2/5" c="bg-gray-300" />
            <Line w="w-full" />
            <Line w="w-11/12" />
          </div>
        </div>
        <div className="mt-1">
          <p className="text-[10px] font-semibold text-gray-900 tracking-widest uppercase mb-3">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {[...Array(5)].map((_, i) => <div key={i} className="h-4 w-14 bg-gray-100 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (id === 'modern') {
    return (
      <div className="w-full h-full bg-white border border-gray-100 shadow-sm rounded-md overflow-hidden flex flex-col font-sans">
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-6 text-white">
          <h4 className="text-2xl font-bold tracking-tight">Kelly Kennedy</h4>
          <p className="text-xs mt-1 opacity-90">Senior Software Engineer</p>
        </div>
        <div className="p-6 flex flex-col gap-5 flex-1">
          <div className="space-y-2">
            <Line w="w-full" />
            <Line w="w-5/6" />
            <Line w="w-2/3" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-orange-500 rounded" />
              <p className="text-[11px] font-bold text-gray-900 tracking-wider uppercase">Experience</p>
            </div>
            <div className="space-y-2 ml-3">
              <Line w="w-1/2" c="bg-gray-800" h="h-2" />
              <Line w="w-2/5" c="bg-orange-300" />
              <Line w="w-full" />
              <Line w="w-5/6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-orange-500 rounded" />
              <p className="text-[11px] font-bold text-gray-900 tracking-wider uppercase">Skills</p>
            </div>
            <div className="flex flex-wrap gap-1.5 ml-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-5 w-16 bg-orange-50 border border-orange-200 rounded-full" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id === 'creative') {
    return (
      <div className="w-full h-full bg-white border border-gray-100 shadow-sm rounded-md overflow-hidden flex font-sans">
        <div className="w-1/3 bg-gradient-to-b from-indigo-600 to-purple-600 p-5 text-white flex flex-col gap-5">
          <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 mx-auto" />
          <div className="text-center">
            <p className="text-sm font-bold">Kelly K.</p>
            <p className="text-[9px] opacity-80 mt-1">Creative Director</p>
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-wider uppercase opacity-80 mb-2">Contact</p>
            <div className="space-y-1.5">
              <div className="h-1 bg-white/30 rounded" />
              <div className="h-1 w-3/4 bg-white/30 rounded" />
              <div className="h-1 w-5/6 bg-white/30 rounded" />
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-wider uppercase opacity-80 mb-2">Skills</p>
            <div className="space-y-2">
              {[90, 75, 85].map((v, i) => (
                <div key={i}>
                  <div className="h-0.5 w-10 bg-white/40 rounded mb-1" />
                  <div className="h-1 bg-white/20 rounded overflow-hidden">
                    <div className="h-full bg-white rounded" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 p-5 flex flex-col gap-4">
          <div>
            <h4 className="text-xl font-bold text-gray-900">Kelly Kennedy</h4>
            <div className="flex gap-1 mt-1">
              <div className="h-0.5 w-6 bg-indigo-600" />
              <div className="h-0.5 w-4 bg-purple-500" />
              <div className="h-0.5 w-3 bg-pink-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Line />
            <Line w="w-5/6" />
            <Line w="w-4/6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Experience</p>
            <div className="space-y-1.5">
              <Line w="w-2/3" c="bg-gray-800" h="h-1.5" />
              <Line w="w-2/5" c="bg-purple-300" h="h-1" />
              <Line />
              <Line w="w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id === 'ats') {
    return (
      <div className="w-full h-full bg-white border border-gray-100 shadow-sm rounded-md p-8 flex flex-col gap-4 font-mono">
        <div className="text-center border-b-2 border-gray-800 pb-3">
          <h4 className="text-xl font-bold text-gray-900 uppercase tracking-wide">Kelly Kennedy</h4>
          <p className="text-[10px] text-gray-700 mt-1">kelly@email.com · +1 (555) 000-0000 · linkedin.com/in/kelly</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-400 pb-0.5 mb-2">Professional Summary</p>
          <div className="space-y-1.5 font-sans">
            <Line />
            <Line w="w-11/12" />
            <Line w="w-5/6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-400 pb-0.5 mb-2">Experience</p>
          <div className="space-y-1.5 font-sans">
            <Line w="w-2/3" c="bg-gray-800" h="h-2" />
            <Line w="w-1/2" c="bg-gray-400" />
            <Line />
            <Line w="w-5/6" />
            <Line w="w-4/6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-400 pb-0.5 mb-2">Skills</p>
          <div className="space-y-1 font-sans">
            <Line />
            <Line w="w-5/6" />
          </div>
        </div>
        <div className="mt-auto text-center">
          <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded border border-green-300">✓ ATS-OPTIMIZED</span>
        </div>
      </div>
    );
  }

  if (id === 'corporate') {
    return (
      <div className="w-full h-full bg-white border border-gray-100 shadow-sm rounded-md p-8 flex flex-col gap-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="text-center border-b-[3px] border-[#1a3a6c] pb-4">
          <h4 className="text-2xl font-bold text-[#1a3a6c] tracking-wide">KELLY KENNEDY</h4>
          <p className="text-[10px] text-gray-600 mt-1 italic">Senior Financial Analyst · CFA, MBA</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#1a3a6c] tracking-widest uppercase mb-2">Executive Summary</p>
          <div className="space-y-1.5">
            <Line />
            <Line w="w-5/6" />
            <Line w="w-4/6" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#1a3a6c] tracking-widest uppercase mb-2">Professional Experience</p>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <Line w="w-1/2" c="bg-gray-800" h="h-2" />
              <Line w="w-1/5" c="bg-gray-400" h="h-1" />
            </div>
            <Line w="w-2/5" c="bg-gray-500" />
            <Line />
            <Line w="w-5/6" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-[#1a3a6c] tracking-widest uppercase mb-1.5">Education</p>
            <Line w="w-4/5" c="bg-gray-700" />
            <div className="h-1" />
            <Line w="w-3/5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#1a3a6c] tracking-widest uppercase mb-1.5">Credentials</p>
            <Line />
            <div className="h-1" />
            <Line w="w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function Templates() {
  const [active, setActive] = useState('modern');

  return (
    <section className="py-32 bg-[#FAFAFA]" id="templates">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold uppercase tracking-wider mb-6"
          >
            Resume Templates
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
          >
            Professional templates<br/>for every career
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-500"
          >
            Choose expertly designed resume templates tailored for ATS compatibility and modern hiring standards.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: Accordion List */}
          <div className="flex flex-col gap-4">
            {templates.map((tpl) => (
              <motion.div 
                key={tpl.id}
                onClick={() => setActive(tpl.id)}
                className={cn(
                  "p-6 rounded-2xl cursor-pointer transition-all border",
                  active === tpl.id 
                    ? "bg-white border-gray-200 shadow-sm" 
                    : "bg-transparent border-transparent hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    active === tpl.id ? "bg-orange-500/10 text-orange-500" : "bg-gray-100 text-gray-500"
                  )}>
                    <tpl.icon size={20} />
                  </div>
                  <h3 className={cn(
                    "text-xl font-medium",
                    active === tpl.id ? "text-gray-900" : "text-gray-500"
                  )}>
                    {tpl.title}
                  </h3>
                </div>
                
                <AnimatePresence>
                  {active === tpl.id && tpl.desc && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-gray-500 mt-4 ml-14 leading-relaxed">
                        {tpl.desc}
                      </p>
                      <button className="mt-4 ml-14 flex items-center gap-2 text-sm font-semibold border-b border-black pb-1 hover:text-gray-600 hover:border-gray-600 transition-colors">
                        Use Template <ArrowUpRight size={16} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Right: Visual Preview */}
          <div className="relative h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200 shadow-xl overflow-hidden flex items-center justify-center p-8 lg:sticky lg:top-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <TemplatePreview id={active} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
