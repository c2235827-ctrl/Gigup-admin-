import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, AlertTriangle, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  fetchRechargeCardOverview, updateRechargeCardPricing, updateRechargeCardConfig,
  resolveReconciliation, fetchPeyflexRateCard, updatePeyflexRate,
} from '../services/api';
import { RechargeCardOverview, PeyflexRate } from '../types';
import { formatNaira } from '../utils/formatters';

interface RechargeCardsViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function RechargeCardsView({ adminSecret, addToast }: RechargeCardsViewProps) {
  const [tab, setTab] = useState<'overview' | 'pricing' | 'rates' | 'reconciliation'>('overview');
  const [data, setData] = useState<RechargeCardOverview | null>(null);
  const [rates, setRates] = useState<PeyflexRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pricingForm, setPricingForm] = useState({ weekly_price: 0, weekly_batches: 0, monthly_price: 0, monthly_batches: 0, markup_per_card: 0, max_per_batch: 0 });
  const [configForm, setConfigForm] = useState({ peyflex_api_token: '', peyflex_account_pin: '' });

  const load = async () => {
    setIsLoading(true);
    const result = await fetchRechargeCardOverview(adminSecret);
    if (result) {
      setData(result);
      setPricingForm({
        weekly_price: result.config.weekly_price,
        weekly_batches: result.config.weekly_batches,
        monthly_price: result.config.monthly_price,
        monthly_batches: result.config.monthly_batches,
        markup_per_card: result.config.markup_per_card,
        max_per_batch: result.config.max_per_batch,
      });
    }
    setIsLoading(false);
  };

  const loadRates = async () => {
    const result = await fetchPeyflexRateCard(adminSecret);
    setRates(result);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'rates') loadRates(); }, [tab]);

  const handleSavePricing = async () => {
    const result = await updateRechargeCardPricing(adminSecret, pricingForm);
    if (result.success) { addToast('success', 'Pricing updated'); load(); }
    else addToast('error', 'Failed to update pricing');
  };

  const handleToggleEnabled = async () => {
    if (!data) return;
    const result = await updateRechargeCardConfig(adminSecret, { enabled: !data.config.enabled });
    if (result.success) { addToast('success', `Recharge cards ${!data.config.enabled ? 'enabled' : 'disabled'}`); load(); }
  };

  const handleToggleTier = async () => {
    if (!data) return;
    const newTier = data.config.account_tier === 'api_user' ? 'top_reseller' : 'api_user';
    const result = await updateRechargeCardConfig(adminSecret, { account_tier: newTier });
    if (result.success) { addToast('success', `Switched to ${newTier === 'top_reseller' ? 'Top Reseller' : 'API User'} rates`); load(); }
  };

  const handleSaveConfig = async () => {
    const updates: any = {};
    if (configForm.peyflex_api_token) updates.peyflex_api_token = configForm.peyflex_api_token;
    if (configForm.peyflex_account_pin) updates.peyflex_account_pin = configForm.peyflex_account_pin;
    const result = await updateRechargeCardConfig(adminSecret, updates);
    if (result.success) { addToast('success', 'Config updated'); setConfigForm({ peyflex_api_token: '', peyflex_account_pin: '' }); load(); }
  };

  const handleResolve = async (id: string, status: string) => {
    const result = await resolveReconciliation(adminSecret, id, status);
    if (result.success) { addToast('success', 'Reconciliation item resolved'); load(); }
  };

  const handleUpdateRate = async (rate: PeyflexRate) => {
    const result = await updatePeyflexRate(adminSecret, rate.id, rate.api_user_cost, rate.top_reseller_cost);
    if (result.success) addToast('success', `${rate.network} ₦${rate.face_value} rate updated`);
  };

  if (isLoading && !data) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 text-primary-blue animate-spin" />
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recharge Cards</h1>
          <p className="text-xs text-slate-400 mt-1">Peyflex-powered recharge card printing management</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleEnabled} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${data.config.enabled ? 'bg-green-100 text-success' : 'bg-red-100 text-danger'}`}>
            {data.config.enabled ? '● Enabled' : '● Disabled'}
          </button>
          <button onClick={load} className="px-4 py-2 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Config warnings */}
      {(!data.config.token_configured || !data.config.pin_configured) && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800">Configuration Incomplete</p>
            <p className="text-xs text-amber-700 mt-1">
              {!data.config.token_configured && 'Peyflex API token not set. '}
              {!data.config.pin_configured && 'Peyflex account PIN not set (waiting on KYC). '}
              Real orders cannot be placed until both are configured.
            </p>
          </div>
        </div>
      )}

      {/* Pending review alert */}
      {data.stats.pending_review_count > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
          <p className="text-sm font-black text-danger">⚠️ {data.stats.pending_review_count} order(s) under review</p>
          <p className="text-xs text-red-600 mt-1">Total {formatNaira(data.stats.pending_review_total_amount)} — check Reconciliation tab</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'overview' as const, label: 'Overview' },
          { id: 'pricing' as const, label: 'Pricing & Limits' },
          { id: 'rates' as const, label: 'Peyflex Rate Card' },
          { id: 'reconciliation' as const, label: `Reconciliation (${data.stats.unresolved_reconciliation_count})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px cursor-pointer transition ${tab === t.id ? 'border-primary-blue text-primary-blue' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Active Subscriptions', value: data.stats.active_subscriptions, icon: CreditCard, color: 'text-primary-blue' },
              { label: 'Weekly / Monthly', value: `${data.stats.active_weekly} / ${data.stats.active_monthly}`, icon: Clock, color: 'text-slate-500' },
              { label: 'Success Rate', value: `${data.stats.success_rate_pct}%`, icon: CheckCircle, color: 'text-success' },
              { label: 'Under Review', value: data.stats.failed_or_review_orders, icon: XCircle, color: 'text-danger' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-4">
                <s.icon className={`w-4 h-4 mb-2 ${s.color}`} />
                <p className="text-xl font-black font-mono text-slate-900">{s.value}</p>
                <p className="text-[10px] text-slate-500 uppercase">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Card Markup Profit', value: data.stats.total_card_markup_profit, color: 'text-success' },
              { label: 'Subscription Revenue', value: data.stats.total_subscription_revenue, color: 'text-primary-blue' },
              { label: 'Total Combined Profit', value: data.stats.total_combined_profit, color: 'text-success', bold: true },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-5 ${s.bold ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-white border border-slate-105 shadow-geometric'}`}>
                <p className={`text-[10px] uppercase tracking-wider mb-1 ${s.bold ? 'text-white/80' : 'text-slate-500'}`}>{s.label}</p>
                <p className={`text-2xl font-black font-mono ${s.bold ? 'text-white' : s.color}`}>{formatNaira(s.value)}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Recent Orders</h3>
            <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase">
                      <th className="px-4 py-3">User</th><th className="px-4 py-3">Network</th><th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Charged</th><th className="px-4 py-3">Profit</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF1F8]">
                    {data.recent_orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-slate-400">No recent orders yet</td>
                      </tr>
                    ) : (
                      data.recent_orders.map(o => (
                        <tr key={o.id}>
                          <td className="px-4 py-3"><p className="font-semibold text-slate-900">{o.users?.full_name}</p></td>
                          <td className="px-4 py-3">{o.network} ₦{o.face_value}</td>
                          <td className="px-4 py-3 font-mono">{o.quantity_delivered}/{o.quantity_ordered}</td>
                          <td className="px-4 py-3 font-mono">{formatNaira(o.total_charged)}</td>
                          <td className="px-4 py-3 font-mono text-success">{formatNaira(o.gigup_profit)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.status === 'success' ? 'bg-green-100 text-success' :
                              o.status === 'pending_review' ? 'bg-red-100 text-danger' : 'bg-amber-100 text-amber-600'
                            }`}>{o.status === 'pending_review' ? 'Under Review' : o.status}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PRICING */}
      {tab === 'pricing' && (
        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6 space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600">Weekly Price (₦)</label>
              <input type="number" value={pricingForm.weekly_price} onChange={e => setPricingForm({ ...pricingForm, weekly_price: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Weekly Batches/Day</label>
              <input type="number" value={pricingForm.weekly_batches} onChange={e => setPricingForm({ ...pricingForm, weekly_batches: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Monthly Price (₦)</label>
              <input type="number" value={pricingForm.monthly_price} onChange={e => setPricingForm({ ...pricingForm, monthly_price: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Monthly Batches/Day</label>
              <input type="number" value={pricingForm.monthly_batches} onChange={e => setPricingForm({ ...pricingForm, monthly_batches: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Markup Per Card (₦)</label>
              <input type="number" value={pricingForm.markup_per_card} onChange={e => setPricingForm({ ...pricingForm, markup_per_card: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Max Cards/Batch</label>
              <input type="number" value={pricingForm.max_per_batch} onChange={e => setPricingForm({ ...pricingForm, max_per_batch: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          <button onClick={handleSavePricing} className="w-full py-3 bg-primary-blue text-white font-bold rounded-xl text-sm cursor-pointer">Save Pricing</button>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-600">Peyflex Account Tier</p>
              <button onClick={handleToggleTier} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${data.config.account_tier === 'top_reseller' ? 'bg-green-100 text-success' : 'bg-slate-100 text-slate-600'}`}>
                {data.config.account_tier === 'top_reseller' ? '⭐ Top Reseller' : 'API User'}
              </button>
            </div>
            <input placeholder="Update Peyflex API Token" value={configForm.peyflex_api_token} onChange={e => setConfigForm({ ...configForm, peyflex_api_token: e.target.value })} className="w-full mb-2 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <input placeholder="Update Peyflex Account PIN" value={configForm.peyflex_account_pin} onChange={e => setConfigForm({ ...configForm, peyflex_account_pin: e.target.value })} className="w-full mb-2 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <button onClick={handleSaveConfig} className="w-full py-2.5 bg-slate-700 text-white font-bold rounded-xl text-sm cursor-pointer">Update Provider Config</button>
          </div>
        </div>
      )}

      {/* RATE CARD */}
      {tab === 'rates' && (
        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase">
                <th className="px-4 py-3">Network</th><th className="px-4 py-3">Face Value</th>
                <th className="px-4 py-3">API User Cost</th><th className="px-4 py-3">Top Reseller Cost</th><th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F8]">
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-slate-400">No rates available</td>
                </tr>
              ) : (
                rates.map((r, i) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold">{r.network}</td>
                    <td className="px-4 py-3">₦{r.face_value}</td>
                    <td className="px-4 py-3">
                      <input type="number" step="0.1" value={r.api_user_cost} onChange={e => {
                        const newRates = [...rates]; newRates[i].api_user_cost = Number(e.target.value); setRates(newRates);
                      }} className="w-20 px-2 py-1 border border-slate-200 rounded text-xs" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" step="0.1" value={r.top_reseller_cost} onChange={e => {
                        const newRates = [...rates]; newRates[i].top_reseller_cost = Number(e.target.value); setRates(newRates);
                      }} className="w-20 px-2 py-1 border border-slate-200 rounded text-xs" />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleUpdateRate(r)} className="px-2 py-1 bg-primary-blue text-white rounded text-[10px] font-bold cursor-pointer">Save</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* RECONCILIATION */}
      {tab === 'reconciliation' && (
        <div className="space-y-3">
          {data.unresolved_reconciliation.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-16 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No unresolved reconciliation issues</p>
            </div>
          )}
          {data.unresolved_reconciliation.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-red-200 shadow-geometric p-5">
              <div className="flex justify-between items-start mb-2">
                <p className="font-black text-danger text-lg">{formatNaira(item.amount_charged_but_undelivered)}</p>
                <span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-slate-600 mb-4">{item.notes}</p>
              <div className="flex gap-2">
                <button onClick={() => handleResolve(item.id, 'refunded_by_peyflex')} className="px-3 py-1.5 bg-green-100 text-success text-xs font-bold rounded-lg cursor-pointer">Mark Refunded</button>
                <button onClick={() => handleResolve(item.id, 'disputed')} className="px-3 py-1.5 bg-amber-100 text-amber-600 text-xs font-bold rounded-lg cursor-pointer">Mark Disputed</button>
                <button onClick={() => handleResolve(item.id, 'written_off')} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg cursor-pointer">Write Off</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
