import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started and explore the core features.',
    cta: 'Get started free',
    ctaLink: '/signup',
    highlighted: false,
    features: [
      '3 resume optimizations / month',
      'ATS scoring & keyword analysis',
      'Basic cover letter generation',
      'PDF export',
    ],
  },
  {
    name: 'Pro',
    price: '$12',
    period: 'per month',
    description: 'Everything you need for a serious job search.',
    cta: 'Start Pro — free trial',
    ctaLink: '/signup',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      'Unlimited optimizations',
      'Advanced ATS scoring & insights',
      'Tone-selectable cover letters',
      'Before/after diff view',
      'Interview question generator',
      'Writing analysis tool',
      'Version history',
      'Priority support',
    ],
  },
  {
    name: 'Teams',
    price: '$29',
    period: 'per seat / month',
    description: 'For career coaches and recruiting agencies.',
    cta: 'Contact us',
    ctaLink: '/signup',
    highlighted: false,
    features: [
      'Everything in Pro',
      'Unlimited team seats',
      'Centralized dashboard',
      'White-label exports',
      'Analytics & reporting',
      'Dedicated account manager',
    ],
  },
];

export function Pricing() {
  return (
    <section className="py-32 bg-[#0A0A0A] text-white relative overflow-hidden" id="pricing">
      {/* background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-500 text-xs font-bold uppercase tracking-wider mb-6"
          >
            <Zap size={12} /> Simple Pricing
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
          >
            Invest in your career
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-400"
          >
            One great job offer pays for years of Pro. Start free, upgrade when
            you're ready.
          </motion.p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`relative rounded-3xl p-8 border flex flex-col ${
                plan.highlighted
                  ? 'bg-white text-gray-900 border-white shadow-2xl shadow-white/10 scale-[1.03]'
                  : 'bg-white/5 text-white border-white/10 hover:bg-white/10 transition-colors'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                    <Sparkles size={12} /> {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3
                  className={`font-semibold text-sm uppercase tracking-wider mb-3 ${
                    plan.highlighted ? 'text-orange-500' : 'text-gray-400'
                  }`}
                >
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${plan.highlighted ? 'text-gray-500' : 'text-gray-400'}`}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  className={`text-sm leading-relaxed ${plan.highlighted ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <CheckCircle2
                      size={16}
                      className={`shrink-0 mt-0.5 ${plan.highlighted ? 'text-orange-500' : 'text-gray-500'}`}
                    />
                    <span className={plan.highlighted ? 'text-gray-700' : 'text-gray-300'}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.ctaLink}
                className={`w-full py-3 rounded-xl font-semibold text-sm text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  plan.highlighted
                    ? 'bg-[#0A0A0A] text-white hover:bg-black/80 shadow-lg shadow-black/20'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-12">
          All plans include a 7-day free trial on paid features. No credit card
          required to start.
        </p>
      </div>
    </section>
  );
}
