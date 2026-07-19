import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Zap, Phone, Tv, RefreshCw, CheckCircle, Clock, XCircle } from 'lucide-react';
import { fetchUtilityServicesSummary, fetchUtilityOrders, fetchUtilitySettings, toggleUtilityService } from '../services/api';
import { UtilityServicesSummary, UtilityOrder } from '../types';
import { formatNaira } from '../utils/formatters';

interface UtilityServicesViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

type ServiceTab = 'airtime' | 'cable' | 'electricity';

export default function UtilityServicesView({ adminSecret, addToast }: UtilityServicesViewProps) {
  const [summary, setSummary] = useState<UtilityServicesSummary | null>(null);
  const [settings, setSettings] = useState<{ airtime_enabled: boolean; cable_enabled: boolean; electricity_enabled: boolean; peyflex_token_configured: boolean } | null>(null);
  const [activeService, setActiveService] = useState<ServiceTab>('airtime');
  const [orders, setOrders] = useState<UtilityOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSummaryAndSettings = async () => {
    try {
      const [s, st] = await Promise.all([
        fetchUtilityServicesSummary(adminSecret),
        fetchUtilitySettings(adminSecret)
      ]);
      setSummary(s);
      setSettings(st);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to load summary or settings');
    }
  };

  const loadOrders = async (service: ServiceTab) => {
    setIsLoading(true);
    try {
      const result = await fetchUtilityOrders(adminSecret, service);
      setOrders(result);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummaryAndSettings();
  }, []);

  useEffect(() => {
    loadOrders(activeService);
  }, [activeService]);

  const handleToggle = async (service: ServiceTab, currentEnabled: boolean) => {
    try {
      const result = await toggleUtilityService(adminSecret, service, !currentEnabled);
      if (result.success) {
        addToast('success', `${service} ${!currentEnabled ? 'enabled' : 'disabled'}`);
        loadSummaryAndSettings();
      } else {
        addToast('error', `Failed to toggle ${service}`);
      }
    } catch (err: any) {
      addToast('error', err?.message || 'Error toggling service');
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'success') return <span className="flex items-center gap-1 text-xs font-bold text-success"><CheckCircle className="w-3.5 h-3.5" /> Success</span>;
    if (status === 'pending') return <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><Clock className="w-3.5 h-3.5" /> Pending</span>;
    return <span className="flex items-center gap-1 text-xs font-bold text-danger"><XCircle className="w-3.5 h-3.5" /> Failed</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Airtime, Cable & Electricity</h1>
        <p className="text-xs text-slate-400 mt-1">Zero-profit discount-passthrough services — monitor volume and provider health here</p>
      </div>

      {summary && (
        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-700">Combined Volume</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-2xl font-black">{summary.combined.total_orders}</p><p className="text-[10px] text-slate-400 uppercase">Total Orders</p></div>
            <div><p className="text-2xl font-black text-primary-blue">{formatNaira(summary.combined.total_revenue)}</p><p className="text-[10px] text-slate-400 uppercase">Total Volume Processed</p></div>
            <div><p className="text-2xl font-black text-slate-400">₦0</p><p className="text-[10px] text-slate-400 uppercase">Profit (by design)</p></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 italic">{summary.combined.note}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {(['airtime', 'cable', 'electricity'] as ServiceTab[]).map(service => {
          const data = summary?.[service];
          const enabledKey = `${service}_enabled` as keyof typeof settings;
          const isEnabled = settings ? settings[enabledKey] : true;
          const icons = { airtime: Phone, cable: Tv, electricity: Zap };
          const Icon = icons[service];

          return (
            <div key={service} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary-blue" />
                  <span className="text-sm font-bold capitalize">{service}</span>
                </div>
                <button
                  onClick={() => handleToggle(service, isEnabled as boolean)}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${isEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {data && (
                <div className="space-y-1 text-xs">
                  <p>Orders: <span className="font-bold">{data.total_orders}</span></p>
                  <p className="text-success">Success: {data.successful}</p>
                  <p className="text-amber-600">Pending: {data.pending}</p>
                  <p className="text-danger">Failed: {data.failed}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!settings?.peyflex_token_configured && (
        <div className="bg-red-50 border-2 border-danger rounded-xl p-4">
          <p className="text-sm font-bold text-danger">⚠️ Peyflex API token not configured — all three services are non-functional until this is fixed.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-105 shadow-geometric">
        <div className="flex gap-2 p-4 border-b border-[#EEF1F8]">
          {(['airtime', 'cable', 'electricity'] as ServiceTab[]).map(s => (
            <button
              key={s}
              onClick={() => setActiveService(s)}
              className={`px-4 py-2 text-xs font-bold rounded-lg capitalize cursor-pointer ${activeService === s ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {s}
            </button>
          ))}
          <button onClick={() => loadOrders(activeService)} className="ml-auto p-2 rounded-lg bg-slate-100 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="divide-y divide-[#EEF1F8]">
          {orders.length === 0 && <p className="p-8 text-center text-slate-400 text-sm">No {activeService} orders yet</p>}
          {orders.map(order => (
            <div key={order.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{order.users?.full_name ?? 'Unknown'}</p>
                <p className="text-xs text-slate-400">{order.users?.phone}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {activeService === 'airtime' && `${order.network} → ${order.recipient_phone}`}
                  {activeService === 'cable' && `${order.plan_label} · IUC ${order.iuc}`}
                  {activeService === 'electricity' && `${order.disco_name} · Meter ${order.meter_number}${order.token ? ` · Token: ${order.token}` : ''}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{formatNaira(order.amount ?? order.amount_charged ?? 0)}</p>
                {statusBadge(order.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
