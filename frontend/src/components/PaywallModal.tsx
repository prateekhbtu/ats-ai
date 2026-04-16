import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Clock, Sparkles } from 'lucide-react';
import type { UsageStatus } from '../lib/api';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  usage?: UsageStatus | null;
}

export function PaywallModal({ isOpen, onClose, usage }: PaywallModalProps) {
  const resetsAt = usage?.resets_at ? new Date(usage.resets_at) : null;
  const timeLeft = resetsAt
    ? Math.max(0, Math.ceil((resetsAt.getTime() - Date.now()) / (1000 * 60 * 60)))
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-[#0A0A0A] px-5 py-5 text-white">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                  <Crown size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight">AI Limit Reached</h2>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    {usage?.used ?? 0}/{usage?.limit ?? 5} free requests used today
                  </p>
                </div>
              </div>
            </div>

            {/* Usage bar */}
            <div className="px-5 pt-4 pb-3">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: '100%' }} />
              </div>
              {timeLeft !== null && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400 font-medium">
                  <Clock size={11} />
                  <span>Resets in ~{timeLeft}h</span>
                </div>
              )}
            </div>

            {/* Features — compact */}
            <div className="px-5 pb-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pro includes</p>
              <div className="space-y-1.5">
                {[
                  'Unlimited AI requests',
                  'Priority processing speed',
                  'Premium templates & exports',
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <Sparkles size={11} className="text-orange-500 shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={() => {
                  alert('Pro subscription coming soon! Your requests reset every 24 hours.');
                  onClose();
                }}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Crown size={14} /> Upgrade to Pro
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
