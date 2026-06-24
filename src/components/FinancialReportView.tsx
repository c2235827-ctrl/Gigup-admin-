import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Calendar, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowRight, 
  FileText, 
  Info,
  Gift
} from 'lucide-react';
import { fetchFinancialReport, retryPendingOrders } from '../services/api';
import { FinancialReport } from '../types';
import { formatNaira } from '../utils/formatters';

interface FinancialReportViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function FinancialReportView({ adminSecret, addToast }: FinancialReportViewProps) {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fromConfig, setFromConfig] = useState('');
  const [toConfig, setToConfig] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      const data = await fetchFinancialReport(
        adminSecret, 
        fromConfig || undefined, 
        toConfig || undefined
      );
      if (data.success) {
        setReport(data);
      } else {
        setError('Failed to fetch the financial report stats.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading report.');
      addToast('error', err.message || 'Failed to fetch financial report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [adminSecret]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReport();
  };

  const handleResetFilter = () => {
    setFromConfig('');
    setToConfig('');
    // Load report on next tick with cleared configs
    setTimeout(() => {
      loadReport();
    }, 0);
  };

  const handleRetryOrders = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const result = await retryPendingOrders(adminSecret);
      if (result.success) {
        const { fulfilled, still_pending, failed } = result.summary;
        addToast(
          'success', 
          `✅ ${fulfilled} fulfilled, ${still_pending} still pending, ${failed} failed`
        );
        // Refresh the report data immediately
        loadReport(true);
      } else {
        addToast('error', 'Failed to retry pending orders');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Connection lost retrying pending orders');
    } finally {
      setRetrying(false);
    }
  };

  const periodLabel = report?.period?.from === 'all-time' 
    ? 'All-time' 
    : `${report?.period?.from || '---'} to ${report?.period?.to || '---'}`;

  // Calculate percentage of welcome bonus already spent vs committed
  const bonusSpentPct = report?.welcome_bonus?.total_committed 
    ? Math.min(100, Math.max(0, (report.welcome_bonus.already_spent_on_orders / report.welcome_bonus.total_committed) * 100)) 
    : 0;

  const bonusStillInWalletsPct = report?.welcome_bonus?.total_committed 
    ? Math.min(100 - bonusSpentPct, Math.max(0, (report.welcome_bonus.still_in_wallets / report.welcome_bonus.total_committed) * 100)) 
    : 0;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="w-6 h-6 text-primary-blue" />
            Financial Report
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Period: <span className="font-semibold text-slate-700">{periodLabel}</span>
          </p>
        </div>

        {/* Date Filter Form */}
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold uppercase">From</span>
            <input 
              type="date" 
              value={fromConfig}
              onChange={(e) => setFromConfig(e.target.value)}
              className="bg-transparent text-sm text-slate-700 focus:outline-none"
              title="Start Date"
            />
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold uppercase">To</span>
            <input 
              type="date" 
              value={toConfig}
              onChange={(e) => setToConfig(e.target.value)}
              className="bg-transparent text-sm text-slate-700 focus:outline-none"
              title="End Date"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading || refreshing}
              className="px-4 py-2 bg-primary-blue hover:bg-blue-600 text-white font-medium text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-70"
            >
              Filter
            </button>
            {(fromConfig || toConfig) && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-sm rounded-xl transition-all cursor-pointer"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => loadReport(true)}
              disabled={loading || refreshing}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
              title="Refresh report data"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3">
          <Info className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-primary-blue animate-spin mb-3" />
          <p className="text-slate-500 font-medium">Computing financial intelligence metrics...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* ORDER STATS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Successful Orders */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Successful Orders</span>
                <span className="text-2xl font-bold text-slate-800 block mt-0.5">{report.orders.successful.count}</span>
                <span className="text-xs text-slate-500 font-semibold block mt-1">{formatNaira(report.orders.successful.total_amount)}</span>
              </div>
            </div>

            {/* Failed Orders */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-rose-50 rounded-xl text-rose-500">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Failed Orders</span>
                <span className="text-2xl font-bold text-slate-800 block mt-0.5">{report.orders.failed.count}</span>
                <span className="text-xs text-slate-500 font-semibold block mt-1">{formatNaira(report.orders.failed.total_value)}</span>
              </div>
            </div>

            {/* Pending Orders */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pending Orders</span>
                <span className="text-2xl font-bold text-slate-800 block mt-0.5">{report.orders.pending.count}</span>
                <span className="text-xs text-slate-500 font-semibold block mt-1">{formatNaira(report.orders.pending.total_amount_reserved)} reserved</span>
              </div>
            </div>

            {/* Queued for Retry */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Queued for Retry</span>
                <span className="text-2xl font-bold text-slate-800 block mt-0.5">{report.orders.queued_for_retry.count}</span>
                <span className="text-xs text-slate-500 font-semibold block mt-1">{formatNaira(report.orders.queued_for_retry.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* SMEData Funding Alert */}
          {report.orders.queued_for_retry.count > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-800">SMEData Funding Required</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    You have <span className="font-bold">{report.orders.queued_for_retry.count}</span> orders waiting for SMEData fulfillment. 
                    Fund your SMEData wallet with at least <span className="font-bold">{formatNaira(report.smedata_funding.recommended_topup)}</span>, then click "Retry Pending Orders" below to auto-fulfill all queued orders.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetryOrders}
                disabled={retrying}
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap disabled:opacity-70"
              >
                <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying...' : 'Retry Pending Orders'}
              </button>
            </div>
          )}

          {/* TWO COLUMN WORKSPACE: P&L & WELCOME BONUS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit & Loss Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <h3 className="font-bold text-slate-800">Profit & Loss Statement</h3>
                </div>
                
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center justify-between px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">
                      💰 Gross Revenue
                    </span>
                    <span className="font-bold text-slate-800">{formatNaira(report.financials.gross_revenue)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">
                      💸 Cashback Paid to Users
                    </span>
                    <span className="font-bold text-slate-500">− {formatNaira(report.financials.cashback_paid_to_users)}</span>
                  </div>

                  <div className="flex items-center justify-between px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">
                      🎁 Welcome Bonus Absorbed
                    </span>
                    <span className="font-bold text-slate-500">− {formatNaira(report.financials.welcome_bonus_absorbed)}</span>
                  </div>

                  <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50">
                    <span className="text-sm font-bold text-slate-700">
                      Total Expenses
                    </span>
                    <span className="font-bold text-slate-700">− {formatNaira(report.financials.total_expenses)}</span>
                  </div>

                  <div className="flex items-center justify-between px-6 py-5 bg-slate-50">
                    <span className="text-base font-bold text-slate-800">
                      Net Profit
                    </span>
                    <span className={`text-lg font-bold ${report.financials.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {report.financials.net_profit >= 0 ? '+' : ''}{formatNaira(report.financials.net_profit)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {/* Note line & Liabilities */}
                <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-3">
                  <p className="text-xs text-slate-500 italic">
                    * Refunds and failed orders are excluded — they are cancelled transactions, money stayed within GigUp wallets.
                  </p>
                  
                  {report.orders.pending.count > 0 && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        If all <strong>{report.orders.pending.count} pending orders</strong> are fulfilled: <strong>+{formatNaira(report.orders.pending.estimated_net_profit_if_fulfilled)}</strong> additional net profit (after <strong>{formatNaira(report.orders.pending.estimated_cashback_owed_on_fulfillment)}</strong> cashback owed).
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Welcome Bonus Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Gift className="w-5 h-5 text-pink-500" />
                  <h3 className="font-bold text-slate-800">🎁 Welcome Bonus Tracker</h3>
                </div>

                {/* Stat boxes (row) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Committed</span>
                    <span className="text-base font-bold text-slate-800 block mt-1">{formatNaira(report.welcome_bonus.total_committed)}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">{report.welcome_bonus.total_users} users × {formatNaira(report.welcome_bonus.per_user_amount)}</span>
                  </div>

                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Already Spent</span>
                    <span className="text-base font-bold text-emerald-700 block mt-1">{formatNaira(report.welcome_bonus.already_spent_on_orders)}</span>
                    <span className="text-[10px] text-emerald-600 mt-0.5 block">Absorbed by GigUp</span>
                  </div>

                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Still in Wallets</span>
                    <span className="text-base font-bold text-amber-700 block mt-1">{formatNaira(report.welcome_bonus.still_in_wallets)}</span>
                    <span className="text-[10px] text-amber-600 mt-0.5 block">Future liability</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2 pt-2">
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${bonusSpentPct}%` }}
                      title={`Spent: ${bonusSpentPct.toFixed(1)}%`}
                    />
                    <div 
                      className="bg-amber-400 h-full" 
                      style={{ width: `${bonusStillInWalletsPct}%` }}
                      title={`Liability: ${bonusStillInWalletsPct.toFixed(1)}%`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>{formatNaira(report.welcome_bonus.already_spent_on_orders)} spent</span>
                    <span>{formatNaira(report.welcome_bonus.total_committed)} committed</span>
                  </div>
                </div>

                {/* User Breakdown */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">User Breakdown</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {report.welcome_bonus.breakdown.users_fully_spent} users fully spent
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {report.welcome_bonus.breakdown.users_partially_used} users partially used
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      {report.welcome_bonus.breakdown.users_full_unused} users untouched
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 pt-4 border-t border-slate-100 leading-relaxed">
                ℹ️ <strong>'Still in wallets'</strong> ({formatNaira(report.welcome_bonus.still_in_wallets)}) represents GigUp's active future liability — this becomes an actual expense only as users complete data purchases using their signup balance.
              </div>
            </div>
          </div>

          {/* Section 5 — Cancelled Transactions */}
          <div className="bg-slate-100/80 rounded-2xl p-5 border border-slate-200/50 shadow-sm flex gap-4">
            <div className="p-2.5 bg-white text-slate-500 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center border border-slate-200 shadow-xs">
              <Info className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h4 className="font-bold text-slate-700">Cancelled Transactions (Failed Orders)</h4>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                An amount of <span className="font-semibold text-slate-700">{formatNaira(report.orders.failed.total_value)}</span> across <span className="font-semibold text-slate-700">{report.orders.failed.count} failed orders</span> was cancelled and immediately returned to users' GigUp wallet balances. These do not count as gross/net revenue and do not constitute a financial loss — the funds never left the platform's financial ledger.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center shadow-sm">
          <p className="text-slate-500">No report metrics loaded. Try clicking the Refresh button.</p>
        </div>
      )}
    </div>
  );
}
