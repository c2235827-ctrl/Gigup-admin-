import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, Users, ShoppingBag, XCircle, Zap, BarChart2, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { fetchAnalytics } from '../services/api';
import { AnalyticsData } from '../types';
import { formatNaira } from '../utils/formatters';

interface AnalyticsViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const RANGE_OPTIONS = [
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

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
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export default function AnalyticsView({ adminSecret, addToast }: AnalyticsViewProps) {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async (r = range) => {
    setIsLoading(true);
    try {
      const result = await fetchAnalytics(adminSecret, r);
      setData(result);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(range);
  }, [range]);

  const CustomTooltipNaira = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-primary-dark text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-white/10">
        <p className="font-bold text-slate-300 mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}:</span>
            <span className="font-mono font-bold">{formatNaira(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const CustomTooltipCount = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-primary-dark text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-white/10">
        <p className="font-bold text-slate-300 mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}:</span>
            <span className="font-mono font-bold">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const Skeleton = () => (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-105 p-5 h-28">
            <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
            <div className="h-7 bg-slate-100 rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-105 p-6 h-72">
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
        <div className="h-52 bg-slate-50 rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-sm text-text-muted mt-1">
            Revenue trends, peak hours, network performance, and user growth.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                range === opt.value
                  ? 'bg-primary-blue text-white border-primary-blue shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => loadData(range)}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary-blue' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <Skeleton />
      ) : !data ? (
        <div className="text-center py-20 text-slate-400">No data available.</div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">

          {/* SECTION 1 — Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                label: 'Total Revenue', value: formatNaira(data.summary.total_revenue),
                icon: <TrendingUp className="w-5 h-5" />, color: 'text-primary-blue', bg: 'bg-blue-50'
              },
              {
                label: 'Net Revenue', value: formatNaira(data.summary.net_revenue),
                icon: <TrendingUp className="w-5 h-5" />, color: 'text-success', bg: 'bg-green-50',
                large: true
              },
              {
                label: 'Cashback Cost', value: formatNaira(data.summary.total_cashback_cost),
                icon: <Zap className="w-5 h-5" />, color: 'text-warning', bg: 'bg-amber-50'
              },
              {
                label: 'Total Orders', value: data.summary.total_orders.toLocaleString(),
                icon: <ShoppingBag className="w-5 h-5" />, color: 'text-pending', bg: 'bg-purple-50'
              },
              {
                label: `Failed Orders (${data.summary.failure_rate}%)`, value: data.summary.total_failed.toLocaleString(),
                icon: <XCircle className="w-5 h-5" />, color: 'text-danger', bg: 'bg-red-50'
              },
              {
                label: 'New Signups', value: data.summary.total_signups.toLocaleString(),
                icon: <Users className="w-5 h-5" />, color: 'text-pending', bg: 'bg-purple-50'
              },
            ].map((card) => (
              <motion.div
                key={card.label}
                variants={cardVariants}
                className={`bg-white p-5 rounded-xl border border-slate-105 shadow-geometric flex flex-col justify-between h-32 ${card.large ? 'ring-2 ring-success/20' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                  <div className={`w-9 h-9 rounded-lg ${card.bg} ${card.color} flex items-center justify-center shrink-0`}>
                    {card.icon}
                  </div>
                </div>
                <span className={`text-2xl font-bold font-mono ${card.large ? card.color : 'text-slate-900'}`}>
                  {card.value}
                </span>
              </motion.div>
            ))}
          </div>

          {/* SECTION 2 — Peak Activity Card */}
          <motion.div
            variants={cardVariants}
            className="bg-primary-dark text-white rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-5 h-5 text-primary-blue" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Peak Activity Insights</h3>
              <span className="text-[10px] text-slate-400 ml-2">Last {range} days</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { emoji: '🔥', label: 'Busiest Day', value: data.peaks.busiest_day, color: 'text-amber-400' },
                { emoji: '🕰️', label: 'Busiest Hour', value: data.peaks.busiest_hour, color: 'text-primary-blue' },
                { emoji: '😴', label: 'Quietest Day', value: data.peaks.quietest_day, color: 'text-slate-400' },
                { emoji: '🌙', label: 'Quietest Hour', value: data.peaks.quietest_hour, color: 'text-slate-400' },
              ].map((item) => (
                <div key={item.label}>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.emoji} {item.label}</span>
                  <span className={`text-xl font-bold font-mono ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* SECTION 3 — Revenue Over Time */}
          <motion.div variants={cardVariants} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Revenue & Cashback Over Time</h3>
            <p className="text-xs text-text-muted mb-5">Daily breakdown of gross revenue, cashback cost, and net revenue</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.charts.daily_revenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B7EF8" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B7EF8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCashback" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v.slice(5)} dy={8} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltipNaira />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3B7EF8" strokeWidth={2}
                    fill="url(#gRevenue)" activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="net_revenue" name="Net Revenue" stroke="#22C55E" strokeWidth={2}
                    fill="url(#gNet)" activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="cashback" name="Cashback" stroke="#F59E0B" strokeWidth={1.5}
                    strokeDasharray="4 4" fill="url(#gCashback)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* SECTION 4 & 5 — Day of Week + Hour of Day */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Day of Week */}
            <motion.div variants={cardVariants} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Orders by Day of Week</h3>
              <p className="text-xs text-text-muted mb-4">Which day generates the most purchases</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.by_day_of_week} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={(v) => v.slice(0, 3)} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltipCount />} />
                    <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]}>
                      {data.charts.by_day_of_week.map((entry, index) => {
                        const max = Math.max(...data.charts.by_day_of_week.map(d => d.orders));
                        const min = Math.min(...data.charts.by_day_of_week.map(d => d.orders));
                        const color = entry.orders === max ? '#22C55E' : entry.orders === min ? '#EF4444' : '#3B7EF8';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-text-muted mt-3 bg-slate-50 rounded-lg p-2.5">
                📦 Most orders on <strong className="text-slate-900">{data.peaks.busiest_day}</strong> — consider promotions on slow days like <strong className="text-slate-900">{data.peaks.quietest_day}</strong>
              </p>
            </motion.div>

            {/* Hour of Day */}
            <motion.div variants={cardVariants} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Orders by Hour of Day</h3>
              <p className="text-xs text-text-muted mb-4">When do users buy data?</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.by_hour} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="label" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false}
                      interval={3} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltipCount />} />
                    <Bar dataKey="orders" name="Orders" radius={[3, 3, 0, 0]}>
                      {data.charts.by_hour.map((entry, index) => {
                        const max = Math.max(...data.charts.by_hour.map(d => d.orders));
                        const opacity = max > 0 ? 0.3 + (entry.orders / max) * 0.7 : 0.3;
                        return <Cell key={`cell-${index}`} fill={`rgba(59,126,248,${opacity.toFixed(2)})`} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-text-muted mt-3 bg-slate-50 rounded-lg p-2.5">
                🕰️ Peak buying time is <strong className="text-slate-900">{data.peaks.busiest_hour}</strong> — orders lowest at <strong className="text-slate-900">{data.peaks.quietest_hour}</strong>
              </p>
            </motion.div>
          </div>

          {/* SECTION 6 — Orders by Network */}
          <motion.div variants={cardVariants} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Orders by Network</h3>
            <p className="text-xs text-text-muted mb-6">Which carrier drives the most business</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.by_network}
                      dataKey="orders"
                      nameKey="network"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {data.charts.by_network.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={NETWORK_COLORS[entry.network] || '#94A3B8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} orders`, 'Orders']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {data.charts.by_network.map((net) => (
                  <div key={net.network} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: NETWORK_COLORS[net.network] || '#94A3B8' }} />
                      <span className="font-bold text-slate-800 text-sm">{net.network}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold font-mono text-slate-900">{net.orders} orders</span>
                      <span className="block text-xs font-mono text-success">{formatNaira(net.revenue)}</span>
                      {net.failed > 0 && (
                        <span className="block text-[10px] font-mono text-danger">{net.failed} failed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* SECTION 7 — Signups Over Time */}
          <motion.div variants={cardVariants} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">New User Signups</h3>
            <p className="text-xs text-text-muted mb-1">
              👥 <strong>{data.summary.total_signups}</strong> new users in the last {range} days
            </p>
            <div className="h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.charts.daily_signups} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v.slice(5)} dy={8} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltipCount />} />
                  <Area type="monotone" dataKey="count" name="Signups" stroke="#8B5CF6" strokeWidth={2}
                    fill="url(#gSignups)" activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* SECTION 8 — Top-Ups + Signups by Day */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Top-Ups */}
            <motion.div variants={cardVariants} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-1">💳 Daily Wallet Top-Ups</h3>
              <p className="text-xs text-text-muted mb-4">Amount funded into wallets each day</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.daily_topups} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false}
                      tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltipNaira />} />
                    <Bar dataKey="amount" name="Top-Up Amount" fill="#3B7EF8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Signups by Day of Week */}
            <motion.div variants={cardVariants} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-1">📅 Sign-Up Days</h3>
              <p className="text-xs text-text-muted mb-4">Which day of the week do people register?</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.signups_by_day} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={(v) => v.slice(0, 3)} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltipCount />} />
                    <Bar dataKey="count" name="Signups" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

        </motion.div>
      )}
    </div>
  );
}
