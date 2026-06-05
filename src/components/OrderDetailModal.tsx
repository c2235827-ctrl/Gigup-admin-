import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  Paperclip, 
  Phone, 
  HelpCircle, 
  Database, 
  RefreshCw,
  FileText,
  Bookmark,
  Calendar,
  AlertOctagon,
  Gift
} from 'lucide-react';
import { Order } from '../types';
import { requeryOrder, resendSignupBonus } from '../services/api';
import { formatNaira, formatDateTime } from '../utils/formatters';
import { addAuditLog } from '../utils/auditLogger';

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  onRefreshAll: () => void;
}

export default function OrderDetailModal({
  order,
  onClose,
  adminSecret,
  addToast,
  onRefreshAll
}: OrderDetailModalProps) {
  const [isRequerying, setIsRequerying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  if (!order) return null;

  const handleResendBonus = async () => {
    if (!confirm(`Resend 1GB welcome data bonus to ${order.recipient_phone}?`)) return;
    setIsResending(true);
    try {
      const result = await resendSignupBonus(adminSecret, order.user_id);
      addToast(result.success ? 'success' : 'error', result.message);
      if (result.success) {
        addAuditLog('order', 'resend_signup_bonus', `Resent 1GB welcome data bonus to recipient ${order.recipient_phone} from order detail view. Order ID: ${order.id}`, 'success');
        onRefreshAll();
        onClose();
      } else {
        addAuditLog('order', 'resend_signup_bonus', `Failed to resend welcome 1GB welcome data bonus to recipient ${order.recipient_phone} from order detail view: ${result.message}`, 'failed');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to resend bonus');
      addAuditLog('order', 'resend_signup_bonus', `Error trying to resend welcome data bonus to recipient ${order.recipient_phone}: ${err.message || err}`, 'failed');
    } finally {
      setIsResending(false);
    }
  };

  const handleRequery = async () => {
    if (!order.smedata_ref) {
      addToast('error', 'No SMEDATA reference found. Use "Resend Bonus" for bonus orders or contact support for paid orders.');
      return;
    }

    setIsRequerying(true);
    addToast('info', `Syncing VTU carrier state... Reference: ${order.smedata_ref}`);

    try {
      const response = await requeryOrder(adminSecret, order.smedata_ref);
      if (response.success) {
        if (response.smedata_status === 'success') {
          addToast('success', `✅ Verified delivery successfully!`);
          addAuditLog('order', 'requery_transaction', `Requeried order reference ${order.smedata_ref} from detail modal. Status: SUCCESS`, 'success');
        } else if (response.smedata_status === 'failed') {
          addToast('warning', `❌ Carrier reported failure. User wallet refunded.`);
          addAuditLog('order', 'requery_transaction', `Requeried order reference ${order.smedata_ref} from detail modal. Status: FAILED (Refunded)`, 'success');
        } else {
          addToast('info', `Carrier returned state: ${response.smedata_status}`);
          addAuditLog('order', 'requery_transaction', `Requeried order reference ${order.smedata_ref} from detail modal. Status: ${response.smedata_status}`, 'success');
        }
        onRefreshAll(); // Trigger reload of stats and feeds
        onClose(); // Close modal on success
      } else {
        addToast('error', `Requery action did not complete successfully`);
        addAuditLog('order', 'requery_transaction', `Failed to requery order reference ${order.smedata_ref}: API reported failure`, 'failed');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Operation failed.');
      addAuditLog('order', 'requery_transaction', `Failed to requery order reference ${order.smedata_ref}: ${err.message || err}`, 'failed');
    } finally {
      setIsRequerying(false);
    }
  };

  const networkColors = order.network === 'MTN' 
    ? 'bg-amber-100 text-amber-750 border-amber-200' 
    : order.network === 'GLO' 
    ? 'bg-green-100 text-green-750 border-green-200' 
    : 'bg-red-100 text-red-750 border-red-200';

  const statusColors = order.status === 'success'
    ? 'bg-green-100 text-success'
    : order.status === 'failed'
    ? 'bg-red-100 text-danger'
    : 'bg-purple-100 text-pending animate-pulse';

  return (
    <AnimatePresence>
      <div id="order-detail-modal" className="fixed inset-0 z-55 flex items-center justify-center p-4">
        {/* BACKDROP BLUR */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* DIALOG CARD */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', duration: 0.3 } }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full z-10 overflow-hidden relative"
        >
          {/* TOP BAR BRAND */}
          <div className="bg-primary-dark text-white p-5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-blue" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-sans">VTU Invoice Details</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* INVOICE TICKET */}
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* STATUS & META SUMMARY */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Order ID</span>
                <span className="text-sm font-bold font-mono text-slate-900">{order.id}</span>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold ${statusColors}`}>
                {order.status.toUpperCase()}
              </span>
            </div>

            {/* TWO-COLUMN DETAILS LIST */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs leading-relaxed">
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Purchasing User</span>
                <span className="font-semibold text-slate-900 block">{order.users?.full_name || 'Anonymous client'}</span>
                <span className="text-[10px] text-text-muted mt-0.5 block font-mono">{order.users?.phone || '—'}</span>
              </div>

              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receiving Operator Line</span>
                <span className="font-semibold text-slate-900 block font-mono text-sm">{order.recipient_phone}</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.2 rounded font-bold uppercase tracking-wide text-[9px] mt-1.5 border ${networkColors}`}>
                  {order.network} Carrier
                </span>
              </div>

              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Purchased Plan Package</span>
                <span className="font-bold text-slate-900 block text-sm">{order.plan_name}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">Reference Code: {order.smedata_ref || '—'}</span>
              </div>

              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction Fees</span>
                <span className="text-sm font-extrabold text-slate-950 font-mono block">{formatNaira(order.amount)}</span>
                <span className="text-[10px] text-purple-600 block mt-0.5 font-semibold">
                  {order.cashback_amount > 0 ? `+ ${formatNaira(order.cashback_amount)} cashback` : 'No cashback earned'}
                </span>
              </div>
            </div>

            {/* TIMEPIN */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-medium">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Placed Timestamp</span>
              <span className="font-mono text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDateTime(order.created_at)}
              </span>
            </div>

            {/* PENDING TRIGGER NOTICE */}
            {order.status === 'pending' && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3">
                <Clock className="w-5 h-5 text-pending animate-pulse shrink-0 mt-0.5" />
                <div className="text-xs text-purple-850">
                  <span className="font-bold block">Transaction processing...</span>
                  The mobile transaction is currently pending dispatch on Supabase. Press the sync button to audit the external carrier logs directly.
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM BUTTON BAR */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center grow-0">
            {order.amount === 0 && (order.status === 'pending' || order.status === 'failed' || !order.smedata_ref) ? (
              <button
                type="button"
                onClick={handleResendBonus}
                disabled={isResending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-75 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:translate-y-[0.5px]"
              >
                {isResending ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <Gift className="w-4 h-4" />
                )}
                <span>Resend Signup Bonus</span>
              </button>
            ) : order.status === 'pending' ? (
              <button
                type="button"
                onClick={handleRequery}
                disabled={isRequerying}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-100 hover:bg-amber-200 disabled:opacity-75 text-warning font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:translate-y-[0.5px]"
              >
                {isRequerying ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-warning" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Requery VTU Delivery</span>
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-250 hover:bg-slate-350 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Close Invoice
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
