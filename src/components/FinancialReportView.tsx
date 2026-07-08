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
  ShieldAlert, 
  ArrowRight,
  CreditCard,
  Percent,
  Layers,
  Database
} from 'lucide-react';
import { 
  fetchFinancialSummary, 
  retryPendingOrders, 
  fetchRechargeCardOverview, 
  fetchRechargeCardSpendBreakdown 
} from '../services/api';
import { 
  FinancialSummary, 
  RechargeCardOverview, 
  DenominationBreakdownItem 
} from '../types';
import { formatNaira } from '../utils/formatters';

interface FinancialReportViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  setActiveTab?: (tab: any) => void;
}

export default function FinancialReportView({ adminSecret, addToast, setActiveTab }: FinancialReportViewProps) {
  const [data, setData] = useState<FinancialSummary | null>(null);
  const [rechargeOverview, setRechargeOverview] = useState<RechargeCardOverview | null>(null);
  const [spendBreakdown, setSpendBreakdown] = useState<DenominationBreakdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [financialResult, rechargeResult, breakdownResult] = await Promise.all([
        fetchFinancialSummary(adminSecret).catch(err => {
          console.error("Failed to load financial summary:", err);
          return null;
        }),
        fetchRechargeCardOverview(adminSecret).catch(err => {
          console.error("Failed to load recharge cards overview:", err);
          return null;
        }),
        fetchRechargeCardSpendBreakdown(adminSecret).catch(err => {
          console.error("Failed to load recharge cards spend breakdown:", err);
          return [];
        })
      ]);

      if (financialResult) {
        setData(financialResult);
        setLastUpdated(new Date());
      } else if (!silent) {
        addToast('error', 'Failed to load core financial summary data');
      }

      if (rechargeResult) {
        setRechargeOverview(rechargeResult);
      }

      if (breakdownResult) {
        setSpendBreakdown(breakdownResult);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Error occurred loading financial ledger');
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

  const rechargeCards = data?.recharge_cards ?? {
    successful_orders: rechargeOverview?.stats?.active_subscriptions ?? 0,
    under_review_orders: rechargeOverview?.stats?.failed_or_review_orders ?? 0,
    processing_orders: 0,
    revenue: 0,
    peyflex_cost: 0,
    card_markup_profit: rechargeOverview?.stats?.total_card_markup_profit ?? 0,
    subscription_revenue: rechargeOverview?.stats?.total_subscription_revenue ?? 0,
    total_profit: rechargeOverview?.stats?.total_combined_profit ?? 0
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
    combined_gross_revenue: data?.profit?.combined_gross_revenue,
    combined_net_profit: data?.profit?.combined_net_profit,
    combined_net_profit_margin_pct: data?.profit?.combined_net_profit_margin_pct,
    summary: data?.profit?.summary ?? ''
  };

  const pending_orders_detail = data?.pending_orders_detail ?? [];

  // Safely calculate combined bottom-lines if fields are missing in legacy endpoints
  const combinedNetProfit = profit.combined_net_profit ?? (profit.net_profit + rechargeCards.total_profit);
  const combinedGrossRevenue = profit.combined_gross_revenue ?? (profit.gross_revenue + rechargeCards.revenue + rechargeCards.subscription_revenue);
  const combinedMarginPct = profit.combined_net_profit_margin_pct ?? (combinedGrossRevenue > 0 ? Number(((combinedNetProfit / combinedGrossRevenue) * 100).toFixed(1)) : 0);
  const isCombinedProfitPositive = combinedNetProfit >= 0;

  // Recharge card order items in reconciliation
  const rechargeUnresolved = rechargeOverview?.unresolved_reconciliation ?? [];
  const rechargePendingReview = rechargeOverview?.recent_orders.filter(o => o.status === 'pending_review' || o.status === 'under_review') || [];

  // Sort denomination breakdown: Network alphabetically, then face value ascending
  const sortedBreakdown = [...spendBreakdown].sort((a, b) => {
    const netCompare = a.network.localeCompare(b.network);
    if (netCompare !== 0) return netCompare;
    return a.face_value - b.face_value;
  });

  const getNetworkBadge = (network: string) => {
    const name = network.toUpperCase();
    if (name.includes('MTN')) return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    if (name.includes('AIRTEL')) return 'bg-red-50 text-red-800 border-red-200';
    if (name.includes('GLO')) return 'bg-green-50 text-green-800 border-green-200';
    return 'bg-blue-50 text-blue-800 border-blue-200';
  };

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">Financial Ledger & Revenue</h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Live Combined Audit {lastUpdated ? `• Updated: ${lastUpdated.toLocaleTimeString()}` : ''}
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
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Sync Ledger
        </button>
      </div>

      {/* 1. TOP-LEVEL "COMBINED BUSINESS PROFIT" CARD */}
      <div className={`rounded-3xl p-6 lg:p-8 text-white shadow-lg transition-all relative overflow-hidden ${isCombinedProfitPositive ? 'bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600' : 'bg-gradient-to-br from-red-700 via-rose-700 to-amber-600'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4">
            <div>
              <span className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white/90">
                ⭐ Combined Business Profit
              </span>
              <p className="text-4xl lg:text-5xl font-black font-mono tracking-tight mt-2.5">
                {isCombinedProfitPositive ? '' : '−'}{formatNaira(Math.abs(combinedNetProfit))}
              </p>
              <p className="text-white/80 text-xs mt-1 font-medium italic">
                Data Plans & Recharge Cards combined total profit margin
              </p>
            </div>

            {/* Split breakdown Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-md pt-2 border-t border-white/10">
              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <p className="text-[9px] uppercase tracking-wider text-white/60">Data Plans Net Profit</p>
                <p className="text-sm font-bold font-mono mt-0.5">{formatNaira(profit.net_profit)}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <p className="text-[9px] uppercase tracking-wider text-white/60">Recharge Cards Profit</p>
                <p className="text-sm font-bold font-mono mt-0.5">{formatNaira(rechargeCards.total_profit)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0 shrink-0">
            <div className="flex items-center gap-2">
              {isCombinedProfitPositive ? <TrendingUp className="w-8 h-8 opacity-90 text-emerald-300" /> : <TrendingDown className="w-8 h-8 opacity-90 text-amber-300" />}
              <span className="text-3xl lg:text-4xl font-black font-mono">{combinedMarginPct}%</span>
            </div>
            <p className="text-white/70 text-[9px] font-black uppercase tracking-widest mt-1">Combined Profit Margin</p>
            
            <div className="text-[10px] text-white/50 font-semibold font-mono mt-2 bg-black/15 px-2.5 py-1 rounded-full border border-white/5">
              Gross Rev: {formatNaira(combinedGrossRevenue)}
            </div>
          </div>
        </div>

        {profit.summary && (
          <div className="mt-5 pt-4 border-t border-white/10 text-xs text-white/90 leading-relaxed font-medium">
            📝 {profit.summary}
          </div>
        )}
      </div>

      {/* 2. DATA PLANS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-l-4 border-primary-blue pl-3">
          <Database className="w-5 h-5 text-primary-blue" />
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Data Plans Segment</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Revenue */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm hover:border-slate-200 transition">
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

          {/* Total Provider Cost */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm hover:border-slate-200 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 bg-blue-50 text-primary-blue rounded-xl">
                  <BarChart2 className="w-5 h-5" />
                </span>
                <span className="text-[10px] bg-blue-50 text-primary-blue font-bold px-2 py-0.5 rounded-full uppercase">Provider Cost</span>
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
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm hover:border-slate-200 transition">
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
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Data Plan Profit & Loss</h2>
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
                <span className="text-slate-700 text-xs font-medium">📉 Provider Wholesale Cost</span>
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

              <div className={`flex items-center justify-between px-5 py-4 ${profit.net_profit >= 0 ? 'bg-emerald-50/30' : 'bg-rose-50/30'}`}>
                <span className="text-slate-950 text-sm font-black uppercase tracking-wider">Data Net Profit</span>
                <span className={`font-mono font-black text-base ${profit.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {profit.net_profit >= 0 ? '' : '−'}{formatNaira(Math.abs(profit.net_profit))}
                </span>
              </div>
            </div>
          </div>

          {/* Expenses Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Expenses Breakdown</h2>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Data Deductions</span>
            </div>
            <div className="overflow-hidden border border-slate-100 rounded-xl divide-y divide-slate-100">
              <div className="flex items-center justify-between px-5 py-4 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Benefit Category</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Value</span>
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
      </div>

      {/* 3. RECHARGE CARDS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-l-4 border-blue-600 pl-3">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Recharge Cards Segment</h2>
        </div>

        {/* Bento stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card Volume & Status */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm hover:border-slate-200 transition">
            <div>
              <p className="text-[10px] bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase w-fit">Activity & Status</p>
              <p className="text-2xl font-black font-mono text-slate-900 mt-2">{rechargeCards.successful_orders} orders</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Successfully fulfilled card batches</p>
            </div>
            {rechargeCards.under_review_orders > 0 ? (
              <div className="mt-4 pt-3 border-t border-rose-50 text-[11px] font-semibold text-rose-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>{rechargeCards.under_review_orders} under review</span>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-emerald-50 text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>All batches resolved</span>
              </div>
            )}
          </div>

          {/* Subscriber Spend (Revenue) */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm hover:border-slate-200 transition">
            <div>
              <p className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase w-fit">Subscriber Revenue</p>
              <p className="text-2xl font-black font-mono text-slate-900 mt-2">{formatNaira(rechargeCards.revenue)}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Collected from card subscriber orders</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-semibold text-slate-500">
              Direct gross sales
            </div>
          </div>

          {/* Peyflex Cost */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm hover:border-slate-200 transition">
            <div>
              <p className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full uppercase w-fit">Peyflex Cost</p>
              <p className="text-2xl font-black font-mono text-rose-600 mt-2">{formatNaira(rechargeCards.peyflex_cost)}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Cost incurred to Peyflex provider</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-semibold text-slate-500">
              Wholesale voucher cost
            </div>
          </div>

          {/* Card Markup Profit */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm hover:border-slate-200 transition">
            <div>
              <p className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase w-fit">Card Markup Profit</p>
              <p className="text-2xl font-black font-mono text-slate-900 mt-2">{formatNaira(rechargeCards.card_markup_profit)}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Direct card wholesale markups</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-semibold text-slate-500">
              Per-card direct margin
            </div>
          </div>

          {/* SaaS Subs Revenue */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm hover:border-slate-200 transition">
            <div>
              <p className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase w-fit">SaaS Access Revenue</p>
              <p className="text-2xl font-black font-mono text-slate-900 mt-2">{formatNaira(rechargeCards.subscription_revenue)}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Weekly/monthly access fee income</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-semibold text-slate-500">
              Access & subscription fees
            </div>
          </div>

          {/* Total segment Profit */}
          <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-5 flex flex-col justify-between shadow-sm hover:border-indigo-200 transition">
            <div>
              <p className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase w-fit">Total segment profit</p>
              <p className="text-2xl font-black font-mono text-indigo-900 mt-2">{formatNaira(rechargeCards.total_profit)}</p>
              <p className="text-xs text-indigo-600 font-medium mt-1">Markup profits + SaaS subscriptions</p>
            </div>
            <div className="mt-4 pt-3 border-t border-indigo-200 text-[11px] font-semibold text-indigo-600 flex justify-between">
              <span>Contribution ratio:</span>
              <span className="font-mono font-bold">
                {combinedNetProfit > 0 ? `${((rechargeCards.total_profit / combinedNetProfit) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Recharge Card Profit & Loss Breakdown Statement Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profit & Loss Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Recharge Card Profit & Loss</h3>
            <div className="overflow-hidden border border-slate-100 rounded-xl divide-y divide-slate-100">
              <div className="flex items-center justify-between px-5 py-4 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line Item</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</span>
              </div>

              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-slate-700 text-xs font-medium">💰 Card Subscriber Revenue</span>
                <span className="font-mono font-bold text-sm text-slate-900">{formatNaira(rechargeCards.revenue)}</span>
              </div>

              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-slate-700 text-xs font-medium">📉 Peyflex API Provider Cost</span>
                <span className="font-mono font-bold text-sm text-rose-600">− {formatNaira(rechargeCards.peyflex_cost)}</span>
              </div>

              <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/30">
                <span className="text-slate-900 text-xs font-bold">📊 Card Markup Profit</span>
                <span className="font-mono font-extrabold text-sm text-indigo-600">{formatNaira(rechargeCards.card_markup_profit)}</span>
              </div>

              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-slate-700 text-xs font-medium">🔌 SaaS Subscription Access Fees</span>
                <span className="font-mono font-bold text-sm text-emerald-600">+ {formatNaira(rechargeCards.subscription_revenue)}</span>
              </div>

              <div className="flex items-center justify-between px-5 py-4 bg-indigo-50/30">
                <span className="text-slate-950 text-sm font-black uppercase tracking-wider">Total Recharge Profit</span>
                <span className="font-mono font-black text-base text-indigo-700">
                  {formatNaira(rechargeCards.total_profit)}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Queue Details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Active Batch Operations</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Successful Print & Delivery Runs</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Processed a total of <strong className="font-semibold text-slate-900">{rechargeCards.successful_orders} orders</strong>. Card printing, voucher generation, and secure delivery tunnels completed without integrity faults.
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-start gap-3 ${rechargeCards.under_review_orders > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                <div className={`p-2 rounded-lg shrink-0 ${rechargeCards.under_review_orders > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Review & Halted Batches</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Currently <strong className="font-semibold text-slate-900">{rechargeCards.under_review_orders} orders</strong> are flagged for discrepancy verification or under review. Verify credentials in the provider reconciliation logs below if any errors persist.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PER-DENOMINATION TABLE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 border-l-4 border-slate-700 pl-3">
            <Layers className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Per-Denomination Sales Breakdown</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cost vs Retail Breakdown</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Network</th>
                  <th className="px-5 py-3.5">Denomination</th>
                  <th className="px-5 py-3.5 text-center">Cards Sold</th>
                  <th className="px-5 py-3.5">Total Cost</th>
                  <th className="px-5 py-3.5">Total Revenue</th>
                  <th className="px-5 py-3.5">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                      No active recharge card spend breakdown available yet
                    </td>
                  </tr>
                ) : (
                  sortedBreakdown.map((item, idx) => (
                    <tr key={`${item.network}-${item.face_value}-${idx}`} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3 font-semibold">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getNetworkBadge(item.network)}`}>
                          {item.network}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">₦{item.face_value}</td>
                      <td className="px-5 py-3 text-center font-mono text-slate-600 font-bold">{item.orders_count} batches ({item.total_delivered} cards)</td>
                      <td className="px-5 py-3 font-mono text-slate-500">{formatNaira(item.total_cost)}</td>
                      <td className="px-5 py-3 font-mono text-slate-900 font-bold">{formatNaira(item.total_revenue)}</td>
                      <td className="px-5 py-3 font-mono font-black text-emerald-600">+{formatNaira(item.profit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. PENDING / UNDER REVIEW ALERTS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Pending & Under-Review queues</h2>
        </div>

        {/* Recharge Cards - Under-Review/Pending Reconciliation Table */}
        {(rechargeUnresolved.length > 0 || rechargePendingReview.length > 0) && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-rose-800 text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  ⚠️ Recharge Card Reconciliation & Reviews Underway
                </h3>
                <p className="text-xs text-rose-700 leading-relaxed max-w-2xl mt-0.5">
                  Recharge card batches were halted or detected as discrepancies. These require prompt manual clearance inside the provider tab.
                </p>
              </div>
              {setActiveTab && (
                <button 
                  onClick={() => setActiveTab('recharge_cards')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition shrink-0"
                >
                  Go to Reconciliation <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-rose-200 rounded-xl bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-rose-50/50 border-b border-rose-100 text-[11px] font-bold text-rose-900 uppercase">
                    <th className="px-4 py-3">Order/Ref ID</th>
                    <th className="px-4 py-3">Issue/Detail</th>
                    <th className="px-4 py-3">Amount Charged</th>
                    <th className="px-4 py-3">Date Flagged</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {rechargeUnresolved.map((item) => (
                    <tr key={item.id} className="hover:bg-rose-50/30">
                      <td className="px-4 py-3 font-mono font-semibold text-rose-950">Ref #{item.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-rose-800 font-medium">{item.notes ?? 'Batch reported with delivery failure'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-rose-950">{formatNaira(item.amount_charged_but_undelivered)}</td>
                      <td className="px-4 py-3 text-rose-400">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rechargePendingReview.map((order) => (
                    <tr key={order.id} className="hover:bg-rose-50/30">
                      <td className="px-4 py-3 font-mono font-semibold text-rose-950">Order #{order.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-rose-800 font-medium">User: {order.users?.full_name} ({order.network} ₦{order.face_value})</td>
                      <td className="px-4 py-3 font-mono font-bold text-rose-950">{formatNaira(order.total_charged)}</td>
                      <td className="px-4 py-3 text-rose-400">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase">
                          Pending Review
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Plans - Provider Funding / Low Balance Alerts */}
        {smedata.funding_needed_for_pending > 0 && (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm">
            <div className="flex gap-3 items-start">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-amber-800 text-sm mb-1">
                  ⚠️ Provider Wallet Funding Outstanding
                </h3>
                <p className="text-xs text-amber-700 leading-relaxed max-w-2xl">
                  {smedata.recommendation}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-4 text-xs font-semibold text-amber-900">
                  <span>Pending Count: <strong className="font-mono text-sm">{orders.pending.count}</strong></span>
                  <span>•</span>
                  <span>Value: <strong className="font-mono text-sm">{formatNaira(orders.pending.revenue)}</strong></span>
                  <span>•</span>
                  <span>Required Funding: <strong className="font-mono text-sm text-red-600">{formatNaira(smedata.funding_needed_for_pending)}</strong></span>
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
          </div>
        )}

        {/* PENDING DATA PLANS DETAILS */}
        {pending_orders_detail && pending_orders_detail.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
                Awaiting Data Plans Funding ({pending_orders_detail.length})
              </h3>
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

        {/* Dynamic Fallback if absolutely everything is clean */}
        {rechargeUnresolved.length === 0 && rechargePendingReview.length === 0 && smedata.funding_needed_for_pending === 0 && pending_orders_detail.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-sm">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">All Queues Cleared</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No pending data transactions or recharge card batches require attention.</p>
          </div>
        )}
      </div>

      {/* 6. EXPENSES / LIABILITIES / VOUCHERS (At the bottom) */}
      <div className="space-y-6 pt-2 border-t border-slate-100">
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

        {/* Failed Orders Refund & Pending Reserved Vol */}
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
      </div>
    </div>
  );
}
