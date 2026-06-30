import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Clock, 
  XCircle, 
  CheckCircle,
  HelpCircle,
  Play
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { fetchFinancialSummary, retryPendingOrders, fetchAnalytics } from '../services/api';
import { FinancialSummary, AnalyticsData } from '../types';
import { formatNaira } from '../utils/formatters';

interface FinancialSummaryViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function FinancialSummaryView({ adminSecret, addToast }: FinancialSummaryViewProps) {
  const [data, setData] = useState<FinancialSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [summaryResult, analyticsResult] = await Promise.all([
        fetchFinancialSummary(adminSecret),
        fetchAnalytics(adminSecret, 30).catch(err => {
          console.error("Failed to load analytics data for the chart:", err);
          return null;
        })
      ]);
      
      if (summaryResult) {
        setData(summaryResult);
      } else {
        addToast('error', 'Failed to load financial summary');
      }
      
      if (analyticsResult) {
        setAnalytics(analyticsResult);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Error occurred loading financial summary');
    } finally {
      setIsLoading(false);
    }
  };

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
      addToast('error', err.message || 'Error occurred during retry execution');
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // auto-refresh every 60 seconds (1 minute)
    return () => clearInterval(interval);
  }, [adminSecret]);

  const CustomTooltipNaira = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-white/10">
        <p className="font-bold text-slate-300 mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.color }} className="font-medium">{p.name}:</span>
            <span className="font-mono font-bold">{formatNaira(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <RefreshCw className="w-8 h-8 text-primary-blue animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading financial summary data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <p className="text-slate-500 font-medium">No financial summary data found.</p>
        <button onClick={load} className="mt-4 px-4 py-2 text-sm font-bold bg-primary-blue text-white rounded-xl hover:bg-blue-600 transition">
          Retry Loading
        </button>
      </div>
    );
  }

  const successfulOrder = data.orders?.successful ?? { count: 0, revenue: 0 };
  const pendingOrder = data.orders?.pending ?? { count: 0, revenue: 0 };
  const failedOrder = data.orders?.failed ?? { count: 0 };
  const totalOrdersCount = data.orders?.total ?? 0;

  const cashback = data.cashback ?? { paid_on_successful_orders: 0, owed_on_pending_orders: 0 };

  const smedata = data.smedata ?? { cost_of_successful_orders: 0, funding_needed_for_pending: 0, recommendation: '' };

  const expenses = data.expenses ?? {
    welcome_bonuses: { total: 0, count: 0 },
    cashback_paid: { total: 0, count: 0 },
    referral_rewards: { total: 0, count: 0 },
    streak_rewards: { total: 0, count: 0 },
    recovery_bonuses: { total: 0, count: 0 },
    total_all_expenses: 0
  };

  const welcomeBonuses = expenses.welcome_bonuses ?? { total: 0, count: 0 };
  const cashbackPaid = expenses.cashback_paid ?? { total: 0, count: 0 };
  const referralRewards = expenses.referral_rewards ?? { total: 0, count: 0 };
  const streakRewards = expenses.streak_rewards ?? { total: 0, count: 0 };
  const recoveryBonuses = expenses.recovery_bonuses ?? { total: 0, count: 0 };

  const profit = data.profit ?? {
    gross_revenue: 0,
    smedata_cost: 0,
    gross_profit: 0,
    total_expenses: 0,
    net_profit: 0,
    net_profit_margin_pct: 0,
    summary: ''
  };

  const isProfit = (profit.net_profit ?? 0) >= 0;
  const failedValue = failedOrder.total_value ?? failedOrder.revenue ?? failedOrder.total_amount ?? failedOrder.value ?? 0;
  const failedCount = failedOrder.count ?? 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Summary</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <p className="text-xs text-slate-400">
              Live • Last updated: {new Date(data.generated_at).toLocaleTimeString('en-NG')}
            </p>
          </div>
        </div>
        <button onClick={load} className="px-4 py-2 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* SMEData Alert — show prominently if pending orders exist */}
      {pendingOrder.count > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-4 flex-1">
            <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-black text-amber-800 text-sm mb-1">⚠️ SMEData Funding Required</h3>
              <p className="text-xs text-amber-700 mb-3 leading-relaxed">{smedata.recommendation}</p>
              <div className="flex gap-6 flex-wrap">
                <div>
                  <p className="text-[9px] text-amber-600 uppercase tracking-wider font-bold">Pending Orders</p>
                  <p className="text-base font-black text-amber-800">{pendingOrder.count}</p>
                </div>
                <div>
                  <p className="text-[9px] text-amber-600 uppercase tracking-wider font-bold">Fund Amount Needed</p>
                  <p className="text-base font-black text-amber-800">{formatNaira(smedata.funding_needed_for_pending)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-amber-600 uppercase tracking-wider font-bold">Revenue Held</p>
                  <p className="text-base font-black text-amber-800">{formatNaira(pendingOrder.revenue)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-amber-600 uppercase tracking-wider font-bold">Cashback Liability</p>
                  <p className="text-base font-black text-amber-800">{formatNaira(cashback.owed_on_pending_orders)}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-2 md:pt-0 shrink-0">
            <button
              onClick={handleRetryOrders}
              disabled={isRetrying}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition disabled:opacity-70 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying Orders...' : 'Retry Pending Orders'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Net Profit Banner */}
      <div className={`rounded-2xl p-6 flex items-center justify-between ${isProfit ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}`}>
        <div>
          <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Net Profit (After All Expenses)</p>
          <p className="text-4xl font-black text-white">{formatNaira(Math.abs(profit.net_profit))}</p>
          <p className="text-white/80 text-xs mt-1.5 leading-relaxed">{profit.summary}</p>
        </div>
        <div className="text-right flex flex-col items-end">
          {isProfit ? <TrendingUp className="w-12 h-12 text-white/60" /> : <TrendingDown className="w-12 h-12 text-white/60" />}
          <p className="text-white font-black text-xl mt-1">{profit.net_profit_margin_pct}%</p>
          <p className="text-white/70 text-[10px]">margin</p>
        </div>
      </div>

      {/* 30-Day Revenue vs Net Profit Chart */}
      {analytics && analytics.charts?.daily_revenue?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800">Financial Performance (Last 30 Days)</h3>
            <p className="text-xs text-slate-500">Comparison of daily gross revenue and order-level net profit</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.charts.daily_revenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B7EF8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B7EF8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gNetProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94A3B8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => {
                    try {
                      const dateObj = new Date(v);
                      return dateObj.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
                    } catch {
                      return v.slice(5);
                    }
                  }} 
                  dy={8} 
                />
                <YAxis 
                  stroke="#94A3B8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} 
                />
                <Tooltip content={<CustomTooltipNaira />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Gross Revenue" 
                  stroke="#3B7EF8" 
                  strokeWidth={2}
                  fill="url(#gRevenue)" 
                  activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="net_revenue" 
                  name="Net Profit (Orders)" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fill="url(#gNetProfit)" 
                  activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Orders Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Orders Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { 
              label: successfulOrder.label || 'Total Orders Filled (Fulfilled)', 
              count: successfulOrder.count, 
              value: successfulOrder.revenue, 
              icon: CheckCircle, 
              color: 'text-emerald-500', 
              bg: 'bg-green-50',
              sub: undefined 
            },
            { 
              label: pendingOrder.label || 'Pending', 
              count: pendingOrder.count, 
              value: pendingOrder.revenue, 
              icon: Clock, 
              color: 'text-amber-500', 
              bg: 'bg-amber-50',
              sub: undefined 
            },
            { 
              label: failedOrder.label || 'Total Failed Orders (Refunded — NOT revenue)', 
              count: failedCount, 
              value: failedValue, 
              icon: XCircle, 
              color: 'text-rose-500', 
              bg: 'bg-red-50',
              sub: 'Refunded — NOT revenue or loss' 
            },
            { 
              label: 'Total', 
              count: totalOrdersCount, 
              value: profit.gross_revenue, 
              icon: ShoppingCart, 
              color: 'text-primary-blue', 
              bg: 'bg-blue-50',
              sub: undefined 
            },
          ].map(card => (
            <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-slate-100 flex flex-col justify-between`}>
              <div>
                <card.icon className={`w-4 h-4 mb-2 ${card.color}`} />
                <p className="text-2xl font-black font-mono text-slate-900">{card.count}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold leading-tight">{card.label}</p>
              </div>
              <div className="mt-2 border-t border-slate-100/50 pt-1.5">
                <p className={`text-xs font-bold ${card.color}`}>{formatNaira(card.value)}</p>
                {card.sub && (
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight font-medium">{card.sub}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profit Waterfall */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Profit Breakdown</h2>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {[
            { label: 'Gross Revenue (successful orders)', value: profit.gross_revenue, color: 'text-emerald-600', sign: '' },
            { label: 'SMEData Cost (wholesale cost of successful orders)', value: profit.smedata_cost, color: 'text-rose-600', sign: '−' },
            { label: 'Gross Profit', value: profit.gross_profit, color: 'text-primary-blue', sign: '=', bold: true },
            { label: 'Total Expenses (welcome bonuses, cashback, rewards)', value: profit.total_expenses, color: 'text-rose-600', sign: '−' },
            { label: 'Net Profit', value: profit.net_profit, color: isProfit ? 'text-emerald-600' : 'text-rose-600', sign: '=', bold: true, large: true },
          ].map((row, i) => (
            <div key={i} className={`flex items-center justify-between px-5 py-3.5 border-b border-slate-100 last:border-0 ${row.bold ? 'bg-slate-50' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-mono text-sm w-4 text-center">{row.sign}</span>
                <span className={`text-xs ${row.bold ? 'font-black text-slate-900' : 'text-slate-600'}`}>{row.label}</span>
              </div>
              <span className={`font-mono font-black ${row.large ? 'text-lg' : 'text-sm'} ${row.color}`}>
                {formatNaira(Math.abs(row.value))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses Breakdown */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Expenses Breakdown</h2>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {[
            { label: 'Cashback Paid', data: cashbackPaid },
            { label: 'Welcome Bonuses', data: welcomeBonuses },
            { label: 'Referral Rewards', data: referralRewards },
            { label: 'Streak Rewards', data: streakRewards },
            { label: 'Recovery Bonuses', data: recoveryBonuses },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-xs font-semibold text-slate-700">{row.label}</p>
                <p className="text-[10px] text-slate-400">{row.data.count} transactions</p>
              </div>
              <span className="font-mono font-black text-sm text-rose-600">{formatNaira(row.data.total)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50">
            <span className="text-xs font-black text-slate-900">Total Expenses</span>
            <span className="font-mono font-black text-rose-600">{formatNaira(expenses.total_all_expenses)}</span>
          </div>
        </div>
      </div>

      {/* SMEData Info */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">SMEData Wallet Details</h2>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {[
            { label: 'Spent on Fulfilled Orders', value: smedata.cost_of_successful_orders },
            { label: 'Needed for Pending Orders', value: smedata.funding_needed_for_pending },
            { label: 'Cashback Owed on Pending Orders', value: cashback.owed_on_pending_orders },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 last:border-0">
              <span className="text-xs text-slate-600">{row.label}</span>
              <span className="font-mono font-black text-sm text-slate-900">{formatNaira(row.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cancelled / Failed Transactions informational card */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 shadow-xs flex gap-4">
        <div className="p-2.5 bg-white text-slate-400 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center border border-slate-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <h4 className="font-bold text-slate-700">Cancelled Transactions (Failed Orders)</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            A total of <span className="font-bold text-slate-700">{formatNaira(failedValue)}</span> across <span className="font-bold text-slate-700">{failedCount} failed orders</span> was returned immediately to users' GigUp wallet balances. This represents cancelled volume and is <strong>not gross/net revenue</strong> and <strong>not an expense or financial loss</strong>, as all funds stayed within the internal ledger system.
          </p>
        </div>
      </div>

      {/* Pending Orders Table */}
      {data.pending_orders_detail && data.pending_orders_detail.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
            Pending Orders ({data.pending_orders_detail.length}) — Awaiting SMEData Fulfillment
          </h2>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
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
                  {data.pending_orders_detail.map(order => (
                    <tr key={order.id} className="hover:bg-amber-50/20 transition">
                      <td className="px-4 py-3 font-mono">{order.recipient_phone}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{order.plan_name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-primary-blue">{order.network}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{formatNaira(order.amount)}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(order.created_at).toLocaleDateString('en-NG')}</td>
                      <td className="px-4 py-3 text-amber-600 text-[10px] font-medium">{order.failure_reason ?? 'low balance'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
