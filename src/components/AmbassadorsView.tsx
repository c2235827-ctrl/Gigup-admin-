import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Plus, X, RefreshCw, ArrowLeft, Copy, TrendingUp, Users, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import {
  fetchAmbassadorSummaries, fetchAmbassadorDetail,
  createAmbassador, updateAmbassador, deleteAmbassador, fetchAmbassadorSummariesSubAdmin, fetchAmbassadorDetailSubAdmin
} from '../services/api';
import { Ambassador, AmbassadorDetail } from '../types';
import { formatNaira, getInitials } from '../utils/formatters';

interface AmbassadorsViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  role?: 'admin' | 'sub_admin';
}

export default function AmbassadorsView({ adminSecret, addToast, role = 'admin' }: AmbassadorsViewProps) {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AmbassadorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', pin: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const [pinModalAmbassador, setPinModalAmbassador] = useState<Ambassador | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      if (role === 'sub_admin') {
         const res = await fetchAmbassadorSummariesSubAdmin(adminSecret);
         setAmbassadors(res.ambassadors);
      } else {
         const summaries = await fetchAmbassadorSummaries(adminSecret);
         setAmbassadors(summaries);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load ambassadors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id: string) => {
    if (role === 'sub_admin') {
      const amb = ambassadors.find(a => a.id === id);
      if (amb) setPinModalAmbassador(amb);
      return;
    }
    
    setSelectedId(id);
    setDetailLoading(true);
    const result = await fetchAmbassadorDetail(adminSecret, id);
    setDetail(result);
    setDetailLoading(false);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalAmbassador || !enteredPin) return;
    setVerifyingPin(true);
    try {
       const result = await fetchAmbassadorDetailSubAdmin(adminSecret, pinModalAmbassador.id, enteredPin);
       if ('error' in result) {
          addToast('error', result.error);
       } else {
          setDetail(result as AmbassadorDetail);
          setSelectedId(pinModalAmbassador.id);
          setPinModalAmbassador(null);
          setEnteredPin('');
       }
    } catch (err: any) {
       addToast('error', err.message || 'Verification failed');
    } finally {
       setVerifyingPin(false);
    }
  };

  const handleCreate = async () => {
    if (!form.full_name || !form.phone || !form.pin) {
      addToast('warning', 'Name, phone, and PIN are required');
      return;
    }
    setSubmitting(true);
    const result = await createAmbassador(adminSecret, form);
    if (result.success) {
      addToast('success', `Ambassador ${form.full_name} created! Code: ${result.ambassador?.referral_code}`);
      setShowCreateModal(false);
      setForm({ full_name: '', phone: '', email: '', pin: '', notes: '' });
      load();
    } else {
      addToast('error', result.error || 'Failed to create ambassador');
    }
    setSubmitting(false);
  };

  const handleToggleStatus = async (amb: Ambassador) => {
    const newStatus = amb.status === 'active' ? 'suspended' : 'active';
    const result = await updateAmbassador(adminSecret, amb.id, { status: newStatus });
    if (result.success) { addToast('success', `${amb.full_name} ${newStatus === 'active' ? 'activated' : 'suspended'}`); load(); }
  };

  const handleDelete = async (amb: Ambassador) => {
    if (!confirm(`Delete ${amb.full_name}? This cannot be undone.`)) return;
    const result = await deleteAmbassador(adminSecret, amb.id);
    if (result.success) { addToast('success', `${amb.full_name} deleted`); setSelectedId(null); load(); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('success', `Referral code ${code} copied!`);
  };

  if (selectedId) {
    const amb = ambassadors.find(a => a.id === selectedId);
    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedId(null); setDetail(null); }} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Ambassadors
        </button>

        {detailLoading && (
          <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-16 text-center">
            <RefreshCw className="w-8 h-8 text-primary-blue mx-auto mb-3 animate-spin" />
          </div>
        )}

        {detail && !detailLoading && (
          <>
            <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-blue to-primary-dark flex items-center justify-center text-white font-black text-lg">
                    {getInitials(detail.ambassador.full_name)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{detail.ambassador.full_name}</h2>
                    <p className="text-sm text-slate-500 font-mono">{detail.ambassador.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 cursor-pointer" onClick={() => copyCode(detail.ambassador.referral_code)}>
                  <span className="font-mono font-black text-primary-blue">{detail.ambassador.referral_code}</span>
                  <Copy className="w-3.5 h-3.5 text-primary-blue" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Signups', value: detail.stats.total_signups, icon: Users, color: 'text-primary-blue' },
                { label: 'Qualified', value: detail.stats.qualified_signups, icon: CheckCircle, color: 'text-success' },
                { label: 'Successful Orders', value: detail.stats.successful_orders, icon: TrendingUp, color: 'text-success' },
                { label: 'Failed Orders', value: detail.stats.failed_orders, icon: XCircle, color: 'text-danger' },
                { label: 'Order Volume', value: formatNaira(detail.stats.total_volume), icon: DollarSign, color: 'text-amber-500' },
                { label: 'Current Tier Pay', value: formatNaira(detail.stats.current_tier_pay), icon: DollarSign, color: 'text-success' },
                { label: 'Next Tier At', value: detail.stats.next_tier_at ? `${detail.stats.next_tier_at} signups` : 'Max tier', icon: TrendingUp, color: 'text-pending' },
                { label: 'Level-2 Referrals', value: detail.stats.level2_referrals, icon: Users, color: 'text-purple-500' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl border border-slate-105 shadow-geometric p-4">
                  <stat.icon className={`w-4 h-4 mb-2 ${stat.color}`} />
                  <p className="text-lg font-black font-mono text-slate-900">{stat.value}</p>
                  <p className="text-[11px] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {detail.stats.next_tier_at && (
              <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-5">
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                  <span>{detail.stats.qualified_signups} qualified signups</span>
                  <span>Next: {detail.stats.next_tier_at} → {formatNaira(detail.stats.next_tier_pay ?? 0)}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-blue to-success rounded-full transition-all"
                    style={{ width: `${Math.min(100, (detail.stats.qualified_signups / detail.stats.next_tier_at) * 100)}%` }} />
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                Direct Referrals ({detail.direct_referrals.length})
              </h3>
              <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-3">User</th><th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Wallet</th><th className="px-4 py-3">Cashback</th><th className="px-4 py-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF1F8]">
                      {detail.direct_referrals.map(u => (
                        <tr key={u.id}>
                          <td className="px-4 py-3"><p className="font-semibold text-slate-900">{u.full_name}</p><p className="text-slate-400 font-mono">{u.phone}</p></td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.qualified ? 'bg-green-100 text-success' : 'bg-amber-100 text-amber-600'}`}>{u.qualified ? 'Qualified' : 'Pending'}</span></td>
                          <td className="px-4 py-3 font-mono">{formatNaira(u.wallet_balance)}</td>
                          <td className="px-4 py-3 font-mono">{formatNaira(u.cashback_balance)}</td>
                          <td className="px-4 py-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {detail.direct_referrals.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No referrals yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {detail.level2_referrals.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Second-Level Referrals ({detail.level2_referrals.length})
                </h3>
                <p className="text-xs text-slate-400 mb-3">People referred by this ambassador's direct referrals</p>
                <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="px-4 py-3">User</th><th className="px-4 py-3">Referred By</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEF1F8]">
                        {detail.level2_referrals.map(u => (
                          <tr key={u.id}>
                            <td className="px-4 py-3"><p className="font-semibold text-slate-900">{u.full_name}</p><p className="text-slate-400 font-mono">{u.phone}</p></td>
                            <td className="px-4 py-3 text-slate-600">{u.referred_by}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.first_topup_done ? 'bg-green-100 text-success' : 'bg-amber-100 text-amber-600'}`}>{u.first_topup_done ? 'Funded' : 'Pending'}</span></td>
                            <td className="px-4 py-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {role === 'admin' && (
            <div className="flex gap-3">
              <button onClick={() => amb && handleToggleStatus(amb)} className="px-4 py-2 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer">
                {amb?.status === 'active' ? 'Suspend' : 'Activate'} Ambassador
              </button>
              <button onClick={() => amb && handleDelete(amb)} className="px-4 py-2 text-xs font-bold rounded-lg border bg-red-50 text-danger border-red-200 hover:bg-red-100 cursor-pointer">
                Delete Ambassador
              </button>
            </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ambassadors</h1>
          <p className="text-sm text-text-muted mt-1">Manage brand ambassadors and track their referral performance.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={isLoading} className="px-4 py-2 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary-blue' : ''}`} /> Refresh
          </button>
          {role === 'admin' && (
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-xs font-bold rounded-lg bg-primary-blue text-white flex items-center gap-2 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Ambassador
          </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-16 text-center">
          <RefreshCw className="w-8 h-8 text-primary-blue mx-auto mb-3 animate-spin" />
        </div>
      )}

      {!isLoading && ambassadors.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-16 text-center">
          <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No ambassadors yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add Ambassador" to create your first one</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ambassadors.map(amb => (
          <motion.div key={amb.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => openDetail(amb.id)}
            className="bg-white rounded-xl border border-slate-105 shadow-geometric p-5 cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-primary-dark flex items-center justify-center text-white font-black text-xs">
                  {getInitials(amb.full_name)}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{amb.full_name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{amb.phone}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${amb.status === 'active' ? 'bg-green-100 text-success' : 'bg-red-100 text-danger'}`}>{amb.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><p className="text-[10px] text-slate-400 uppercase tracking-wider">Signups</p><p className="font-black font-mono text-slate-900">{amb.total_signups ?? 0}</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase tracking-wider">Qualified</p><p className="font-black font-mono text-success">{amb.qualified_signups ?? 0}</p></div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="font-mono text-xs font-bold text-primary-blue">{amb.referral_code}</span>
              <span className="text-[10px] font-bold text-slate-500">{amb.tier_label || 'Trial'}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-900">Add Ambassador</h3>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Full Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="Email (optional)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="4-digit PIN for login" maxLength={4} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g,'') })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" rows={2} />
            </div>
            <button onClick={handleCreate} disabled={submitting} className="w-full mt-4 py-3 bg-primary-blue text-white font-bold rounded-xl text-sm cursor-pointer">
              {submitting ? 'Creating...' : 'Create Ambassador'}
            </button>
          </motion.div>
        </div>
      )}

      {pinModalAmbassador && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-900">Enter PIN</h3>
              <button onClick={() => { setPinModalAmbassador(null); setEnteredPin(''); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Enter {pinModalAmbassador.full_name}'s PIN to view their dashboard.</p>
            <form onSubmit={handlePinSubmit}>
              <input type="password" placeholder="4-digit PIN" maxLength={4} value={enteredPin} onChange={e => setEnteredPin(e.target.value.replace(/\D/g,''))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-lg tracking-[1em] font-mono focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all" autoFocus />
              <button type="submit" disabled={verifyingPin} className="w-full mt-4 py-3 bg-primary-blue text-white font-bold rounded-xl text-sm cursor-pointer">
                {verifyingPin ? 'Verifying...' : 'Unlock Dashboard'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
