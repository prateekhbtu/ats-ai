import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const faqs = [
  {
    q: "How does AI resume tailoring work?",
    a: "Our AI analyzes the job description you provide, extracts the key skills and requirements, and then cross-references them with your uploaded resume. It rewrites bullet points to highlight relevant experience and ensures ATS keywords are naturally integrated without inventing false information."
  },
  {
    q: "Why should I use ATS-optimized resumes?",
    a: "Over 75% of resumes are rejected by Applicant Tracking Systems (ATS) before a human ever sees them. Optimizing your resume ensures that the software can parse your skills correctly and rank you higher for the recruiter to review."
  },
  {
    q: "Can atsai generate personalized cover letters?",
    a: "Yes. Based on your resume and the target job description, atsai generates a highly tailored cover letter. You can select the tone (Formal, Conversational, Assertive) to match the company culture."
  },
  {
    q: "Is my data secure and private?",
    a: "Absolutely. We use secure Google authentication and do not sell your personal data. Your resumes and job descriptions are stored securely in your private profile and are only used to generate your optimized documents."
  },
  {
    q: "Will the AI make up fake experience?",
    a: "No. We utilize strict fact-checking prompts. The AI is explicitly instructed to only use the experience, metrics, and skills present in your original resume. It focuses on better phrasing and highlighting relevance, not fabrication."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-32 bg-[#FAFAFA]" id="faq">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold tracking-tight mb-4"
          >
            Frequently Asked Questions
          </motion.h2>
          <p className="text-gray-500">Everything you need to know about atsai and how it helps your job search.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border border-gray-200 rounded-2xl bg-white overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="font-semibold text-gray-900">{faq.q}</span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-gray-400"
                >
                  <ChevronDown size={20} />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-5 text-gray-500 leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
