import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  Award, 
  ArrowRight,
  RefreshCw,
  Phone,
  Wallet,
  Calendar,
  AlertCircle,
  Coins,
  Gift
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { Stats, Order, User } from '../types';
import { formatNaira, formatDateTime, getInitials } from '../utils/formatters';
import { fetchUsers } from '../services/api';

interface DashboardHomeProps {
  stats: Stats;
  recentOrders: Order[];
  recentUsers: User[];
  pendingBonuses?: Order[];
  pendingWithdrawalsCount: number;
  pendingWithdrawalsSum: number;
  onNavigateToOrders: (filterPending: boolean, filterBonusPending?: boolean) => void;
  onNavigateToUsers: () => void;
  onNavigateToWithdrawals: () => void;
  onSelectOrder: (order: Order) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const getLast7DaysData = (orders: Order[]) => {
  const result = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;
    
    result.push({
      dateStr,
      dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
      dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: 0,
      volume: 0
    });
  }

  if (Array.isArray(orders)) {
    orders.forEach((o) => {
      if (!o || !o.created_at) return;
      try {
        const d = new Date(o.created_at);
        const oYear = d.getFullYear();
        const oMonth = String(d.getMonth() + 1).padStart(2, '0');
        const oDate = String(d.getDate()).padStart(2, '0');
        const oDateStr = `${oYear}-${oMonth}-${oDate}`;

        const match = result.find(r => r.dateStr === oDateStr);
        if (match) {
          match.count += 1;
          match.volume += Number(o.amount) || 0;
        }
      } catch (e) {
        // Safe catch for date parsing
      }
    });
  }

  return result;
};

export default function DashboardHome({
  stats,
  recentOrders,
  recentUsers,
  pendingBonuses = [],
  pendingWithdrawalsCount,
  pendingWithdrawalsSum,
  onNavigateToOrders,
  onNavigateToUsers,
  onNavigateToWithdrawals,
  onSelectOrder,
  onRefresh,
  isRefreshing
}: DashboardHomeProps) {

  // Auto-refresh seconds counter tracker
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [totalBonusOutstanding, setTotalBonusOutstanding] = useState<number | null>(null);

  useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [stats]);

  useEffect(() => {
    let active = true;
    const fetchAllUsersForBonusSum = async () => {
      try {
        const secret = sessionStorage.getItem('gigup_admin_secret');
        if (!secret) return;
        // Fetch users (page 1, limit 1000 to cover all users)
        const response = await fetchUsers(secret, 1, 1000);
        if (response && response.users && active) {
          const sum = response.users.reduce((acc, user) => acc + (user.bonus_balance || 0), 0);
          setTotalBonusOutstanding(sum);
        }
      } catch (err) {
        console.warn('Failed to compute outstanding bonus', err);
      }
    };
    fetchAllUsersForBonusSum();
    return () => {
      active = false;
    };
  }, [stats]);

  // Extract top spenders sorted by total_spent descending
  const topSpenders = [...recentUsers]
    .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
    .slice(0, 4);

  // Calculate percentages for network breakdown
  const ordersByNetwork = stats.orders_by_network || {};
  const totalNetworkOrders = Object.values(ordersByNetwork).reduce((a, b) => a + b, 0) || 1;
  const networkDetails = [
    { 
      name: 'MTN', 
      count: ordersByNetwork.MTN || 0, 
      color: 'bg-amber-400', 
      text: 'text-amber-600',
      bgColor: 'bg-amber-100/40',
      accent: '#EAB308'
    },
    { 
      name: 'GLO', 
      count: ordersByNetwork.GLO || 0, 
      color: 'bg-green-500', 
      text: 'text-green-600',
      bgColor: 'bg-green-100/40',
      accent: '#22C55E'
    },
    { 
      name: 'AIRTEL', 
      count: ordersByNetwork.AIRTEL || 0, 
      color: 'bg-red-500', 
      text: 'text-red-500',
      bgColor: 'bg-red-100/40',
      accent: '#EF4444'
    }
  ].map(net => ({
    ...net,
    percentage: Math.round((net.count / totalNetworkOrders) * 100)
  }));

  // Containers and cards micro-staggers
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* SCREEN HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations Dashboard
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time VTU system orders, user balance logs, and pricing overview.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs rounded-xl shadow-sm hover:shadow-md transition-all active:translate-y-[0.5px] cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-primary-blue' : ''}`} />
            <span>{isRefreshing ? 'Refreshing Overview...' : 'Force Refresh'}</span>
          </button>
          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-500">
            Last updated: {secondsAgo === 0 ? 'just now' : `${secondsAgo} seconds ago`}
          </span>
        </div>
      </div>

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {/* TOTAL USERS */}
        <motion.div 
          variants={cardVariants}
          className="bg-white p-5 rounded-xl border border-slate-105 shadow-geometric flex flex-col justify-between group hover:shadow-geometric-lg hover:border-slate-300 transition-all cursor-pointer h-40"
          onClick={onNavigateToUsers}
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Users</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-primary-blue flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono text-slate-900">{stats.total_users}</h3>
            <span className="text-[11px] text-primary-blue bg-blue-50 px-2 py-0.5 rounded-full font-semibold mt-1.5 inline-flex items-center gap-0.5">
              +12 this week
            </span>
          </div>
        </motion.div>

        {/* TOTAL ORDERS */}
        <motion.div 
          variants={cardVariants}
          className="bg-white p-5 rounded-xl border border-slate-105 shadow-geometric flex flex-col justify-between group hover:shadow-geometric-lg hover:border-slate-300 transition-all cursor-pointer h-40"
          onClick={() => onNavigateToOrders(false)}
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Orders</span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-pending flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono text-slate-900">{stats.total_orders}</h3>
            <span className="text-[11px] text-pending bg-purple-50 px-2 py-0.5 rounded-full font-semibold mt-1.5 inline-flex items-center gap-0.5">
              85 today
            </span>
          </div>
        </motion.div>

        {/* NET REVENUE */}
        <motion.div 
          variants={cardVariants}
          className="bg-white p-5 rounded-xl border border-slate-105 shadow-geometric flex flex-col justify-between group hover:shadow-geometric-lg hover:border-slate-300 transition-all h-40"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Revenue</span>
            <div className="w-9 h-9 rounded-lg bg-green-50 text-success flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono text-slate-900">{formatNaira(stats.net_revenue)}</h3>
            <span className="text-[11px] text-success bg-green-50 px-2 py-0.5 rounded-full font-semibold mt-1.5 inline-flex items-center gap-0.5">
              Active
            </span>
          </div>
        </motion.div>

        {/* TOTAL CASHBACK GIVEN */}
        <motion.div 
          variants={cardVariants}
          className="bg-white p-5 rounded-xl border border-slate-105 shadow-geometric flex flex-col justify-between group hover:shadow-geometric-lg hover:border-slate-300 transition-all h-40"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Cashback Given</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono text-slate-900">{formatNaira(stats.total_cashback_given || 0)}</h3>
            <span className="text-[11px] text-amber-650 bg-amber-50 px-2 py-0.5 rounded-full font-bold mt-1.5 inline-flex items-center gap-0.5">
              Promo rewards pool
            </span>
          </div>
        </motion.div>

        {/* BONUS OUTSTANDING */}
        <motion.div 
          variants={cardVariants}
          className="bg-white p-5 rounded-xl border border-slate-105 shadow-geometric flex flex-col justify-between group hover:shadow-geometric-lg hover:border-slate-300 transition-all h-40"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bonus Outstanding</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono text-amber-500">
              {totalBonusOutstanding !== null ? formatNaira(totalBonusOutstanding) : '₦0.00'}
            </h3>
            <span className="text-[11px] text-amber-650 bg-amber-50 px-2 py-0.5 rounded-full font-bold mt-1.5 inline-flex items-center gap-0.5">
              Unclaimed welcome bonuses
            </span>
          </div>
        </motion.div>

        {/* PENDING ORDERS */}
        <motion.div 
          variants={cardVariants}
          onClick={() => onNavigateToOrders(true)}
          className={`p-5 rounded-xl border shadow-geometric flex flex-col justify-between cursor-pointer transition-all h-40 ${
            stats.pending_orders > 0 
              ? 'bg-amber-50/70 border-warning/40 hover:bg-amber-55 hover:border-warning hover:shadow-geometric-lg' 
              : 'bg-white border-slate-105 hover:border-slate-300 hover:shadow-geometric-lg'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${stats.pending_orders > 0 ? 'text-warning' : 'text-slate-500'}`}>Pending Orders</span>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              stats.pending_orders > 0 ? 'bg-amber-100 text-warning' : 'bg-slate-105 text-slate-500'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`text-2xl font-bold font-mono ${stats.pending_orders > 0 ? 'text-warning font-extrabold' : 'text-slate-900'}`}>{stats.pending_orders}</h3>
            {stats.pending_orders > 0 ? (
              <span className="text-[11px] text-warning bg-amber-150/40 px-2 py-0.5 rounded-full font-bold mt-1.5 inline-flex items-center gap-0.5">
                Requires Action
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full font-semibold mt-1.5 inline-flex items-center">
                System clear
              </span>
            )}
          </div>
        </motion.div>

        {/* PENDING WITHDRAWALS */}
        <motion.div 
          variants={cardVariants}
          onClick={onNavigateToWithdrawals}
          className={`p-5 rounded-xl border shadow-geometric flex flex-col justify-between cursor-pointer transition-all h-40 ${
            pendingWithdrawalsCount > 0 
              ? 'bg-red-50/70 border-red-200 hover:bg-white hover:border-red-500 hover:shadow-geometric-lg' 
              : 'bg-white border-slate-105 hover:border-slate-300 hover:shadow-geometric-lg'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${pendingWithdrawalsCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>Pending Withdrawals</span>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              pendingWithdrawalsCount > 0 ? 'bg-red-100 text-red-650' : 'bg-slate-105 text-slate-500'
            }`}>
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`text-2xl font-bold font-mono ${pendingWithdrawalsCount > 0 ? 'text-red-505 font-extrabold text-[#EF4444]' : 'text-slate-900'}`}>{pendingWithdrawalsCount}</h3>
            {pendingWithdrawalsCount > 0 ? (
              <span className="text-[11px] text-red-650 bg-red-150/40 px-2 py-0.5 rounded-full font-bold mt-1.5 inline-flex items-center gap-0.5 animate-pulse">
                Action Required
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full font-semibold mt-1.5 inline-flex items-center">
                Ledger clear
              </span>
            )}
          </div>
        </motion.div>

        {/* PENDING BONUSES */}
        <motion.div 
          variants={cardVariants}
          onClick={() => onNavigateToOrders(false, true)}
          className={`p-5 rounded-xl border shadow-geometric flex flex-col justify-between cursor-pointer transition-all h-40 ${
            pendingBonuses.length > 0 
              ? 'bg-amber-50/70 border-warning/40 hover:bg-amber-55 hover:border-warning hover:shadow-geometric-lg' 
              : 'bg-white border-slate-105 hover:border-slate-300 hover:shadow-geometric-lg'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${pendingBonuses.length > 0 ? 'text-warning' : 'text-slate-500'}`}>Pending Bonuses</span>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              pendingBonuses.length > 0 ? 'bg-amber-100 text-warning' : 'bg-slate-105 text-slate-500'
            }`}>
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`text-2xl font-bold font-mono ${pendingBonuses.length > 0 ? 'text-warning font-extrabold' : 'text-slate-900'}`}>{pendingBonuses.length}</h3>
            {pendingBonuses.length > 0 ? (
              <span className="text-[11px] text-warning bg-amber-150/40 px-2 py-0.5 rounded-full font-bold mt-1.5 inline-flex items-center gap-0.5">
                {pendingBonuses.length} bonus orders pending
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full font-semibold mt-1.5 inline-flex items-center">
                System clear
              </span>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* REVENUE BREAKDOWN BILL */}
        <motion.div 
          variants={cardVariants}
          className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-5">
              Revenue Detail
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F8]">
                <span className="text-xs text-slate-600 font-medium">Gross Revenue</span>
                <span className="text-sm font-semibold font-mono text-slate-900">{formatNaira(stats.total_revenue)}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F8]">
                <span className="text-xs text-slate-600 font-medium text-[#EF4444]">Total Cashback Given</span>
                <span className="text-sm font-semibold font-mono text-[#EF4444]">- {formatNaira(stats.total_cashback_given)}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F8]">
                <span className="text-xs text-slate-600 font-medium text-amber-600">Pending Withdrawals</span>
                <span className="text-sm font-semibold font-mono text-amber-600">- {formatNaira(pendingWithdrawalsSum)}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-base font-bold text-success">Net Total (Profits)</span>
                <span className="text-base font-bold font-mono text-success">{formatNaira(stats.net_revenue - pendingWithdrawalsSum)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 flex gap-2">
            <AlertCircle className="w-4 h-4 text-primary-blue shrink-0 mt-0.5" />
            <p>
              Users receive automatic wallet cashback on every transaction based on the active <span className="font-semibold">cashback_rate</span> configuration.
            </p>
          </div>
        </motion.div>

        {/* ORDERS BY NETWORK CUSTOM CHART */}
        <motion.div 
          variants={cardVariants}
          className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6 lg:col-span-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Orders by Network
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                MTN: {ordersByNetwork.MTN || 0}
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                GLO: {ordersByNetwork.GLO || 0}
              </span>
              <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-bold font-sans">
                Airtel: {ordersByNetwork.AIRTEL || 0}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold font-mono">
                Total: {totalNetworkOrders}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {networkDetails.map((net) => {
                const specColor = net.name === 'MTN' ? '#FDB913' : net.name === 'GLO' ? '#198223' : '#ED1C24';
                return (
                  <div key={net.name} className="flex flex-col">
                    <div className="flex items-center justify-between font-mono text-[13px] text-slate-900 mb-1">
                      <span>{net.name}</span>
                      <span className="font-bold">{net.percentage}%</span>
                    </div>
                    {/* network-bar */}
                    <div className="h-2 rounded-full bg-[#EEF1F8] w-full overflow-hidden my-2">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${net.percentage}%`, backgroundColor: specColor }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {net.count} orders
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 7-DAY ORDER COUNT TREND LINE CHART */}
      <motion.div 
        variants={cardVariants}
        className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary-blue animate-pulse" />
              7-Day Platform Activity Trend
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Daily order velocity tracking aggregated from platform queue.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-blue bg-opacity-80 inline-block" />
              <span className="text-slate-500 font-medium">Order Count</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-500 font-medium">Total Volume</span>
            </div>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart 
              data={getLast7DaysData(recentOrders)} 
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B7EF8" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3B7EF8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="dateLabel" 
                stroke="#94A3B8" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#94A3B8" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0D1F3D] text-white p-3 rounded-lg shadow-xl border border-[#3B7EF8]/20 text-xs font-sans space-y-1.5">
                        <p className="font-semibold text-slate-300">{data.dayName}, {data.dateLabel}</p>
                        <hr className="border-slate-800 my-1" />
                        <div className="flex justify-between gap-6">
                          <span className="text-slate-400">Orders:</span>
                          <span className="font-bold text-white font-mono">{data.count}</span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span className="text-slate-400">Volume:</span>
                          <span className="font-bold text-emerald-400 font-mono">₦{data.volume.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#3B7EF8" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorCount)" 
                activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* RECENT FEED GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT ORDERS (Col-span-2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Orders
            </h3>
            <button
              onClick={() => onNavigateToOrders(false)}
              className="text-primary-blue hover:text-blue-600 text-xs font-semibold flex items-center gap-1 transition-colors group cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">USER</th>
                    <th className="px-6 py-4">RECIPIENT</th>
                    <th className="px-6 py-4">NETWORK</th>
                    <th className="px-6 py-4">PLAN</th>
                    <th className="px-6 py-4">AMOUNT</th>
                    <th className="px-6 py-4">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F8] text-[13px]">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No recent orders registered in active queue.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => {
                      const user = order.users;
                      return (
                        <tr 
                          key={order.id} 
                          onClick={() => onSelectOrder(order)}
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-4">
                            <strong className="font-semibold text-slate-900 block group-hover:text-primary-blue transition-colors">
                              {user?.full_name || 'Anonymous User'}
                            </strong>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600">
                            {order.recipient_phone}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800">{order.network}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            {order.plan_name}
                          </td>
                          <td className="px-6 py-4 font-semibold font-mono text-slate-900">
                            {formatNaira(order.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              order.status === 'success' ? 'bg-[#DCFCE7] text-[#22C55E]' :
                              order.status === 'failed' ? 'bg-[#FEE2E2] text-[#EF4444]' : 'bg-[#F3E8FF] text-[#8B5CF6]'
                            }`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RECENT SIGNUPS (Col-span-1) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Signups
            </h3>
            <button
              onClick={onNavigateToUsers}
              className="text-primary-blue hover:text-blue-600 text-xs font-semibold flex items-center gap-1 transition-colors group cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-4 divide-y divide-slate-100">
            {recentUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No users found.
              </div>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 select-none">
                      {getInitials(user.full_name)}
                    </div>
                    <div>
                      <strong className="text-xs font-semibold text-slate-800 block">
                        {user.full_name}
                      </strong>
                      <span className="text-[10px] font-mono text-slate-405 block mt-0.5">
                        {user.phone}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-success font-mono block">
                      {formatNaira(user.wallet_balance)}
                    </span>
                    <span className="text-[9px] text-text-muted mt-0.5 block flex items-center gap-0.5 justify-end">
                      <Calendar className="w-2.5 h-2.5 text-slate-400" />
                      {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* TOP SPENDERS SECTION */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Top Spenders</span>
              </h3>
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Heavy Users
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-4 divide-y divide-slate-100">
              {topSpenders.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No spenders statistics recorded yet.
                </div>
              ) : (
                topSpenders.map((user) => (
                  <div key={`spender-${user.id}`} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center font-bold text-amber-700 text-xs shrink-0 select-none border border-amber-100">
                        {getInitials(user.full_name)}
                      </div>
                      <div>
                        <strong className="text-xs font-semibold text-slate-800 block">
                          {user.full_name}
                        </strong>
                        <span className="text-[10px] font-mono text-slate-405 block mt-0.5">
                          {user.phone}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 font-mono block">
                        {formatNaira(user.total_spent || 0)}
                      </span>
                      <span className="text-[9px] text-[#22C55E] font-bold mt-0.5 block">
                        {user.successful_orders ?? 0} orders
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
