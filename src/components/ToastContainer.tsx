import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertTriangle, X, Info, AlertCircle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
  key?: React.Key;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div 
      id="toast-anchor"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const config = {
    success: {
      bg: 'bg-white border-l-4 border-success text-text-main',
      icon: <CheckCircle className="w-5 h-5 text-success shrink-0" />
    },
    error: {
      bg: 'bg-white border-l-4 border-danger text-text-main',
      icon: <AlertCircle className="w-5 h-5 text-danger shrink-0" />
    },
    warning: {
      bg: 'bg-white border-l-4 border-warning text-text-main',
      icon: <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
    },
    info: {
      bg: 'bg-white border-l-4 border-primary-blue text-text-main',
      icon: <Info className="w-5 h-5 text-primary-blue shrink-0" />
    }
  }[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border border-slate-100 ${config.bg}`}
    >
      {config.icon}
      <div className="flex-1 text-sm font-medium pr-2">
        {toast.message}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
