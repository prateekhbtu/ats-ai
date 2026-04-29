import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const VARIANT_META: Record<ToastVariant, { icon: React.ElementType; bg: string; border: string; text: string; iconColor: string }> = {
  success: { icon: CheckCircle2, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', iconColor: 'text-green-500' },
  error:   { icon: AlertCircle,  bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-800',   iconColor: 'text-red-500' },
  info:    { icon: Info,         bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-800',  iconColor: 'text-blue-500' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = 'info', duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => {
      const hasDuplicate = prev.some((item) => item.message === message && item.variant === variant);
      if (hasDuplicate) return prev;
      return [...prev, { id, message, variant, duration }];
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[360px] z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {items.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const meta = VARIANT_META[item.variant];
  const Icon = meta.icon;

  useEffect(() => {
    const t = setTimeout(onDismiss, item.duration);
    return () => clearTimeout(t);
  }, [item.duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-auto flex items-start gap-3 ${meta.bg} ${meta.border} border rounded-xl shadow-lg px-4 py-3`}
      role="status"
    >
      <Icon size={18} className={`${meta.iconColor} shrink-0 mt-0.5`} />
      <p className={`flex-1 text-sm font-medium ${meta.text} leading-snug`}>{item.message}</p>
      <button
        onClick={onDismiss}
        className={`shrink-0 ${meta.iconColor} hover:opacity-70 transition-opacity`}
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}
