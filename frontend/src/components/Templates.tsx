import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, LayoutGrid, LayoutTemplate, Briefcase, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';

const templates = [
  { id: 'minimal', title: 'Minimal Clean Design', icon: Layout },
  { id: 'modern', title: 'Modern Professional Layout', icon: LayoutGrid, desc: 'Clean, contemporary layouts designed to highlight experience, skills, and impact for modern roles.' },
  { id: 'creative', title: 'Creative Visual Style', icon: LayoutTemplate },
  { id: 'ats', title: 'ATS Friendly Format', icon: Layout },
  { id: 'corporate', title: 'Professional Corporate Resume', icon: Briefcase },
];

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
          <div className="relative h-[600px] bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden flex items-center justify-center p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full bg-gray-50 border border-gray-100 shadow-sm rounded-xl p-8 flex flex-col gap-6"
              >
                {/* Abstract Resume Preview */}
                <div className="text-center border-b border-gray-200 pb-6">
                  <h4 className="text-3xl font-light tracking-widest uppercase mb-2">Kelly Kennedy</h4>
                  <div className="w-32 h-1 bg-orange-500 mx-auto" />
                </div>
                
                <div className="flex flex-col gap-4 flex-1">
                  <div className="w-full h-4 bg-gray-200 rounded" />
                  <div className="w-5/6 h-4 bg-gray-200 rounded" />
                  <div className="w-4/6 h-4 bg-gray-200 rounded" />
                  
                  <div className="mt-8 w-1/3 h-6 bg-gray-300 rounded mb-2" />
                  <div className="w-full h-3 bg-gray-200 rounded" />
                  <div className="w-full h-3 bg-gray-200 rounded" />
                  <div className="w-3/4 h-3 bg-gray-200 rounded" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
