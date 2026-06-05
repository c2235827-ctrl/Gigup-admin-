import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  UserPlus, 
  Wallet, 
  Award, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check, 
  X, 
  Phone,
  Hash,
  ShoppingBag,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { User, Order } from '../types';
import { fetchUsers, fetchOrders, resendSignupBonus, manualWalletCredit } from '../services/api';
import { formatNaira, formatDateTime, formatDateOnly, getInitials } from '../utils/formatters';
import { addAuditLog } from '../utils/auditLogger';

interface UsersViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function UsersView({ adminSecret, addToast }: UsersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limitPerPage] = useState(15);
  const [isLoading, setIsLoading] = useState(false);

  // Selected User Modal Detail State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Robust function to resolve the correct order count from potential Supabase returns
  const resolveOrderCount = (u: any): number => {
    if (!u) return 0;

    const parseVal = (val: any): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    // 1. Check direct keys representing order counts (e.g. from backend/database)
    const directKeys = [
      'total_orders', 'totalOrders', 
      'orders_count', 'ordersCount', 
      'order_count', 'orderCount', 
      'orders_total', 'ordersTotal'
    ];
    for (const key of directKeys) {
      const parsed = parseVal(u[key]);
      if (parsed !== null) return parsed;
    }

    // 2. Check "orders" field as direct count value or array or nested object
    if (u.orders !== undefined && u.orders !== null) {
      const directOrdersVal = parseVal(u.orders);
      if (directOrdersVal !== null) return directOrdersVal;

      if (Array.isArray(u.orders)) {
        if (u.orders.length > 0 && u.orders[0]) {
          const nestedCount = parseVal(u.orders[0].count);
          if (nestedCount !== null) return nestedCount;
        }
        return u.orders.length;
      }

      if (typeof u.orders === 'object') {
        const nestedCount = parseVal(u.orders.count);
        if (nestedCount !== null) return nestedCount;
        
        if (u.orders.aggregate) {
          const aggCount = parseVal(u.orders.aggregate.count);
          if (aggCount !== null) return aggCount;
        }
      }
    }

    // 3. Check "_count" nested structure commonly returned by Prisma or other ORMs
    if (u._count && typeof u._count === 'object') {
      const countOrders = parseVal(u._count.orders);
      if (countOrders !== null) return countOrders;

      const countOrder = parseVal(u._count.order);
      if (countOrder !== null) return countOrder;
    }

    return 0;
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetchUsers(adminSecret, currentPage, limitPerPage, searchQuery);
      setUsers(response.users || []);
      if (response.users && response.users.length > 0) {
        console.log('DEBUG: First user payload in list:', response.users[0]);
      }
      if (response.pagination) {
        setTotalPages(response.pagination.pages || 1);
        setTotalItems(response.pagination.total || 0);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Error occurred loading the users list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchQuery]);

  // Real-time automatic search debounce to look up speedier
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(searchTerm.trim());
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchTerm.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const [resendingBonus, setResendingBonus] = useState<string | null>(null);

  const handleResendBonus = async (userId: string, userName: string) => {
    if (!confirm(`Resend welcome data bonus to ${userName}?`)) return;
    setResendingBonus(userId);
    try {
      const result = await resendSignupBonus(adminSecret, userId);
      if (result.success && result.status === 'sent') {
        addToast('success', result.message || `✅ Bonus sent to ${userName}`);
        addAuditLog('user', 'resend_signup_bonus', `Successfully resent 1GB welcome data bonus to user "${userName}" (ID: ${userId})`, 'success');
      } else {
        addToast('error', result.message || '❌ Failed — check SMEDATA balance');
        addAuditLog('user', 'resend_signup_bonus', `Failed to send 1GB welcome data bonus to user "${userName}" (ID: ${userId}): ${result.message}`, 'failed');
      }
      await loadUsers(); // refresh list
      setSelectedUser(prev => prev && prev.id === userId ? { ...prev, signup_bonus_claimed: true } : prev);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to resend bonus');
      addAuditLog('user', 'resend_signup_bonus', `Error trying to resend welcome bonus to user "${userName}": ${err.message || err}`, 'failed');
    } finally {
      setResendingBonus(null);
    }
  };

  const handleManualCredit = async (userId: string, userName: string) => {
    const amountStr = prompt(`Enter amount to credit to ${userName}'s wallet (₦):`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      addToast('error', 'Invalid amount');
      return;
    }
    const reference = prompt('Enter payment reference (optional):') || `manual-${Date.now()}`;
    if (!confirm(`Credit ₦${amount.toLocaleString()} to ${userName}?`)) return;
    try {
      await manualWalletCredit(adminSecret, userId, amount, reference);
      addToast('success', `✅ ₦${amount.toLocaleString()} credited to ${userName}`);
      addAuditLog('user', 'manual_wallet_credit', `Manually credited ₦${amount.toLocaleString()} to user "${userName}" wallet balance. Ref: ${reference}`, 'success');
      await loadUsers();
      setSelectedUser(prev => prev && prev.id === userId ? { ...prev, wallet_balance: prev.wallet_balance + amount } : prev);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to credit wallet');
      addAuditLog('user', 'manual_wallet_credit', `Failed to manually credit user "${userName}"'s wallet: ${err.message || err}`, 'failed');
    }
  };

  // Open detailing modal and request their history
  const handleOpenDetailModal = async (user: User) => {
    setSelectedUser(user);
    setIsLoadingOrders(true);
    try {
      // Query past orders related to this user by phone search
      const res = await fetchOrders(adminSecret, 1, 5, 'all', 'all', user.phone);
      setUserOrders(res.orders || []);
    } catch (err) {
      console.warn('Failed to load selected user orders list:', err);
      setUserOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleCopyReferral = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    addToast('success', 'Referral code copied to clipboard');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          VTU Client Management
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Explore registered user profiles, verify active ledger wallet balances, and audit referral streams.
        </p>
      </div>

      {/* SEARCH BAR BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-105 shadow-geometric flex flex-col sm:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="w-full flex-1 flex gap-2">
          <div className="relative flex-1 rounded-xl shadow-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or phone number..."
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-450 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 focus:border-primary-blue transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary-blue hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-primary-blue/10 transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            Search
          </button>
          {(searchTerm || searchQuery) && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer shrink-0"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* DATA BOX TABLE */}
      <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Wallet</th>
                <th className="px-6 py-4 text-right">Cashback</th>
                <th className="px-6 py-4 text-center">Orders</th>
                <th className="px-6 py-4 text-right">Spent</th>
                <th className="px-6 py-4 text-center">Bonus</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F8] text-xs">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-8 h-8 rounded-full bg-slate-100" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-8 mx-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-slate-100 rounded-full w-16 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-7 bg-slate-100 rounded-lg w-16 mx-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    No active clients matched your search query. Try typing another term.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 select-none">
                        {getInitials(user.full_name)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {user.full_name}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-600">
                      {user.phone}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-success font-mono">
                        {formatNaira(user.wallet_balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-amber-500 font-mono">
                        {formatNaira(user.cashback_balance || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold font-mono text-emerald-600">
                      {user.successful_orders ?? 0}/{user.total_orders ?? resolveOrderCount(user)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold font-mono text-slate-805">
                      {formatNaira(user.total_spent || 0)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.signup_bonus_claimed 
                          ? 'bg-[#DCFCE7] text-[#22C55E]' 
                          : 'bg-[#FEF3C7] text-[#F59E0B]'
                      }`}>
                        {user.signup_bonus_claimed ? 'Claimed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {formatDateOnly(user.created_at)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenDetailModal(user)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-[11px] rounded-lg transition-all cursor-pointer shadow-xs active:translate-y-[0.5px]"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROL ROW */}
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
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
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
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ANIME PRESENCE MODAL FOR DETAILS */}
      <AnimatePresence>
        {selectedUser && (
          <div id="user-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* BLACKOUT BACKSTAGE */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* MODAL SHEET */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', duration: 0.3 } }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full z-10 overflow-hidden relative"
            >
              {/* HEADER TITLE */}
              <div className="bg-primary-dark text-white p-6 flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-base select-none border border-white/20">
                    {getInitials(selectedUser.full_name)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">{selectedUser.full_name}</h2>
                    <p className="text-xs text-slate-330 mt-1 font-mono">{selectedUser.phone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CORE CARD DETAILS */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* BALANCE */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Ledger Balance
                    </span>
                    <span className="text-lg font-bold text-success font-mono">{formatNaira(selectedUser.wallet_balance)}</span>
                  </div>

                  {/* REF CODE */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Referral Code
                      </span>
                      <span className="text-sm font-semibold text-slate-800 font-mono">
                        {selectedUser.referral_code || '---'}
                      </span>
                    </div>
                    {selectedUser.referral_code && (
                      <button
                        onClick={() => handleCopyReferral(selectedUser.referral_code)}
                        className="mt-2 text-[10px] font-semibold text-primary-blue hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Copied' : 'Copy referral'}</span>
                      </button>
                    )}
                  </div>

                  {/* JOINED TIMESTAMP */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Member Since
                    </span>
                    <span className="text-xs font-semibold text-slate-800 font-mono block">
                      {formatDateOnly(selectedUser.created_at)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Daily statistics updated
                    </span>
                  </div>
                </div>

                {/* ADDITIONAL ACCOUNT PURCHASE STATS */}
                <div className="p-4 rounded-xl bg-[#FAFBFF] border border-slate-205 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                      Total Orders Placed:
                    </span>
                    <span className="text-sm font-bold text-slate-800 font-mono">
                      {selectedUser.total_orders ?? resolveOrderCount(selectedUser)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                      Successful Orders:
                    </span>
                    <span className="text-sm font-bold text-emerald-600 font-mono">
                      {selectedUser.successful_orders ?? 0}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                      Total Amount Spent:
                    </span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {formatNaira(selectedUser.total_spent || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                      Cashback Balance:
                    </span>
                    <span className="text-sm font-bold text-amber-600 font-mono">
                      {formatNaira(selectedUser.cashback_balance || 0)}
                    </span>
                  </div>
                </div>

                {/* PAST HISTORY ROW */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Recent Five Transactions
                  </h4>
                  <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-xs">
                    {isLoadingOrders ? (
                      <div className="py-8 text-center flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-primary-blue" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-xs text-slate-400 font-medium">Looking up transaction logs...</span>
                      </div>
                    ) : userOrders.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        This client hasn't placed any VTU orders.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-4 py-2">recipient</th>
                            <th className="px-4 py-2">Plan Details</th>
                            <th className="px-4 py-2 text-right">cost</th>
                            <th className="px-4 py-2">status</th>
                            <th className="px-4 py-2">date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {userOrders.map((ord) => (
                            <tr key={ord.id}>
                              <td className="px-4 py-2.5 font-mono text-slate-700">{ord.recipient_phone}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center text-[8px] font-bold px-1 rounded mr-1 ${
                                  ord.network === 'MTN' ? 'bg-amber-100 text-amber-600' :
                                  ord.network === 'GLO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                                }`}>
                                  {ord.network}
                                </span>
                                <span className="font-semibold text-slate-800">{ord.plan_name}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold font-mono text-slate-900">{formatNaira(ord.amount)}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                  ord.status === 'success' ? 'bg-green-100 text-success' :
                                  ord.status === 'failed' ? 'bg-red-100 text-danger' : 'bg-purple-100 text-pending'
                                }`}>
                                  {ord.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-450 font-mono text-[10px] whitespace-nowrap">{formatDateTime(ord.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Resend Bonus Button */}
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #F3F4F6'
                }}>
                  <p style={{ fontSize: '12px', color: '#8A96A3', marginBottom: '8px' }}>
                    Signup Bonus: {selectedUser.signup_bonus_claimed ? '✅ Claimed' : '⏳ Pending'}
                  </p>
                  <button
                    onClick={() => handleResendBonus(selectedUser.id, selectedUser.full_name)}
                    disabled={resendingBonus === selectedUser.id}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: resendingBonus === selectedUser.id ? '#E5E7EB' : '#0D1F3D',
                      color: resendingBonus === selectedUser.id ? '#9CA3AF' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: resendingBonus === selectedUser.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {resendingBonus === selectedUser.id ? '⏳ Sending...' : '🎁 Resend Welcome Bonus'}
                  </button>
                </div>

                {/* Manual Wallet Credit */}
                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => handleManualCredit(selectedUser.id, selectedUser.full_name)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'transparent',
                      color: '#22C55E',
                      border: '1.5px solid #22C55E',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    💰 Manual Wallet Credit
                  </button>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
