import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Coins, 
  Calendar,
  AlertCircle,
  X,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  FileText,
  HelpCircle,
  Download
} from 'lucide-react';
import { Withdrawal } from '../types';
import { fetchWithdrawals, processWithdrawal } from '../services/api';
import { formatNaira, formatDateTime } from '../utils/formatters';
import { addAuditLog } from '../utils/auditLogger';

interface WithdrawalsViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  onProcessed: () => void;
}

export default function WithdrawalsView({ adminSecret, addToast, onProcessed }: WithdrawalsViewProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'rejected'>('pending');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal Dialog confirmation state
  const [activeWithdrawal, setActiveWithdrawal] = useState<Withdrawal | null>(null);
  const [processType, setProcessType] = useState<'paid' | 'rejected' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWithdrawals = async () => {
    setIsLoading(true);
    try {
      const resp = await fetchWithdrawals(adminSecret, activeTab);
      if (resp.success) {
        setWithdrawals(resp.withdrawals);
      } else {
        addToast('error', 'Could not fetch withdrawals from the server.');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Error occurred while loading withdrawals.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [activeTab, adminSecret]);

  const handleOpenProcessModal = (w: Withdrawal, type: 'paid' | 'rejected') => {
    setActiveWithdrawal(w);
    setProcessType(type);
    setAdminNote('');
  };

  const handleCloseProcessModal = () => {
    setActiveWithdrawal(null);
    setProcessType(null);
    setAdminNote('');
  };

  const handleSubmitProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWithdrawal || !processType) return;

    if (processType === 'rejected' && !adminNote.trim()) {
      addToast('warning', 'Please provide a justification reasoning for rejection.');
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await processWithdrawal(adminSecret, activeWithdrawal.id, processType, adminNote.trim());
      if (resp.success) {
        if (processType === 'paid') {
          addToast('success', `Withdrawal marked as paid. User notified.`);
          addAuditLog('withdrawal', 'process_withdrawal', `Approved withdrawal request of ₦${activeWithdrawal.amount.toLocaleString()} for "${activeWithdrawal.account_name}" (${activeWithdrawal.bank_name}, Acct: ${activeWithdrawal.account_number}) as PAID`, 'success');
        } else {
          addToast('success', `Withdrawal rejected. User's cashback refunded.`);
          addAuditLog('withdrawal', 'process_withdrawal', `Rejected withdrawal request of ₦${activeWithdrawal.amount.toLocaleString()} for "${activeWithdrawal.account_name}" (${activeWithdrawal.bank_name}, Acct: ${activeWithdrawal.account_number}). Justification: "${adminNote.trim()}"`, 'success');
        }
        // Refresh parent count state & reload table
        onProcessed();
        loadWithdrawals();
        handleCloseProcessModal();
      } else {
        addToast('error', resp.message || 'Failed to process withdrawal action.');
        addAuditLog('withdrawal', 'process_withdrawal', `Failed processing withdrawal of ₦${activeWithdrawal.amount.toLocaleString()} for "${activeWithdrawal.account_name}" as ${processType}: ${resp.message}`, 'failed');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Internal connection failure processing request.');
      addAuditLog('withdrawal', 'process_withdrawal', `Error processing withdrawal of ₦${activeWithdrawal.amount.toLocaleString()} for "${activeWithdrawal.account_name}" as ${processType}: ${err.message || err}`, 'failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-105 shadow-geometric">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-primary-blue" />
            <h1 className="text-xl font-bold font-sans text-slate-900">Withdrawals Manager</h1>
          </div>
          <p className="text-xs text-slate-500">
            Audit ledger and process user cashbacks withdrawals safely and securely.
          </p>
        </div>

        {/* REFRESH CONTROL */}
        <button 
          onClick={loadWithdrawals}
          disabled={isLoading}
          className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-205 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all select-none cursor-pointer"
        >
          Reload Table
        </button>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-slate-200 gap-6">
        {(['pending', 'paid', 'rejected'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
                isActive ? 'text-primary-blue' : 'text-slate-550 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {tab === 'pending' && <Clock className="w-4 h-4" />}
                {tab === 'paid' && <CheckCircle className="w-4 h-4 text-success" />}
                {tab === 'rejected' && <XCircle className="w-4 h-4 text-danger" />}
                {label} ({withdrawals.length})
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeWithdrawalTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-blue"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* WITHDRAWALS TABLE CARD */}
      <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4"># PROFILE ID</th>
                <th className="px-6 py-4">USER</th>
                <th className="px-6 py-4 font-mono">PHONE</th>
                <th className="px-6 py-4 text-right">AMOUNT (₦)</th>
                <th className="px-6 py-4">BANK & LEDGER INFO</th>
                <th className="px-6 py-4">REQUESTED AT</th>
                {activeTab !== 'pending' && <th className="px-6 py-4">PROCESSED INFO</th>}
                <th className="px-6 py-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F8] text-xs">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-16 h-3.5 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-24 h-3.5 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-20 h-3.5 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-14 h-3.5 bg-slate-100 rounded ml-auto" /></td>
                    <td className="px-6 py-4"><div className="w-48 h-3.5 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-24 h-3.5 bg-slate-100 rounded" /></td>
                    {activeTab !== 'pending' && <td className="px-6 py-4"><div className="w-32 h-3.5 bg-slate-100 rounded" /></td>}
                    <td className="px-6 py-4"><div className="w-20 h-7 bg-slate-100 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'pending' ? 8 : 9} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Coins className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-semibold">No withdrawals registered in this view category list.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                withdrawals.map((w, index) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-400">
                      #{w.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4">
                      <strong className="font-semibold text-slate-900 block">
                        {w.users?.full_name || 'Anonymous User'}
                      </strong>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {w.users?.phone || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold font-mono text-slate-900">
                      {formatNaira(w.amount)}
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="font-semibold text-slate-800">
                        {w.bank_name}
                      </div>
                      <div className="font-mono text-slate-500 text-[11px] block">
                        Acc: {w.account_number}
                      </div>
                      <div className="text-slate-400 text-[10px] block">
                        Holder: {w.account_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {formatDateTime(w.created_at)}
                    </td>
                    {activeTab !== 'pending' && (
                      <td className="px-6 py-4 space-y-1">
                        {w.processed_at && (
                          <div className="text-slate-500 font-medium">
                            {formatDateTime(w.processed_at)}
                          </div>
                        )}
                        {w.admin_note ? (
                          <div className="text-slate-500 font-mono italic bg-slate-50 px-2 py-1 rounded border border-slate-100 max-w-xs break-all">
                            Note: {w.admin_note}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No notes</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      {activeTab === 'pending' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenProcessModal(w, 'paid')}
                            title="Confirm transfer and settle payee"
                            className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-success text-[11px] font-bold rounded-lg border border-success/20 transition-all select-none cursor-pointer flex items-center gap-0.5"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => handleOpenProcessModal(w, 'rejected')}
                            title="Reject request and refund balance back to user"
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-danger text-[11px] font-bold rounded-lg border border-danger/20 transition-all select-none cursor-pointer flex items-center gap-0.5"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            w.status === 'paid' ? 'bg-[#DCFCE7] text-[#22C55E]' : 'bg-[#FEE2E2] text-[#EF4444]'
                          }`}>
                            {w.status.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OVERLAY PROCESS DIALOG MODAL */}
      <AnimatePresence>
        {activeWithdrawal && processType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseProcessModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', duration: 0.3 } }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-xl border border-slate-105 shadow-geometric max-w-md w-full z-10 overflow-hidden"
            >
              {/* MODAL HEADER */}
              <div className={`p-5 text-white flex justify-between items-center ${
                processType === 'paid' ? 'bg-green-600' : 'bg-red-600'
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    {processType === 'paid' ? 'Confirm Settlement' : 'Reject & Refund Request'}
                  </h3>
                </div>
                <button
                  onClick={handleCloseProcessModal}
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* MODAL CONTENT FORM */}
              <form onSubmit={handleSubmitProcess} className="p-6 space-y-4">
                {/* SETTLEMENT ATTRIBUTES DETAILS */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5 font-sans">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 text-xs">Beneficiary Payee</span>
                    <strong className="text-slate-900 text-xs font-semibold text-right">
                      {activeWithdrawal.users?.full_name || 'Anonymous User'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 text-xs text-left">Naira Amount</span>
                    <strong className="text-slate-900 text-sm font-mono font-extrabold text-right text-primary-dark">
                      {formatNaira(activeWithdrawal.amount)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-start border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500 text-xs">Destination Bank Name</span>
                    <span className="text-slate-800 text-xs font-semibold text-right">
                      {activeWithdrawal.bank_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 text-xs">Account Number</span>
                    <span className="text-slate-900 text-xs font-mono font-bold text-right bg-slate-100 px-1.5 py-0.5 rounded">
                      {activeWithdrawal.account_number}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 text-xs">Validated Account Name</span>
                    <span className="text-slate-800 text-xs font-medium text-right max-w-[200px] block truncate">
                      {activeWithdrawal.account_name}
                    </span>
                  </div>
                </div>

                {/* SAFETY ALERTS */}
                <div className={`p-4 rounded-xl flex items-start gap-3 border text-xs leading-relaxed ${
                  processType === 'paid' 
                    ? 'bg-green-50 border-green-200 text-green-850' 
                    : 'bg-red-50 border-red-200 text-red-850'
                }`}>
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                    processType === 'paid' ? 'text-green-600 animate-bounce' : 'text-red-600'
                  }`} />
                  <div>
                    {processType === 'paid' ? (
                      <div>
                        <strong>Real money warning:</strong> Please establish absolute verification that you have successfully dispatched <strong>{formatNaira(activeWithdrawal.amount)}</strong> via your banking portal to this recipient.
                      </div>
                    ) : (
                      <div>
                        <strong>Refund Action Warning:</strong> Rejecting will deny this session request. The requested cashback balance of <strong>{formatNaira(activeWithdrawal.amount)}</strong> will return directly into the user account pool.
                      </div>
                    )}
                  </div>
                </div>

                {/* INPUT ADMINISTRATIVE REASON NOTES */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-tight">
                    Administrative Notes {processType === 'rejected' ? <span className="text-danger">*</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                  </label>
                  <textarea
                    required={processType === 'rejected'}
                    placeholder={
                      processType === 'paid' 
                        ? 'e.g. Paid via mobile bank app transfer' 
                        : 'Required rejection justification reason given to user...'
                    }
                    rows={2.5}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-205 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 transition-all outline-none resize-none"
                  />
                  {processType === 'rejected' && (
                    <p className="text-[10px] text-red-500 font-medium leading-none">
                      Rejection explanation reason is mandatory. Understood by client user.
                    </p>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={handleCloseProcessModal}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all ${
                      processType === 'paid' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isSubmitting ? 'Processing...' : processType === 'paid' ? 'Confirm Payment Complete' : 'Reject Withdrawal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
