import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  Calendar,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Order } from '../types';
import { fetchOrders, requeryOrder, fetchPendingPayments, manualWalletCredit, resendSignupBonus } from '../services/api';
import { formatNaira, formatDateTime } from '../utils/formatters';
import { addAuditLog } from '../utils/auditLogger';

interface OrdersViewProps {
  adminSecret: string;
  initialPendingFilter: boolean;
  initialBonusPendingFilter?: boolean;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  onRefreshStats: () => void;
  onSelectOrder: (order: Order) => void;
}

export default function OrdersView({
  adminSecret,
  initialPendingFilter,
  initialBonusPendingFilter = false,
  addToast,
  onRefreshStats,
  onSelectOrder
}: OrdersViewProps) {
  // Filters state
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(initialPendingFilter || initialBonusPendingFilter ? 'pending' : 'all');
  const [selectedNetwork, setSelectedNetwork] = useState('all');

  // Query triggers
  const [searchQuery, setSearchQuery] = useState('');
  const [queryStatus, setQueryStatus] = useState(initialPendingFilter || initialBonusPendingFilter ? 'pending' : 'all');
  const [queryNetwork, setQueryNetwork] = useState('all');
  const [isBonusOnly, setIsBonusOnly] = useState(initialBonusPendingFilter);

  // List & pagination
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limitPerPage] = useState(15);
  const [isLoading, setIsLoading] = useState(false);

  // Tab control to switch between VTU orders and Pending Flutterwave payments
  const [activeTabMode, setActiveTabMode] = useState<'vtu' | 'pending_payments'>('vtu');

  // Pending Payments states
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const loadPendingPayments = async () => {
    setIsLoadingPending(true);
    try {
      const response = await fetchPendingPayments(adminSecret);
      if (response.success) {
        setPendingPayments(response.pending || []);
      } else {
        addToast('error', 'Failed to retrieve pending payments');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Error occurred fetching pending payments.');
    } finally {
      setIsLoadingPending(false);
    }
  };

  useEffect(() => {
    if (activeTabMode === 'pending_payments') {
      loadPendingPayments();
    }
  }, [activeTabMode]);

  const handleMarkPaid = async (payment: any) => {
    const userId = payment.user_id;
    const userName = payment.users?.full_name || 'this client';
    const amount = payment.amount;
    const ref = payment.tx_ref;

    if (!confirm(`Mark payment of ₦${amount.toLocaleString()} as PAID and manually credit ${userName}'s wallet?`)) return;

    setMarkingPaidId(payment.id);
    try {
      const result = await manualWalletCredit(adminSecret, userId, amount, ref);
      if (result.success) {
        addToast('success', `✅ Wallet credited with ₦${amount.toLocaleString()} for ${userName}`);
        addAuditLog('user', 'manual_wallet_credit', `Approved pending ledger topup for user "${userName}" (ID: ${userId}) - credited ₦${amount.toLocaleString()}. Ref: ${ref}`, 'success');
        loadPendingPayments();
        onRefreshStats();
      } else {
        addToast('error', result.message || 'Failed to complete credit');
        addAuditLog('user', 'manual_wallet_credit', `Failed to approve topup for user "${userName}" (ID: ${userId}): ${result.message}`, 'failed');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Error processing manual credit.');
      addAuditLog('user', 'manual_wallet_credit', `Error executing manual credit flow for user "${userName}": ${err.message || err}`, 'failed');
    } finally {
      setMarkingPaidId(null);
    }
  };

  // Requery individual tracking
  const [requeryingRefs, setRequeryingRefs] = useState<Record<string, boolean>>({});

  // Sync initial pending filter with internal state if parent specifies it
  useEffect(() => {
    if (initialPendingFilter) {
      setSelectedStatus('pending');
      setQueryStatus('pending');
      setIsBonusOnly(false);
      setCurrentPage(1);
    } else if (initialBonusPendingFilter) {
      setSelectedStatus('pending');
      setQueryStatus('pending');
      setIsBonusOnly(true);
      setCurrentPage(1);
    }
  }, [initialPendingFilter, initialBonusPendingFilter]);

  // Load orders when queries change
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const result = await fetchOrders(
        adminSecret,
        currentPage,
        limitPerPage,
        queryStatus,
        queryNetwork,
        searchQuery,
        isBonusOnly
      );
      setOrders(result.orders || []);
      if (result.pagination) {
        setTotalPages(result.pagination.pages || 1);
        setTotalItems(result.pagination.total || 0);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Could not fetch order lists.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [currentPage, queryStatus, queryNetwork, searchQuery, isBonusOnly]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(phoneSearch.trim());
    setQueryStatus(selectedStatus);
    setQueryNetwork(selectedNetwork);
    setCurrentPage(1); // Reset to first page
  };

  const handleClearFilters = () => {
    setPhoneSearch('');
    setSearchQuery('');
    setSelectedStatus('all');
    setQueryStatus('all');
    setSelectedNetwork('all');
    setQueryNetwork('all');
    setIsBonusOnly(false);
    setCurrentPage(1);
  };

  const handleRequery = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation(); // Avoid opening the row detail modal
    if (!order.smedata_ref) {
      addToast('error', 'No SMEDATA reference found. Use "Resend Bonus" for bonus orders or contact support for paid orders.');
      return;
    }

    const ref = order.smedata_ref;
    setRequeryingRefs(prev => ({ ...prev, [ref]: true }));
    addToast('info', `Requerying transction: Ref ${ref}...`);

    try {
      const response = await requeryOrder(adminSecret, ref);
      if (response.success) {
        if (response.smedata_status === 'success') {
          addToast('success', `✅ Order verified as SUCCESS (Ref: ${ref})`);
          addAuditLog('order', 'requery_transaction', `Successfully requeried order ${order.plan_name} for recipient ${order.recipient_phone} (Ref: ${ref}) - Status: SUCCESS`, 'success');
        } else if (response.smedata_status === 'failed') {
          addToast('warning', `❌ Order marked as FAILED - refunded (Ref: ${ref})`);
          addAuditLog('order', 'requery_transaction', `Successfully requeried order ${order.plan_name} for recipient ${order.recipient_phone} (Ref: ${ref}) - Status: FAILED (Refunded)`, 'success');
        } else {
          addToast('info', `Order returned status: ${response.smedata_status.toUpperCase()}`);
          addAuditLog('order', 'requery_transaction', `Successfully requeried order ${order.plan_name} for recipient ${order.recipient_phone} (Ref: ${ref}) - Status: ${response.smedata_status.toUpperCase()}`, 'success');
        }
        // Refresh orders on table and dashboard metrics
        loadOrders();
        onRefreshStats();
      } else {
        addToast('error', `Requery reported error for Ref ${ref}`);
        addAuditLog('order', 'requery_transaction', `Failed to requery order ${order.plan_name} for recipient ${order.recipient_phone} (Ref: ${ref}) - API reported failure`, 'failed');
      }
    } catch (err: any) {
      addToast('error', err.message || `Requery transaction call failed.`);
      addAuditLog('order', 'requery_transaction', `Failed to requery order (Ref: ${ref}): ${err.message || err}`, 'failed');
    } finally {
      setRequeryingRefs(prev => ({ ...prev, [ref]: false }));
    }
  };

  const handleResendBonusFromOrder = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    if (!confirm(`Resend 1GB welcome data bonus to ${order.recipient_phone}?`)) return;
    try {
      const result = await resendSignupBonus(adminSecret, order.user_id);
      addToast(result.success ? 'success' : 'error', result.message);
      if (result.success) {
        addAuditLog('order', 'resend_signup_bonus', `Resent 1GB welcome data bonus to recipient ${order.recipient_phone} from order journal action. Ref: ${order.id}`, 'success');
        loadOrders();
      } else {
        addAuditLog('order', 'resend_signup_bonus', `Failed to resend welcome data bonus to recipient ${order.recipient_phone} from order journal action: ${result.message}`, 'failed');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to resend bonus');
      addAuditLog('order', 'resend_signup_bonus', `Error trying to resend welcome data bonus to recipient ${order.recipient_phone} from order journal: ${err.message || err}`, 'failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION TITLE */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          VTU Transaction Journal
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Investigate recipient delivery feeds, requery pending carrier SME routes, and confirm statuses.
        </p>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTabMode('vtu')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all focus:outline-none cursor-pointer ${
            activeTabMode === 'vtu'
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          VTU Transactions
        </button>
        <button
          onClick={() => setActiveTabMode('pending_payments')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${
            activeTabMode === 'pending_payments'
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Pending Payments</span>
          {pendingPayments.length > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold bg-amber-500 text-white rounded-full animate-pulse">
              {pendingPayments.length}
            </span>
          )}
        </button>
      </div>

      {activeTabMode === 'pending_payments' ? (
        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Pending Flutterwave Payments</span>
            <button
              onClick={loadPendingPayments}
              disabled={isLoadingPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPending ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 font-mono">tx_ref</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F8] text-xs">
                {isLoadingPending ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                      <td className="px-6 py-4"><div className="h-7 bg-slate-100 rounded-lg w-20 mx-auto" /></td>
                    </tr>
                  ))
                ) : pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No pending flutterwave transactions found.
                    </td>
                  </tr>
                ) : (
                  pendingPayments.map((payment) => {
                    const user = payment.users;
                    const isProcessing = markingPaidId === payment.id;
                    return (
                      <tr key={payment.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-900 block">
                            {user?.full_name || 'Anonymous'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-slate-650">{user?.phone || '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-amber-500 font-mono text-sm">{formatNaira(payment.amount)}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600 font-medium">
                          {payment.tx_ref}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                          {formatDateTime(payment.created_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleMarkPaid(payment)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 hover:text-emerald-800 disabled:opacity-50 text-[11px] font-semibold rounded-lg transition-all cursor-pointer shadow-xs active:translate-y-[0.5px]"
                          >
                            {isProcessing ? '⏳ Saving...' : '✅ Mark Paid'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* FILTER BAR FORM */}
      <div className="bg-white p-5 rounded-xl border border-slate-105 shadow-geometric">
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          {/* RECIPIENT PHONE SEARCH */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              Recipient Phone Number
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="Search phone or names..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-450 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 focus:border-primary-blue transition-all"
              />
            </div>
          </div>

          {/* STATUS DROP */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              Status Level
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 focus:border-primary-blue transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* CARRIER DROP */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              Operator Carrier
            </label>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 focus:border-primary-blue transition-all cursor-pointer"
            >
              <option value="all">All Networks</option>
              <option value="MTN">MTN</option>
              <option value="GLO">GLO</option>
              <option value="AIRTEL">AIRTEL</option>
            </select>
          </div>

          {/* ACTIONS BUTTONS */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-primary-blue hover:bg-blue-600 font-semibold text-xs text-white rounded-xl shadow-md shadow-primary-blue/10 transition-all cursor-pointer h-[38px] flex items-center justify-center"
            >
              Filter Rows
            </button>
            {(phoneSearch || selectedStatus !== 'all' || selectedNetwork !== 'all' || isBonusOnly) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer h-[38px]"
                title="Reset Filters"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ORDERS DATA BOX */}
      <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4"># Order ID</th>
                <th className="px-6 py-4">Sponsor Client</th>
                <th className="px-6 py-4">Receiving Linestate</th>
                <th className="px-6 py-4">Carrier & plan</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Cashback</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 font-mono">SMEDATA Ref</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F8] text-xs">
              {isLoading ? (
                // SKELETON LOADER
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24 mb-1" /><div className="h-3 bg-slate-50 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-100 rounded w-14 ml-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-100 rounded w-10 ml-auto" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-slate-100 rounded-full w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-slate-100 rounded-lg w-16 mx-auto" /></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    No VTU transactions matched your search criteria. Try removing filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const user = order.users;
                  const isRequerying = requeryingRefs[order.smedata_ref] || false;
                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => onSelectOrder(order)}
                      className="hover:bg-slate-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-slate-500">
                        {order.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 block group-hover:text-primary-blue transition-all">
                          {user?.full_name || 'Anonymous'}
                        </span>
                        <span className="text-[10px] text-text-muted mt-0.5 block font-mono">
                          {user?.phone || 'No Phone'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-700">
                        {order.recipient_phone}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide mr-1.5 ${
                          order.network === 'MTN' ? 'bg-amber-100 text-amber-600' :
                          order.network === 'GLO' ? 'bg-green-100 text-green-700' : 'bg-red-150 text-red-600'
                        }`}>
                          {order.network}
                        </span>
                        <span className="font-medium text-slate-900">{order.plan_name}</span>
                        {order.amount === 0 && (
                          <span style={{
                            background: '#F0FDF4', color: '#22C55E',
                            fontSize: '10px', padding: '1px 5px',
                            borderRadius: '4px', marginLeft: '4px'
                          }}>🎁 BONUS</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold font-mono text-slate-800">
                        {order.amount === 0 ? (
                          <span style={{ color: '#22C55E', fontWeight: 700 }}>FREE</span>
                        ) : (
                          <span>₦{Number(order.amount).toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-500">
                        {order.cashback_amount > 0 ? (
                          <span className="text-purple-600">{formatNaira(order.cashback_amount)}</span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          order.status === 'success' ? 'bg-[#DCFCE7] text-[#22C55E]' :
                          order.status === 'failed' ? 'bg-[#FEE2E2] text-[#EF4444]' : 'bg-[#F3E8FF] text-[#8B5CF6] animate-pulse'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-650">
                        {order.smedata_ref || '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-550 whitespace-nowrap">
                        {formatDateTime(order.created_at)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          if (!order.smedata_ref && order.amount === 0) {
                            return (
                              <button
                                onClick={(e) => handleResendBonusFromOrder(e, order)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] rounded-lg transition-all cursor-pointer shadow-xs active:translate-y-[0.5px]"
                              >
                                🎁 Resend Bonus
                              </button>
                            );
                          } else if (!order.smedata_ref && order.amount > 0) {
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert("Contact Support:\n\nPhone: 09064704370\nEmail: hello@gigupnigeria.com\nWebsite: gigupnigeria.com");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer shadow-xs active:translate-y-[0.5px]"
                              >
                                📞 Manual Check
                              </button>
                            );
                          } else if (order.smedata_ref && order.status === 'pending') {
                            const isRequerying = requeryingRefs[order.smedata_ref] || false;
                            return (
                              <button
                                onClick={(e) => handleRequery(e, order)}
                                disabled={isRequerying}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-105 hover:bg-blue-200 text-blue-700 disabled:opacity-70 font-semibold text-[11px] rounded-lg transition-all cursor-pointer shadow-xs active:translate-y-[0.5px]"
                              >
                                {isRequerying ? (
                                  <svg className="animate-spin h-3.5 w-3.5 text-blue-700" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                                <span>Requery</span>
                              </button>
                            );
                          } else if (order.amount === 0 && (order.status === 'pending' || order.status === 'failed')) {
                            return (
                              <button
                                onClick={(e) => handleResendBonusFromOrder(e, order)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] rounded-lg transition-all cursor-pointer shadow-xs active:translate-y-[0.5px]"
                              >
                                🎁 Resend Bonus
                              </button>
                            );
                          } else {
                            return <span className="text-slate-300 font-medium">—</span>;
                          }
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BLOCK */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing page <strong className="text-slate-900 font-semibold">{currentPage}</strong> of <strong className="text-slate-900 font-semibold">{totalPages}</strong> ({totalItems} records total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                // Only show active page and close pages if there are many pages to prevent overflow
                if (totalPages > 6 && Math.abs(pageNum - currentPage) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                  return pageNum === 2 || pageNum === totalPages - 1 ? (
                    <span key={pageNum} className="text-xs text-slate-450 px-1 font-semibold select-none">...</span>
                  ) : null;
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      currentPage === pageNum 
                        ? 'bg-primary-blue text-white shadow-xs' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || isLoading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
