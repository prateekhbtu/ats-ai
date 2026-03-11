import { motion } from 'framer-motion';
import { Upload, Sparkles, Target, Download } from 'lucide-react';

const steps = [
  {
    num: "Step 1",
    title: "Upload your resume or start fresh",
    desc: "Build optimized resumes, tailor applications, and prepare confidently for interviews using powerful AI tools.",
    icon: Upload
  },
  {
    num: "Step 2",
    title: "Let AI improve and optimize",
    desc: "Let AI refine, enhance, and optimize your resume for clarity, impact, stronger ATS alignment.",
    icon: Sparkles
  },
  {
    num: "Step 3",
    title: "Tailored for specifics jobs",
    desc: "Automatically tailor your resume to match specific job requirements, keywords, and ATS expectations accurately.",
    icon: Target
  },
  {
    num: "Step 4",
    title: "Download & Apply Confidently",
    desc: "Export ATS-ready resumes with confidence and apply seamlessly to roles across multiple hiring platforms.",
    icon: Download
  }
];

export function HowItWorks() {
  return (
    <section className="py-32 bg-[#0A0A0A] text-white relative" id="how-it-works">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-orange-500/20 text-orange-500 text-xs font-bold uppercase tracking-wider mb-6 border border-orange-500/20"
          >
            How it Works
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
          >
            Build, Optimize,<br/>Apply, Get hired
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-400"
          >
            Build optimized resumes, tailor applications, and prepare confidently for interviews using powerful AI tools.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors group"
            >
              <div className="h-40 bg-white/5 rounded-xl mb-6 flex items-center justify-center border border-white/5 overflow-hidden relative">
                {/* Abstract visual representations for each step */}
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.4 }}
                  className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500 relative z-10"
                >
                  <step.icon size={28} />
                </motion.div>
                
                {/* Background decorative elements */}
                <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity flex flex-col gap-2 p-4 justify-center">
                  <div className="w-full h-2 bg-white/20 rounded-full" />
                  <div className="w-3/4 h-2 bg-white/20 rounded-full" />
                  <div className="w-5/6 h-2 bg-white/20 rounded-full" />
                </div>
              </div>
              
              <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-medium mb-4">
                {step.num}
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
