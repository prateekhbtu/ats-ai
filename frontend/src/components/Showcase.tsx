import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function Showcase() {
  const [activeTab, setActiveTab] = useState<'insights' | 'generate'>('insights');

  return (
    <section className="py-32 bg-[#FAFAFA] relative overflow-hidden" id="showcase">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
          >
            See It In Action
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-500"
          >
            Watch how our AI transforms your job search workflow by analyzing requirements and generating tailored content.
          </motion.p>
        </div>

        {/* Custom Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-100 p-1 rounded-full inline-flex relative">
            <button
              onClick={() => setActiveTab('insights')}
              className={cn(
                "px-8 py-3 rounded-full text-sm font-semibold transition-colors relative z-10",
                activeTab === 'insights' ? "text-white" : "text-gray-600 hover:text-black"
              )}
            >
              Insights
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={cn(
                "px-8 py-3 rounded-full text-sm font-semibold transition-colors relative z-10",
                activeTab === 'generate' ? "text-white" : "text-gray-600 hover:text-black"
              )}
            >
              Generate
            </button>
            
            {/* Animated Pill Background */}
            <motion.div
              layoutId="activeTabPill"
              className="absolute top-1 bottom-1 w-1/2 bg-[#0A0A0A] rounded-full z-0"
              initial={false}
              animate={{
                left: activeTab === 'insights' ? '0.25rem' : 'calc(50% - 0.25rem)',
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </div>
        </div>

        {/* Interactive UI Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
        >
          {/* Browser Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-md py-1.5 px-3 flex items-center gap-2 text-xs text-gray-400 font-mono max-w-md mx-auto">
              <Search size={12} />
              <span>app.atsai.com/workspace</span>
            </div>
          </div>

          {/* App Content Area */}
          <div className="p-8 min-h-[500px] bg-white relative">
            <AnimatePresence mode="wait">
              {activeTab === 'insights' ? (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4 }}
                  className="grid md:grid-cols-3 gap-8 h-full"
                >
                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Senior Frontend Engineer</h3>
                      <p className="text-sm text-gray-500">Stripe • San Francisco, CA</p>
                    </div>
                    <div className="space-y-4">
                      <div className="h-4 bg-gray-100 rounded w-full" />
                      <div className="h-4 bg-gray-100 rounded w-11/12" />
                      <div className="h-4 bg-gray-100 rounded w-full" />
                      <div className="h-4 bg-gray-100 rounded w-4/5" />
                    </div>
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                      <div className="flex items-center gap-2 text-orange-600 font-semibold mb-2">
                        <Sparkles size={16} /> Key Requirements Extracted
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['React', 'TypeScript', 'Framer Motion', 'Performance Optimization', '5+ Years Exp'].map(tag => (
                          <span key={tag} className="px-3 py-1 bg-white border border-orange-200 text-orange-700 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="border-l border-gray-100 pl-8 flex flex-col items-center justify-center">
                    <div className="relative w-32 h-32 mb-6">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                        <motion.circle 
                          initial={{ strokeDasharray: "0 300" }}
                          animate={{ strokeDasharray: "220 300" }}
                          transition={{ duration: 1.5, delay: 0.5 }}
                          cx="50" cy="50" r="45" fill="none" stroke="#f97316" strokeWidth="10" strokeLinecap="round" 
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900">78</span>
                        <span className="text-xs text-gray-500">Match Score</span>
                      </div>
                    </div>
                    <ul className="w-full space-y-3">
                      <li className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Job Title Match</span>
                        <CheckCircle2 size={16} className="text-green-500" />
                      </li>
                      <li className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Education Match</span>
                        <CheckCircle2 size={16} className="text-green-500" />
                      </li>
                      <li className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Hard Skills</span>
                        <span className="text-orange-500 font-medium">Missing 2</span>
                      </li>
                    </ul>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="generate"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <FileText className="text-orange-500" />
                      <h3 className="font-semibold">Tailored Resume Generation</h3>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-1.5 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50">View Original</button>
                      <button className="px-4 py-1.5 text-xs font-medium bg-[#0A0A0A] text-white rounded-md">Download PDF</button>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-2 gap-8">
                    {/* Before */}
                    <div className="opacity-50 pointer-events-none">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Original Bullet</div>
                      <p className="text-sm text-gray-600 line-through decoration-red-300">
                        Built user interfaces for the main web application using React and made it faster.
                      </p>
                    </div>
                    {/* After */}
                    <div className="relative">
                      <div className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Sparkles size={12} /> Optimized Bullet
                      </div>
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-gray-900 font-medium leading-relaxed bg-orange-50/50 p-4 rounded-lg border border-orange-100"
                      >
                        Architected and deployed scalable frontend features using <span className="bg-orange-100 text-orange-800 px-1 rounded">React</span> and <span className="bg-orange-100 text-orange-800 px-1 rounded">TypeScript</span>, reducing load times by 35% and improving overall <span className="bg-orange-100 text-orange-800 px-1 rounded">performance optimization</span> metrics.
                      </motion.p>
                      
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="absolute -right-4 top-1/2 -translate-y-1/2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded shadow-sm flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} /> ATS Keyword Added
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        
        <div className="text-center mt-8">
          <p className="text-sm font-medium text-gray-500">
            Instantly analyze any job posting to extract key requirements, skills, and company details.
          </p>
        </div>
      </div>
    </section>
  );
}
