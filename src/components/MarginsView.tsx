import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle, DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, Legend
} from 'recharts';
import { fetchPlanMargins } from '../services/api';
import { MarginsData } from '../types';
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
    .sort((a, b) => b.total_profit - a.total_profit)
    .slice(0, 15);

  const Skeleton = () => (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
                      {p.plan_name} — losing {formatNaira(Math.abs(p.markup))} per sale
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: formatNaira(data.summary.total_revenue), color: 'text-primary-blue', bg: 'bg-blue-50', icon: <DollarSign className="w-5 h-5" /> },
              { label: 'Total Cost (SMEData)', value: formatNaira(data.summary.total_cost), color: 'text-warning', bg: 'bg-amber-50', icon: <TrendingDown className="w-5 h-5" /> },
              { label: 'Total Profit', value: formatNaira(data.summary.total_profit), color: 'text-success', bg: 'bg-green-50', icon: <TrendingUp className="w-5 h-5" />, large: true },
              { label: 'Plans at a Loss', value: data.summary.loss_plans_count.toString(), color: data.summary.loss_plans_count > 0 ? 'text-danger' : 'text-success', bg: data.summary.loss_plans_count > 0 ? 'bg-red-50' : 'bg-green-50', icon: <AlertTriangle className="w-5 h-5" /> },
            ].map((card) => (
              <motion.div key={card.label} variants={cardVariants}
                className={`bg-white p-5 rounded-xl border border-slate-105 shadow-geometric flex flex-col justify-between h-32 ${(card as any).large ? 'ring-2 ring-success/20' : ''}`}>
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                  <div className={`w-9 h-9 rounded-lg ${card.bg} ${card.color} flex items-center justify-center shrink-0`}>{card.icon}</div>
                </div>
                <span className={`text-2xl font-bold font-mono ${(card as any).large ? card.color : 'text-slate-900'}`}>{card.value}</span>
              </motion.div>
            ))}
          </div>

          {/* BEST PLAN HIGHLIGHTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div variants={cardVariants} className="bg-primary-dark text-white rounded-xl p-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">🏆 Best Margin Plan</span>
              <span className="block text-lg font-bold">{data.summary.best_margin_plan}</span>
              <span className="text-primary-blue font-mono font-bold text-xl">{data.summary.best_margin_pct}% markup</span>
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
              <div key={net.network} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NETWORK_COLORS[net.network] || '#94A3B8' }} />
                  <span className="font-bold text-slate-900">{net.network}</span>
                  <span className="text-xs text-slate-400 ml-auto">{net.units_sold} sold</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Revenue</span>
                    <span className="font-mono font-bold text-primary-blue">{formatNaira(net.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cost (SMEData)</span>
                    <span className="font-mono font-bold text-warning">{formatNaira(net.total_cost)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                    <span className="font-bold text-slate-700">Profit</span>
                    <span className={`font-mono font-bold text-sm ${net.total_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatNaira(net.total_profit)}
                    </span>
                  </div>
                  {net.loss_plans > 0 && (
                    <div className="flex justify-between">
                      <span className="text-danger">Loss plans</span>
                      <span className="font-bold text-danger">{net.loss_plans}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>

          {/* TOP PLANS PROFIT CHART */}
          {chartPlans.length > 0 && (
            <motion.div variants={cardVariants} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Profit by Plan (top sellers)</h3>
              <p className="text-xs text-text-muted mb-5">
                Blue = revenue from customers, Amber = cost to SMEData, Green = your profit
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
                    <Bar dataKey="total_cost" name="SMEData Cost" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="total_profit" name="Profit" radius={[3, 3, 0, 0]}>
                      {chartPlans.map((entry, index) => (
                        <Cell key={index} fill={entry.total_profit >= 0 ? '#22C55E' : '#EF4444'} />
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
                    <th className="px-5 py-4">Plan</th>
                    <th className="px-5 py-4">Size</th>
                    <th className="px-5 py-4">Validity</th>
                    <th className="px-5 py-4 text-right">SMEData Cost</th>
                    <th className="px-5 py-4 text-right">We Charge</th>
                    <th className="px-5 py-4 text-right">Markup</th>
                    <th className="px-5 py-4 text-right">Markup %</th>
                    <th className="px-5 py-4 text-center">Sold</th>
                    <th className="px-5 py-4 text-right">Total Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F8] text-xs">
                  {filteredPlans.length === 0 ? (
                    <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-400">No plans found.</td></tr>
                  ) : (
                    filteredPlans.map(plan => (
                      <tr key={plan.id} className={`hover:bg-slate-50/30 transition-colors ${plan.is_loss ? 'bg-red-50/40' : ''}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0"
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
                        <td className="px-5 py-3">
                          <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                            {plan.size_label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{plan.validity}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-warning">{formatNaira(plan.cost_price)}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">{formatNaira(plan.selling_price)}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold">
                          <span className={plan.markup >= 0 ? 'text-success' : 'text-danger'}>
                            {plan.markup >= 0 ? '+' : ''}{formatNaira(plan.markup)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-bold font-mono text-sm ${
                            plan.markup_pct >= 20 ? 'text-success' :
                            plan.markup_pct >= 10 ? 'text-warning' : 'text-danger'
                          }`}>
                            {plan.markup_pct >= 0 ? '+' : ''}{plan.markup_pct}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center font-mono font-bold text-slate-700">
                          {plan.units_sold}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold">
                          <span className={plan.total_profit >= 0 ? 'text-success' : 'text-danger'}>
                            {plan.total_profit > 0 ? '+' : ''}{formatNaira(plan.total_profit)}
                          </span>
                        </td>
                      </tr>
                    ))
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
