import { useState } from 'react';
import { motion } from 'motion/react';
import { Trash2, Bell, RefreshCw, AlertTriangle, UserX, Clock } from 'lucide-react';
import { fetchInactiveAccounts, warnInactiveUser, deleteInactiveUser } from '../services/api';
import { InactiveAccount } from '../types';
import { formatNaira, getInitials } from '../utils/formatters';

interface InactiveAccountsViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function InactiveAccountsView({ adminSecret, addToast }: InactiveAccountsViewProps) {
  const [accounts, setAccounts] = useState<InactiveAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [warnedIds, setWarnedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const result = await fetchInactiveAccounts(adminSecret, 180);
      setAccounts(result.candidates);
      setIsLoaded(true);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load inactive accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWarn = async (user: InactiveAccount) => {
    try {
      await warnInactiveUser(adminSecret, user.id);
      setWarnedIds(prev => new Set([...prev, user.id]));
      addToast('success', `⚠️ Warning sent to ${user.full_name}`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to send warning');
    }
  };

  const handleDelete = async (user: InactiveAccount) => {
    setDeletingId(user.id);
    try {
      const result = await deleteInactiveUser(adminSecret, user.id);
      setAccounts(prev => prev.filter(a => a.id !== user.id));
      setConfirmDeleteId(null);
      addToast('success', `🗑️ ${result.message}`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete account');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inactive Accounts</h1>
          <p className="text-sm text-text-muted mt-1">
            Users inactive for 180+ days with zero balance and no successful orders.
          </p>
        </div>
        <button
          onClick={loadAccounts}
          disabled={isLoading}
          className="px-4 py-2 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-2 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary-blue' : ''}`} />
          {isLoaded ? 'Refresh' : 'Load Inactive Accounts'}
        </button>
      </div>

      {/* WARNING CARD */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-amber-800 mb-1">⚠️ Deletion is permanent</h4>
          <p className="text-xs text-amber-700 leading-relaxed">
            Only accounts inactive for <strong>180+ days</strong> with <strong>zero wallet balance</strong>, 
            <strong> zero cashback</strong>, and <strong>no successful orders</strong> are shown here. 
            Always send a warning first and wait before deleting. This cannot be undone.
          </p>
        </div>
      </div>

      {/* NOT LOADED STATE */}
      {!isLoaded && !isLoading && (
        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-16 text-center">
          <UserX className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Click "Load Inactive Accounts" to scan</p>
          <p className="text-xs text-slate-400 mt-1">This checks for users inactive 180+ days</p>
        </div>
      )}

      {/* LOADING */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-16 text-center">
          <RefreshCw className="w-8 h-8 text-primary-blue mx-auto mb-3 animate-spin" />
          <p className="text-slate-500 text-sm">Scanning for inactive accounts...</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {isLoaded && !isLoading && accounts.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-16 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-bold text-slate-800">No inactive accounts found</p>
          <p className="text-xs text-slate-400 mt-1">All users have been active within the last 180 days</p>
        </div>
      )}

      {/* ACCOUNTS LIST */}
      {isLoaded && accounts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Summary */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserX className="w-5 h-5 text-danger" />
              <span className="text-sm font-bold text-red-800">
                {accounts.length} inactive account{accounts.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <span className="text-xs text-red-600 font-medium">180+ days inactive</span>
          </div>

          {/* Account cards */}
          {accounts.map(account => (
            <div
              key={account.id}
              className="bg-white rounded-xl border border-slate-105 shadow-geometric p-5"
            >
              <div className="flex items-start justify-between gap-4">
                {/* User info */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {getInitials(account.full_name)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{account.full_name}</p>
                    <p className="text-xs font-mono text-slate-500">{account.phone}</p>
                  </div>
                </div>

                {/* Days inactive badge */}
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-danger text-[10px] font-bold rounded-lg">
                    <Clock className="w-3 h-3" />
                    {account.days_inactive}d inactive
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Wallet</p>
                  <p className="text-sm font-mono font-bold text-slate-700">{formatNaira(account.wallet_balance)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Sessions</p>
                  <p className="text-sm font-mono font-bold text-slate-700">{account.total_sessions}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Joined</p>
                  <p className="text-sm font-mono font-bold text-slate-700">{account.days_since_joined}d ago</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                {/* Warn button */}
                <button
                  onClick={() => handleWarn(account)}
                  disabled={warnedIds.has(account.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    warnedIds.has(account.id)
                      ? 'bg-amber-50 text-amber-600 border-amber-200 opacity-60'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  {warnedIds.has(account.id) ? 'Warning Sent' : 'Send Warning'}
                </button>

                {/* Delete button */}
                {confirmDeleteId === account.id ? (
                  <div className="flex gap-1.5 flex-1">
                    <button
                      onClick={() => handleDelete(account)}
                      disabled={deletingId === account.id}
                      className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-danger text-white hover:bg-red-600 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {deletingId === account.id ? (
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : <Trash2 className="w-3.5 h-3.5" />}
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-2.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(account.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl border border-red-200 bg-red-50 text-danger hover:bg-red-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Account
                  </button>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
