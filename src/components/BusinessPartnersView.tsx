import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Store, X, Copy, RefreshCw, DollarSign, Users, TrendingUp } from 'lucide-react';
import {
  fetchBusinessPartners, fetchBusinessPartnerDetail, createBusinessPartner,
  recalculatePartnerTier, recordPartnerPayout, updateBusinessPartner, deleteBusinessPartner,
} from '../services/api';
import { BusinessPartner, BusinessPartnerDetail } from '../types';
import { formatNaira } from '../utils/formatters';

interface BusinessPartnersViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  restaurant: '🍽️ Restaurant',
  cybercafe: '💻 Cybercafe',
  pos_agent: '💳 POS Agent',
  community_org: '⛪ Community/Org',
  other: '🏪 Other',
};

export default function BusinessPartnersView({ adminSecret, addToast }: BusinessPartnersViewProps) {
  const [partners, setPartners] = useState<BusinessPartner[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<BusinessPartnerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPartner, setNewPartner] = useState({
    business_name: '', contact_name: '', phone: '', email: '', business_type: 'restaurant', notes: '',
  });
  const [payoutAmount, setPayoutAmount] = useState('');

  const load = async () => {
    setIsLoading(true);
    const result = await fetchBusinessPartners(adminSecret);
    setPartners(result);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleViewDetail = async (id: string) => {
    const detail = await fetchBusinessPartnerDetail(adminSecret, id);
    if (detail) setSelectedDetail(detail);
  };

  const handleCreate = async () => {
    if (!newPartner.business_name.trim() || !newPartner.phone.trim()) {
      addToast('warning', 'Business name and phone are required');
      return;
    }
    const result = await createBusinessPartner(adminSecret, newPartner);
    if (result.success) {
      addToast('success', `Partner created! Code: ${result.partner?.referral_code}`);
      setShowCreateModal(false);
      setNewPartner({ business_name: '', contact_name: '', phone: '', email: '', business_type: 'restaurant', notes: '' });
      load();
    } else {
      addToast('error', 'Failed to create partner');
    }
  };

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(`https://gigupnigeria.com/?ref=${code}`);
    addToast('success', 'Signup link copied!');
  };

  const handleRecalculate = async (id: string) => {
    const result = await recalculatePartnerTier(adminSecret, id);
    if (result.success) {
      addToast('success', `Tier updated: ${result.partner?.tier_label} — ₦${result.partner?.monthly_pay}`);
      load();
      if (selectedDetail?.partner.id === id) handleViewDetail(id);
    }
  };

  const handlePayout = async () => {
    if (!selectedDetail || !payoutAmount) return;
    const result = await recordPartnerPayout(adminSecret, selectedDetail.partner.id, Number(payoutAmount));
    if (result.success) {
      addToast('success', 'Payout recorded');
      setPayoutAmount('');
      handleViewDetail(selectedDetail.partner.id);
      load();
    }
  };

  const handleSuspend = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const result = await updateBusinessPartner(adminSecret, id, { status: newStatus });
    if (result.success) {
      addToast('success', newStatus === 'suspended' ? 'Partner suspended' : 'Partner reactivated');
      handleViewDetail(id);
      load();
    }
  };

  const handleDelete = async (id: string, businessName: string) => {
    const confirmed = confirm(`Permanently delete "${businessName}"? This cannot be undone. Their referral code will stop working immediately.`);
    if (!confirmed) return;

    try {
      const result = await deleteBusinessPartner(adminSecret, id);
      if (result.success) {
        addToast('success', 'Partner deleted');
        setSelectedDetail(null);
        await load();
      } else {
        addToast('error', 'Failed to delete partner — please try again');
        console.error('Delete failed:', result);
      }
    } catch (error) {
      addToast('error', 'An error occurred while deleting');
      console.error('Delete error:', error);
    }
  };

  if (selectedDetail) {
    const p = selectedDetail.partner;
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedDetail(null)} className="text-xs font-bold text-primary-blue cursor-pointer">← Back to all partners</button>

        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{p.business_name}</h2>
              <p className="text-xs text-slate-400">{BUSINESS_TYPE_LABELS[p.business_type]} · {p.contact_name}</p>
              <p className="text-xs text-slate-400 mt-1">{p.phone} {p.email ? `· ${p.email}` : ''}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              p.status === 'active' ? 'bg-green-100 text-success' :
              p.status === 'trial' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
            }`}>{p.status.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-2 mt-4 bg-slate-50 rounded-xl p-3">
            <code className="text-sm font-bold text-primary-blue flex-1">{p.referral_code}</code>
            <button onClick={() => handleCopyLink(p.referral_code)} className="p-2 bg-white rounded-lg border cursor-pointer">
              <Copy className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-2xl font-black font-mono text-slate-900">{selectedDetail.total_referrals}</p>
              <p className="text-[10px] text-slate-400 uppercase">Total Referrals</p>
            </div>
            <div>
              <p className="text-2xl font-black font-mono text-success">{selectedDetail.qualified_referrals}</p>
              <p className="text-[10px] text-slate-400 uppercase">Qualified</p>
            </div>
            <div>
              <p className="text-lg font-black text-slate-900">{selectedDetail.current_tier.tier_label}</p>
              <p className="text-[10px] text-slate-400 uppercase">Current Tier</p>
            </div>
            <div>
              <p className="text-lg font-black text-primary-blue">{formatNaira(selectedDetail.current_tier.monthly_pay)}</p>
              <p className="text-[10px] text-slate-400 uppercase">Monthly Pay</p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={() => handleRecalculate(p.id)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Recalculate Tier
            </button>
            <button
              onClick={() => handleSuspend(p.id, p.status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${p.status === 'suspended' ? 'bg-green-100 text-success' : 'bg-amber-100 text-amber-600'}`}
            >
              {p.status === 'suspended' ? '▶ Reactivate' : '⏸ Suspend'}
            </button>
            <button
              onClick={() => handleDelete(p.id, p.business_name)}
              className="px-4 py-2 bg-red-100 text-danger rounded-lg text-xs font-bold cursor-pointer"
            >
              🗑 Delete Partner
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Payout Tracking</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div><p className="text-lg font-black">{formatNaira(p.total_earned)}</p><p className="text-[10px] text-slate-400">Total Earned</p></div>
            <div><p className="text-lg font-black text-success">{formatNaira(p.total_paid)}</p><p className="text-[10px] text-slate-400">Total Paid</p></div>
            <div><p className="text-lg font-black text-danger">{formatNaira(p.balance_owed)}</p><p className="text-[10px] text-slate-400">Balance Owed</p></div>
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="Amount paid" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <button onClick={handlePayout} className="px-4 py-2 bg-primary-blue text-white text-xs font-bold rounded-lg cursor-pointer">Record Payout</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-105 shadow-geometric divide-y divide-[#EEF1F8]">
          <h3 className="text-sm font-bold text-slate-700 p-4">Referred Users</h3>
          {selectedDetail.referred_users.map(u => (
            <div key={u.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{u.full_name}</p>
                <p className="text-xs text-slate-400">{u.phone}</p>
              </div>
              <span className={`text-xs font-bold ${u.first_topup_done ? 'text-success' : 'text-slate-400'}`}>
                {u.first_topup_done ? '✓ Qualified' : 'Not funded yet'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Business Partners</h1>
          <p className="text-xs text-slate-400 mt-1">Restaurants, cybercafes, POS agents & community partners</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 flex items-center gap-2 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-xs font-bold rounded-lg bg-primary-blue text-white flex items-center gap-2 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Partner
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-105 shadow-geometric divide-y divide-[#EEF1F8]">
        {partners.length === 0 && <p className="p-8 text-center text-slate-400 text-sm">No business partners yet</p>}
        {partners.map(p => (
          <button key={p.id} onClick={() => handleViewDetail(p.id)} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-blue" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">{p.business_name}</p>
                <p className="text-[10px] text-slate-400">{BUSINESS_TYPE_LABELS[p.business_type]} · {p.qualified_referrals} qualified referrals</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-primary-blue">{formatNaira(p.monthly_pay)}</p>
              <span className={`text-[10px] font-bold ${p.status === 'active' ? 'text-success' : 'text-amber-600'}`}>{p.status.toUpperCase()}</span>
            </div>
          </button>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-900">Add Business Partner</h3>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Business Name" value={newPartner.business_name} onChange={e => setNewPartner({ ...newPartner, business_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="Contact Person Name" value={newPartner.contact_name} onChange={e => setNewPartner({ ...newPartner, contact_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="Phone" value={newPartner.phone} onChange={e => setNewPartner({ ...newPartner, phone: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="Email (optional)" value={newPartner.email} onChange={e => setNewPartner({ ...newPartner, email: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <select value={newPartner.business_type} onChange={e => setNewPartner({ ...newPartner, business_type: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                <option value="restaurant">Restaurant</option>
                <option value="cybercafe">Cybercafe</option>
                <option value="pos_agent">POS Agent</option>
                <option value="community_org">Community/Youth Org</option>
                <option value="other">Other</option>
              </select>
              <textarea placeholder="Notes (optional)" value={newPartner.notes} onChange={e => setNewPartner({ ...newPartner, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <button onClick={handleCreate} className="w-full mt-4 py-3 bg-primary-blue text-white font-bold rounded-xl text-sm cursor-pointer">Create Partner & Generate Code</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
