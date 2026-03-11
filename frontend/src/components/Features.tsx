import { motion } from 'framer-motion';
import { ShieldCheck, PenTool, FileSearch, Sparkles } from 'lucide-react';

const featuresList = [
  {
    icon: FileSearch,
    title: "Detailed ATS Scoring",
    desc: "Your resume is scored based on keyword matching, formatting quality, section completeness, and overall readability."
  },
  {
    icon: ShieldCheck,
    title: "Strict Fact-Checking",
    desc: "Our AI is programmed to use only the information provided. It will never hallucinate or make up experiences that do not exist."
  },
  {
    icon: PenTool,
    title: "Interactive Editing",
    desc: "Give the AI instructions like 'make this sound more technical' or 'shorten this bullet point' to regenerate specific parts."
  },
  {
    icon: Sparkles,
    title: "Cover Letter Builder",
    desc: "Generate a custom, perfectly toned cover letter based on the job description in seconds. Choose from Formal, Conversational, or Assertive tones."
  }
];

export function Features() {
  return (
    <section className="py-32 bg-[#0A0A0A] text-white relative overflow-hidden" id="features">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="inline-block px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-500 text-xs font-bold uppercase tracking-wider mb-6"
          >
            Core Features
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
          >
            Smart Resume Analysis & Generation
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-400"
          >
            Everything you need to bypass automated filters and get your resume in front of human eyes.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {featuresList.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center mb-6">
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
