import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart2, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Gift, 
  Coins, 
  Info, 
  ShieldAlert, 
  ArrowRight
} from 'lucide-react';
import { fetchFinancialSummary, retryPendingOrders } from '../services/api';
import { FinancialSummary } from '../types';
import { formatNaira } from '../utils/formatters';

interface FinancialReportViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function FinancialReportView({ adminSecret, addToast }: FinancialReportViewProps) {
  const [data, setData] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // Call endpoint fresh on every load, revisit, or refresh
      const result = await fetchFinancialSummary(adminSecret);
      if (result) {
        setData(result);
        setLastUpdated(new Date());
      } else {
        addToast('error', 'Failed to load financial summary data');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Error occurred loading financial summary');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // On page load, and auto-refresh every 60 seconds
  useEffect(() => {
    load();
    const interval = setInterval(() => {
      load(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [adminSecret]);

  const handleRetryOrders = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      const result = await retryPendingOrders(adminSecret);
      if (result.success) {
        const { total, fulfilled, still_pending, failed } = result.summary;
        addToast(
          'success', 
          `Processed: ${fulfilled} fulfilled, ${still_pending} still pending, ${failed} failed (out of ${total} total)`
        );
        load();
      } else {
        addToast('error', 'Failed to retry pending orders');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Error occurred retrying pending orders');
    } finally {
      setIsRetrying(false);
    }
  };

  if (!data && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary-blue animate-spin" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading live financial ledger...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center max-w-md mx-auto space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mx-auto shadow-sm animate-bounce">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Failed to Connect</h2>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            We were unable to load the financial data. Please verify your admin secret credentials and connection.
          </p>
        </div>
        <button
          onClick={() => load()}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-blue hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry Connection
        </button>
      </div>
    );
  }

  const orders = {
    successful: {
      count: data?.orders?.successful?.count ?? 0,
      revenue: data?.orders?.successful?.revenue ?? 0,
      label: data?.orders?.successful?.label ?? ''
    },
    pending: {
      count: data?.orders?.pending?.count ?? 0,
      revenue: data?.orders?.pending?.revenue ?? 0
    },
    failed: {
      count: data?.orders?.failed?.count ?? 0,
      total_value: data?.orders?.failed?.total_value ?? 0,
      label: data?.orders?.failed?.label ?? ''
    },
    total: data?.orders?.total ?? 0
  };

  const cashback = {
    paid_on_successful_orders: data?.cashback?.paid_on_successful_orders ?? 0,
    owed_on_pending_orders: data?.cashback?.owed_on_pending_orders ?? 0
  };

  const smedata = {
    cost_of_successful_orders: data?.smedata?.cost_of_successful_orders ?? 0,
    funding_needed_for_pending: data?.smedata?.funding_needed_for_pending ?? 0,
    recommendation: data?.smedata?.recommendation ?? ''
  };

  const expenses = {
    cashback_paid: {
      total: data?.expenses?.cashback_paid?.total ?? 0,
      count: data?.expenses?.cashback_paid?.count ?? 0
    },
    referral_rewards: {
      total: data?.expenses?.referral_rewards?.total ?? 0,
      count: data?.expenses?.referral_rewards?.count ?? 0
    },
    streak_rewards: {
      total: data?.expenses?.streak_rewards?.total ?? 0,
      count: data?.expenses?.streak_rewards?.count ?? 0
    },
    recovery_bonuses: {
      total: data?.expenses?.recovery_bonuses?.total ?? 0,
      count: data?.expenses?.recovery_bonuses?.count ?? 0
    },
    welcome_vouchers_used: {
      total: data?.expenses?.welcome_vouchers_used?.total ?? 0,
      count: data?.expenses?.welcome_vouchers_used?.count ?? 0
    },
    total_real_expenses: data?.expenses?.total_real_expenses ?? 0
  };

  const liabilities = {
    welcome_bonuses_issued: {
      total: data?.liabilities?.welcome_bonuses_issued?.total ?? 0,
      count: data?.liabilities?.welcome_bonuses_issued?.count ?? 0,
      note: data?.liabilities?.welcome_bonuses_issued?.note ?? ''
    }
  };

  const profit = {
    gross_revenue: data?.profit?.gross_revenue ?? 0,
    smedata_cost: data?.profit?.smedata_cost ?? 0,
    gross_profit: data?.profit?.gross_profit ?? 0,
    total_real_expenses: data?.profit?.total_real_expenses ?? 0,
    net_profit: data?.profit?.net_profit ?? 0,
    net_profit_margin_pct: data?.profit?.net_profit_margin_pct ?? 0,
    summary: data?.profit?.summary ?? ''
  };

  const pending_orders_detail = data?.pending_orders_detail ?? [];

  const isProfit = profit.net_profit >= 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-blue-50 text-primary-blue rounded-xl flex items-center justify-center shadow-sm">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">Financial Analytics & Summary</h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Live Ledger {lastUpdated ? `• Updated: ${lastUpdated.toLocaleTimeString()}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => load()} 
          disabled={isLoading}
          className="px-4 py-2 text-xs font-bold rounded-xl border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Manual Refresh
        </button>
      </div>

      {/* SMEDATA FUNDING REQUIRED ALERT */}
      {smedata.funding_needed_for_pending > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm"
        >
          <div className="flex gap-3 items-start">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-amber-800 text-sm mb-1">
                ⚠️ SMEData Funding Required
              </h3>
              <p className="text-xs text-amber-700 leading-relaxed max-w-2xl">
                {smedata.recommendation}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-4 text-xs font-semibold text-amber-900">
                <span>Pending Count: <strong className="font-mono text-sm">{orders.pending.count}</strong></span>
                <span>•</span>
                <span>Value: <strong className="font-mono text-sm">{formatNaira(orders.pending.revenue)}</strong></span>
                <span>•</span>
                <span>Funding Needed: <strong className="font-mono text-sm text-red-600">{formatNaira(smedata.funding_needed_for_pending)}</strong></span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleRetryOrders} 
            disabled={isRetrying}
            className="w-full md:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Processing...' : 'Retry Pending Orders'}
          </button>
        </motion.div>
      )}

      {/* MAIN PL LEDGER HEADER SUMMARY */}
      <div className={`rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md transition-colors ${isProfit ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white' : 'bg-gradient-to-br from-rose-600 to-red-700 text-white'}`}>
        <div className="space-y-2">
          <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Net Profit Ledger Summary</p>
          <p className="text-4xl lg:text-5xl font-black font-mono tracking-tight">
            {isProfit ? '' : '−'}{formatNaira(Math.abs(profit.net_profit))}
          </p>
          <p className="text-white/90 text-sm font-medium leading-relaxed max-w-xl">
            {profit.summary}
          </p>
        </div>
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t border-white/10 md:border-t-0 pt-4 md:pt-0 shrink-0">
          <div className="flex items-center gap-2">
            {isProfit ? <TrendingUp className="w-8 h-8 opacity-90" /> : <TrendingDown className="w-8 h-8 opacity-90" />}
            <span className="text-3xl font-black font-mono">{profit.net_profit_margin_pct}%</span>
          </div>
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mt-1">Net Profit Margin</p>
        </div>
      </div>

      {/* THREE COLUMN OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Coins className="w-5 h-5" />
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase">Revenue</span>
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 mt-2">{formatNaira(orders.successful.revenue)}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Total revenue from successful sales</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-semibold text-slate-600 flex justify-between">
            <span>Successful Orders:</span>
            <span className="font-mono text-slate-950 font-bold">{orders.successful.count}</span>
          </div>
        </div>

        {/* Total SMEData Cost */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-blue-50 text-primary-blue rounded-xl">
                <BarChart2 className="w-5 h-5" />
              </span>
              <span className="text-[10px] bg-blue-50 text-primary-blue font-bold px-2 py-0.5 rounded-full uppercase">SME Cost</span>
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 mt-2">{formatNaira(profit.smedata_cost)}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Wholesale bandwidth cost incurred</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-semibold text-slate-600 flex justify-between">
            <span>Cost of successful:</span>
            <span className="font-mono text-slate-950 font-bold">{formatNaira(smedata.cost_of_successful_orders)}</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase">Gross Profit</span>
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 mt-2">{formatNaira(profit.gross_profit)}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Revenue minus wholesale cost</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-semibold text-slate-600 flex justify-between">
            <span>Gross margin:</span>
            <span className="font-mono text-indigo-600 font-bold">
              {profit.gross_revenue > 0 ? `${((profit.gross_profit / profit.gross_revenue) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: P&L AND EXPENSES BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit & Loss Statement */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Profit & Loss (P&L) Statement</h2>
          </div>
          <div className="overflow-hidden border border-slate-100 rounded-xl divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line Item</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</span>
            </div>

            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-slate-700 text-xs font-medium">💰 Gross Revenue</span>
              <span className="font-mono font-bold text-sm text-slate-900">{formatNaira(profit.gross_revenue)}</span>
            </div>

            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-slate-700 text-xs font-medium">📉 SMEData Wholesale Cost</span>
              <span className="font-mono font-bold text-sm text-rose-600">− {formatNaira(profit.smedata_cost)}</span>
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/30">
              <span className="text-slate-900 text-xs font-bold">📊 Gross Profit</span>
              <span className="font-mono font-extrabold text-sm text-emerald-600">{formatNaira(profit.gross_profit)}</span>
            </div>

            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-slate-700 text-xs font-medium">💸 Total Real Expenses</span>
              <span className="font-mono font-bold text-sm text-rose-600">− {formatNaira(profit.total_real_expenses)}</span>
            </div>

            <div className={`flex items-center justify-between px-5 py-4 ${isProfit ? 'bg-emerald-50/30' : 'bg-rose-50/30'}`}>
              <span className="text-slate-950 text-sm font-black uppercase tracking-wider">Net Profit</span>
              <span className={`font-mono font-black text-base ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isProfit ? '' : '−'}{formatNaira(Math.abs(profit.net_profit))}
              </span>
            </div>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Expenses Breakdown</h2>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">All Deductions</span>
          </div>
          <div className="overflow-hidden border border-slate-100 rounded-xl divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Benefit & Program Category</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Count & Value</span>
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Cashback Paid</p>
                <p className="text-[9px] text-slate-400 font-bold font-mono uppercase mt-0.5">{expenses.cashback_paid.count} transactions</p>
              </div>
              <span className="font-mono font-bold text-sm text-rose-600">− {formatNaira(expenses.cashback_paid.total)}</span>
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Referral Rewards</p>
                <p className="text-[9px] text-slate-400 font-bold font-mono uppercase mt-0.5">{expenses.referral_rewards.count} transactions</p>
              </div>
              <span className="font-mono font-bold text-sm text-rose-600">− {formatNaira(expenses.referral_rewards.total)}</span>
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Streak Rewards</p>
                <p className="text-[9px] text-slate-400 font-bold font-mono uppercase mt-0.5">{expenses.streak_rewards.count} transactions</p>
              </div>
              <span className="font-mono font-bold text-sm text-rose-600">− {formatNaira(expenses.streak_rewards.total)}</span>
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Recovery Bonuses</p>
                <p className="text-[9px] text-slate-400 font-bold font-mono uppercase mt-0.5">{expenses.recovery_bonuses.count} transactions</p>
              </div>
              <span className="font-mono font-bold text-sm text-rose-600">− {formatNaira(expenses.recovery_bonuses.total)}</span>
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Welcome Vouchers Used</p>
                <p className="text-[9px] text-slate-400 font-bold font-mono uppercase mt-0.5">{expenses.welcome_vouchers_used.count} transactions</p>
              </div>
              <span className="font-mono font-bold text-sm text-rose-600">− {formatNaira(expenses.welcome_vouchers_used.total)}</span>
            </div>

            <div className="flex items-center justify-between px-5 py-4 bg-rose-50/20">
              <span className="text-xs font-black text-rose-950 uppercase">Total Real Expenses</span>
              <span className="font-mono font-black text-base text-rose-700">− {formatNaira(expenses.total_real_expenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ADDITIONAL FINANCIAL INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Liabilities Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Liabilities & Vouchers</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Welcome Bonuses Issued:</span>
              <span className="font-mono font-bold text-slate-900">{formatNaira(liabilities.welcome_bonuses_issued.total)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Bonus Accounts Opened:</span>
              <span className="font-mono font-bold text-slate-900">{liabilities.welcome_bonuses_issued.count} accounts</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal italic">
              * Note: {liabilities.welcome_bonuses_issued.note}
            </p>
          </div>
        </div>

        {/* Cashback Reserves */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Cashback Outstanding</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Paid on Successful Orders:</span>
              <span className="font-mono font-bold text-emerald-600">{formatNaira(cashback.paid_on_successful_orders)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Owed on Pending Orders:</span>
              <span className="font-mono font-bold text-amber-600">{formatNaira(cashback.owed_on_pending_orders)}</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal italic">
              * Outstanding cashback must be factored into future liquidity reserves.
            </p>
          </div>
        </div>
      </div>

      {/* DISJOINTED VOLUMES: REFUNDS & RESERVED */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Failed Orders (Refunded) */}
        <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="p-2.5 bg-white text-rose-500 border border-rose-100 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Failed / Cancelled (Refunded Vol)</h3>
            <p className="text-2xl font-black font-mono text-rose-700 mt-1">{formatNaira(orders.failed.total_value)}</p>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              <strong>{orders.failed.count} orders</strong> were failed or cancelled. These funds were automatically refunded and returned to the users' internal balances. They are <strong>NOT counted as loss or revenue</strong>.
            </p>
            {orders.failed.label && (
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Status: {orders.failed.label}</p>
            )}
          </div>
        </div>

        {/* Pending Orders (Reserved) */}
        <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="p-2.5 bg-white text-amber-500 border border-amber-100 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Pending Orders (Reserved)</h3>
            <p className="text-2xl font-black font-mono text-amber-700 mt-1">{formatNaira(orders.pending.revenue)}</p>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              <strong>{orders.pending.count} orders</strong> are currently awaiting provider wallet topups. These funds are temporarily locked inside users' wallets as reserved capital until retry processing.
            </p>
          </div>
        </div>
      </div>

      {/* PENDING ORDERS DETAIL TABLE */}
      {pending_orders_detail && pending_orders_detail.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">
              Awaiting Provider Wallet Funding ({pending_orders_detail.length})
            </h2>
            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse">Low Balance</span>
          </div>
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Network</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending_orders_detail.map((order) => (
                  <tr key={order.id} className="hover:bg-amber-50/10 transition">
                    <td className="px-4 py-3 font-mono text-slate-700">{order.recipient_phone}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{order.plan_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-primary-blue border border-blue-100">{order.network}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{formatNaira(order.amount)}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-amber-600 text-[10px] font-medium">{order.failure_reason ?? 'Provider Low Balance'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
