import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const HIGHLIGHTS = [
  'Strict fact-checking — no hallucinations',
  'ATS keyword analysis & scoring',
  'Cover letter generator in seconds',
];

export function Hero() {
  return (
    <section className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center pt-28 pb-20 relative overflow-hidden px-6">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      {/* Glow blob */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 text-xs font-semibold uppercase tracking-wider mb-8"
        >
          <Sparkles size={12} /> AI-Powered Resume Optimizer
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6"
        >
          Get Past the Bots,{' '}
          <span className="relative inline-block">
            <span className="relative z-10">Land the Interview</span>
            <span className="absolute -bottom-1 left-0 right-0 h-3 bg-orange-400/30 rounded-full -z-10" />
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          AI that scores, rewrites, and tailors your resume against any job
          description — ensuring you rank higher in every ATS before a human
          even sees your application.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <Link
            to="/signup"
            className="group w-full sm:w-auto bg-[#0A0A0A] text-white px-8 py-4 rounded-full font-semibold text-base flex items-center justify-center gap-3 hover:bg-black/80 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/15"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5 bg-white rounded-full p-[2px]"
            />
            Start for free
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
          <a
            href="#showcase"
            className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            See it in action
          </a>
        </motion.div>

        {/* Highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
        >
          {HIGHLIGHTS.map((h) => (
            <div
              key={h}
              className="flex items-center gap-2 text-sm text-gray-500"
            >
              <CheckCircle2 size={16} className="text-green-500 shrink-0" />
              {h}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Hero Visual — mock score card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mt-20 w-full max-w-3xl mx-auto"
      >
        <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
          {/* Mock browser chrome */}
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-md py-1 px-3 text-xs text-gray-400 font-mono max-w-xs mx-auto text-center">
              app.atsai.com/editor
            </div>
          </div>
          <div className="p-6 sm:p-8 grid sm:grid-cols-5 gap-6">
            {/* Score gauge */}
            <div className="sm:col-span-2 flex flex-col items-center justify-center gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                  <motion.circle
                    initial={{ strokeDasharray: '0 264' }}
                    animate={{ strokeDasharray: '222 264' }}
                    transition={{ duration: 1.4, delay: 1, ease: 'easeOut' }}
                    cx="50" cy="50" r="42"
                    fill="none" stroke="#f97316" strokeWidth="10" strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">84</span>
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">ATS Score</span>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Optimized</span>
            </div>

            {/* Breakdown */}
            <div className="sm:col-span-3 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Score Breakdown</h3>
              {[
                { label: 'Keyword Match', score: 91 },
                { label: 'Readability', score: 88 },
                { label: 'Section Completeness', score: 76 },
                { label: 'Experience Depth', score: 80 },
              ].map(({ label, score }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{label}</span>
                    <span className="font-semibold text-gray-700">{score}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, delay: 1 + Math.random() * 0.4, ease: 'easeOut' }}
                      className="h-full bg-orange-400 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
