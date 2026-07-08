import { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle, DollarSign, Gift, Percent, Database
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, Legend
} from 'recharts';
import { fetchPlanMargins } from '../services/api';
import { MarginsData, PlanMargin } from '../types';
import { formatNaira } from '../utils/formatters';

interface MarginsViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const NETWORK_COLORS: Record<string, string> = {
  MTN: '#FCD116',
  GLO: '#22C55E',
  AIRTEL: '#EF4444',
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 25 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

export default function MarginsView({ adminSecret, addToast }: MarginsViewProps) {
  const [data, setData] = useState<MarginsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState<'ALL' | 'MTN' | 'GLO' | 'AIRTEL'>('ALL');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await fetchPlanMargins(adminSecret);
      setData(result);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load plan margins');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-primary-dark text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-white/10">
        <p className="font-bold text-slate-300 mb-1 truncate max-w-[180px]">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}:</span>
            <span className="font-mono font-bold">{formatNaira(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const filteredPlans = data?.plans.filter(p =>
    activeNetwork === 'ALL' ? true : p.network === activeNetwork
  ) ?? [];

  // For the chart — only plans with sales
  const chartPlans = filteredPlans
    .filter(p => p.units_sold > 0)
    .map(p => ({
      ...p,
      total_provider_cost: p.total_provider_cost ?? p.total_smedata_cost,
    }))
    .sort((a, b) => b.total_net_profit - a.total_net_profit)
    .slice(0, 15);

  const Skeleton = () => (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-105 p-5 h-28">
            <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
            <div className="h-7 bg-slate-100 rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-105 p-6 h-72">
        <div className="h-52 bg-slate-50 rounded-xl mt-4" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Plan Margins</h1>
          <p className="text-sm text-text-muted mt-1">
            What each plan costs us, what we charge, and how much we make per sale.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary-blue' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading && !data ? <Skeleton /> : !data ? (
        <div className="text-center py-20 text-slate-400">No data available.</div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">

          {/* LOSS WARNING BANNER */}
          {data.loss_plans.length > 0 && (
            <motion.div variants={cardVariants}
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-red-800 mb-1">
                  ⚠️ {data.loss_plans.length} plan{data.loss_plans.length > 1 ? 's are' : ' is'} selling below cost!
                </h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  {data.loss_plans.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200">
                      {p.plan_name} — losing {formatNaira(Math.abs(p.net_profit))} per sale
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ZERO MARGIN WARNING BANNER */}
          {((data.summary.zero_margin_plans_count ?? 0) > 0 || (data.zero_margin_plans?.length ?? 0) > 0) && (
            <motion.div variants={cardVariants}
              className="bg-red-50 border-2 border-red-400 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-sm font-black text-danger mb-1">
                  ⚠️ {data.summary.zero_margin_plans_count ?? data.zero_margin_plans?.length} plan(s) selling at zero profit!
                </h4>
                <p className="text-xs text-red-600">
                  These plans have no markup applied — every sale earns ₦0. Review immediately.
                </p>
                {data.zero_margin_plans && data.zero_margin_plans.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.zero_margin_plans.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-lg border border-red-200">
                        {p.plan_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Revenue', value: formatNaira(data.summary.overall_total_revenue), color: 'text-primary-blue', bg: 'bg-blue-50', icon: <DollarSign className="w-5 h-5" />, subtitle: 'Gross incoming sales' },
              { label: 'Provider Cost', value: formatNaira(data.summary.overall_total_provider_cost ?? data.summary.overall_total_smedata_cost), color: 'text-warning', bg: 'bg-amber-50', icon: <TrendingDown className="w-5 h-5" />, subtitle: 'Total paid to provider' },
              { label: 'Gross Markup', value: formatNaira(data.summary.overall_total_gross_markup), color: 'text-purple-500', bg: 'bg-purple-50', icon: <TrendingUp className="w-5 h-5" />, subtitle: 'What we added on top' },
              { label: 'Cashback Paid Out', value: formatNaira(data.summary.overall_total_cashback), color: 'text-orange-500', bg: 'bg-orange-50', icon: <Gift className="w-5 h-5" />, subtitle: 'Given back to customers' },
              { label: 'Net Profit', value: formatNaira(data.summary.overall_total_net_profit), color: 'text-success', bg: 'bg-green-50', icon: <TrendingUp className="w-5 h-5" />, subtitle: 'What stays with us', large: true },
            ].map((card) => (
              <motion.div key={card.label} variants={cardVariants}
                className={`bg-white p-4 rounded-xl border border-slate-105 shadow-geometric flex flex-col justify-between h-32 ${card.large ? 'ring-2 ring-success/20 ring-offset-1' : ''}`}>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 line-clamp-1">{card.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${card.bg} ${card.color} flex items-center justify-center shrink-0`}>{card.icon}</div>
                </div>
                <div className="mt-2 text-left">
                  <span className={`text-[20px] font-bold font-mono tracking-tight ${card.large ? card.color : 'text-slate-900'}`}>{card.value}</span>
                  <span className="block text-[9px] text-slate-400 mt-1 font-semibold">{card.subtitle}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* BEST PLAN HIGHLIGHTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div variants={cardVariants} className="bg-primary-dark text-white rounded-xl p-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">🏆 Best Net Margin Plan</span>
              <span className="block text-lg font-bold">{data.summary.best_margin_plan}</span>
              <span className="text-primary-blue font-mono font-bold text-xl">{data.summary.best_margin_pct}% net margin</span>
            </motion.div>
            <motion.div variants={cardVariants} className="bg-primary-dark text-white rounded-xl p-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">💰 Most Profitable Plan (by sales)</span>
              <span className="block text-lg font-bold">{data.summary.most_profitable_plan || 'No sales yet'}</span>
              <span className="text-success font-mono font-bold text-xl">{formatNaira(data.summary.most_profitable_amount || 0)} total profit</span>
            </motion.div>
          </div>

          {/* NETWORK SUMMARY */}
          <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.by_network.map(net => (
              <div key={net.network} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NETWORK_COLORS[net.network] || '#94A3B8' }} />
                    <span className="font-bold text-slate-900">{net.network}</span>
                    <span className="text-xs text-slate-450 font-bold ml-auto">{net.units_sold} sold</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Revenue</span>
                      <span className="font-mono font-bold text-primary-blue">{formatNaira(net.total_revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Provider Cost</span>
                      <span className="font-mono font-bold text-warning">{formatNaira(net.total_provider_cost ?? net.total_smedata_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Markup</span>
                      <span className="font-mono font-bold text-purple-500">{formatNaira(net.total_gross_markup)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cashback Paid</span>
                      <span className="font-mono font-bold text-orange-500">{formatNaira(net.total_cashback_given)}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 mt-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-bold text-slate-700 text-xs">Net Profit</span>
                    <span className={`font-mono font-bold text-lg ${net.total_net_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatNaira(net.total_net_profit)}
                    </span>
                  </div>
                  {net.loss_plans > 0 && (
                    <div className="flex justify-between mt-1 pt-1 border-t border-dashed border-red-100">
                      <span className="text-[10px] font-bold text-danger">Plans at a Loss</span>
                      <span className="font-bold font-mono text-[10px] text-danger">{net.loss_plans}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>

          {/* PROVIDER PERFORMANCE */}
          <motion.div variants={cardVariants} className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Provider Performance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.by_provider && data.by_provider.length > 0 ? (
                data.by_provider.map(prov => (
                  <div key={prov.provider} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-5 flex flex-col justify-between hover:border-slate-200 transition">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                          prov.provider.toLowerCase() === 'smedata'
                            ? 'bg-blue-50 text-primary-blue border border-blue-100'
                            : 'bg-emerald-50 text-emerald-750 border border-emerald-100'
                        }`}>
                          {prov.provider}
                        </span>
                        <span className="text-xs text-slate-450 font-bold ml-auto">{prov.units_sold} sold</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Plans Count</span>
                          <span className="font-semibold text-slate-800">
                            {prov.total_plans} ({prov.active_plans} active, {prov.inactive_plans} inactive)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Revenue</span>
                          <span className="font-mono font-bold text-primary-blue">{formatNaira(prov.total_revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Provider Cost</span>
                          <span className="font-mono font-bold text-warning">{formatNaira(prov.total_provider_cost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Gross Markup</span>
                          <span className="font-mono font-bold text-purple-500">{formatNaira(prov.total_gross_markup)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cashback Paid</span>
                          <span className="font-mono font-bold text-orange-500">{formatNaira(prov.total_cashback_given)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-3 mt-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-bold text-slate-700 text-xs">Net Profit</span>
                        <span className={`font-mono font-bold text-lg ${prov.total_net_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatNaira(prov.total_net_profit)}
                        </span>
                      </div>
                      {prov.loss_plans > 0 && (
                        <div className="flex justify-between mt-1 pt-1 border-t border-dashed border-red-100">
                          <span className="text-[10px] font-bold text-danger">Plans at a Loss</span>
                          <span className="font-bold font-mono text-[10px] text-danger">{prov.loss_plans}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  No provider performance statistics available.
                </div>
              )}
            </div>
          </motion.div>

          {/* TOP PLANS PROFIT CHART */}
          {chartPlans.length > 0 && (
            <motion.div variants={cardVariants} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Profit by Plan (top sellers)</h3>
              <p className="text-xs text-text-muted mb-5">
                Blue = revenue from customers, Amber = cost to provider, Green/Red = your actual net profit
              </p>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartPlans} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="plan_name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false}
                      angle={-35} textAnchor="end" interval={0} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="total_revenue" name="Revenue" fill="#3B7EF8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="total_provider_cost" name="Provider Cost" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="total_net_profit" name="Net Profit" radius={[3, 3, 0, 0]}>
                      {chartPlans.map((entry, index) => (
                        <Cell key={index} fill={entry.total_net_profit >= 0 ? '#22C55E' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* FULL PLANS TABLE */}
          <motion.div variants={cardVariants} className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
            {/* Network filter tabs */}
            <div className="flex border-b border-slate-100">
              {(['ALL', 'MTN', 'GLO', 'AIRTEL'] as const).map(net => (
                <button key={net} onClick={() => setActiveNetwork(net)}
                  className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeNetwork === net
                      ? 'border-primary-blue text-primary-blue'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}>
                  {net}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-4">Plan (Click to inspect)</th>
                    <th className="px-5 py-4">Provider</th>
                    <th className="px-5 py-4">Size</th>
                    <th className="px-5 py-4">Validity</th>
                    <th className="px-5 py-4 text-right">Provider Cost</th>
                    <th className="px-5 py-4 text-right">We Charge</th>
                    <th className="px-5 py-4 text-right">Gross Markup</th>
                    <th className="px-5 py-4 text-right font-semibold">Cashback (10%)</th>
                    <th className="px-5 py-4 text-right font-bold">Net Profit</th>
                    <th className="px-5 py-4 text-right">Net Margin %</th>
                    <th className="px-5 py-4 text-center">Sold</th>
                    <th className="px-5 py-4 text-right font-bold">Total Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F8] text-xs">
                  {filteredPlans.length === 0 ? (
                    <tr><td colSpan={12} className="px-5 py-10 text-center text-slate-400">No plans found.</td></tr>
                  ) : (
                    filteredPlans.map(plan => {
                      const isExpanded = expandedPlanId === plan.id;
                      const marginColorClass = plan.net_margin_pct >= 8
                        ? 'text-success bg-green-50 border-green-150'
                        : plan.net_margin_pct >= 4
                          ? 'text-warning bg-amber-50 border-amber-200'
                          : 'text-danger bg-red-50 border-red-150';
                      return (
                        <Fragment key={plan.id}>
                          <tr
                            onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                            className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${plan.is_loss ? 'bg-red-50/20' : ''} ${isExpanded ? 'bg-slate-50' : ''}`}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                                  style={{ backgroundColor: NETWORK_COLORS[plan.network] || '#94A3B8' }} />
                                <span className="font-semibold text-slate-900">{plan.plan_name}</span>
                                {plan.is_loss && (
                                  <span className="text-[9px] font-bold bg-red-100 text-danger px-1.5 py-0.5 rounded">LOSS</span>
                                )}
                                {!plan.active && (
                                  <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">OFF</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                (plan.primary_provider || 'smedata').toLowerCase() === 'smedata'
                                  ? 'bg-blue-50 text-primary-blue border border-blue-150'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                              }`}>
                                {(plan.primary_provider || 'smedata').toLowerCase() === 'smedata' ? 'SME' : 'PFX'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                {plan.size_label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500">{plan.validity}</td>
                            <td className="px-5 py-3.5 text-right font-mono font-bold text-warning">{formatNaira(plan.provider_cost ?? plan.smedata_price)}</td>
                            <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">{formatNaira(plan.we_charge)}</td>
                            <td className="px-5 py-3.5 text-right font-mono font-bold text-purple-500">
                              {plan.gross_markup >= 0 ? '+' : ''}{formatNaira(plan.gross_markup)}
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono font-semibold text-orange-500">
                              -{formatNaira(plan.cashback_given)}
                            </td>
                            <td className={`px-5 py-3.5 text-right font-mono font-bold ${plan.net_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                              {plan.net_profit >= 0 ? '+' : ''}{formatNaira(plan.net_profit)}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${marginColorClass}`}>
                                {plan.net_margin_pct >= 0 ? '+' : ''}{plan.net_margin_pct}%
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-700">
                              {plan.units_sold}
                            </td>
                            <td className={`px-5 py-3.5 text-right font-mono font-bold ${plan.total_net_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                              {plan.total_net_profit >= 0 ? '+' : ''}{formatNaira(plan.total_net_profit)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50">
                              <td colSpan={12} className="p-4 bg-slate-50/50">
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-[#0D1F3D] text-white rounded-2xl p-5 max-w-md mx-auto shadow-geometric border border-white/10 font-sans my-1"
                                >
                                  {/* Receipt header */}
                                  <div className="text-center border-b border-dashed border-white/20 pb-4 mb-4 select-none">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">📊 Per Sale Breakdown</span>
                                    <h4 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NETWORK_COLORS[plan.network] || '#94A3B8' }} />
                                      {plan.plan_name}
                                    </h4>
                                    <span className="text-[9px] text-slate-300 font-mono bg-white/5 px-2 py-0.5 rounded-md mt-1.5 inline-block">
                                      {plan.size_label} &middot; {plan.validity}
                                    </span>
                                  </div>

                                  {/* Receipt body */}
                                  <div className="space-y-3 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-400">Provider charges us:</span>
                                      <span className="font-mono font-bold text-amber-500">{formatNaira(plan.provider_cost ?? plan.smedata_price)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-400">We charge customer:</span>
                                      <span className="font-mono font-semibold text-white">{formatNaira(plan.we_charge)}</span>
                                    </div>

                                    <div className="border-t border-white/10 my-2 pt-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-purple-400 font-semibold">Gross markup:</span>
                                        <span className="font-mono font-bold text-purple-400">
                                          {formatNaira(plan.gross_markup)} <span className="text-[10px] font-normal font-sans text-slate-400">({plan.markup_pct}% markup)</span>
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <span className="text-orange-400 font-semibold">Cashback to customer (10%):</span>
                                      <span className="font-mono font-bold text-orange-400">-{formatNaira(plan.cashback_given)}</span>
                                    </div>

                                    <div className="border-t-2 border-dashed border-white/20 my-3 pt-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-success font-bold text-sm">Net profit to us:</span>
                                        <span className="font-mono font-bold text-success text-base flex flex-col items-end leading-tight">
                                          <span>{formatNaira(plan.net_profit)}</span>
                                          <span className="text-[9px] font-normal font-sans text-success/80">({plan.net_margin_pct}% of we charge)</span>
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Receipt footer */}
                                  <div className="mt-5 bg-white/5 rounded-xl p-3 flex items-center justify-between">
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Total Units Sold</span>
                                      <span className="font-mono font-bold text-xs text-white">{plan.units_sold} sale{plan.units_sold === 1 ? '' : 's'}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Net Lifetime Profit</span>
                                      <span className={`font-mono font-bold text-xs ${plan.total_net_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {plan.total_net_profit >= 0 ? '+' : ''}{formatNaira(plan.total_net_profit)}
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

        </motion.div>
      )}
    </div>
  );
}
