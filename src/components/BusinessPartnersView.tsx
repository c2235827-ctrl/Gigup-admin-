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
    bank_name: '', account_number: '', account_name: '',
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPartner, setEditPartner] = useState({
    id: '', business_name: '', contact_name: '', phone: '', email: '', business_type: 'restaurant', notes: '',
    bank_name: '', account_number: '', account_name: '',
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

  const handleOpenEditModal = (p: BusinessPartner) => {
    setEditPartner({
      id: p.id,
      business_name: p.business_name,
      contact_name: p.contact_name || '',
      phone: p.phone,
      email: p.email || '',
      business_type: p.business_type,
      notes: p.notes || '',
      bank_name: p.bank_name || '',
      account_number: p.account_number || '',
      account_name: p.account_name || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editPartner.business_name.trim() || !editPartner.phone.trim()) {
      addToast('warning', 'Business name and phone are required');
      return;
    }
    const { id, ...updates } = editPartner;
    const result = await updateBusinessPartner(adminSecret, id, updates);
    if (result.success) {
      addToast('success', 'Partner updated successfully!');
      setShowEditModal(false);
      handleViewDetail(id);
      load();
    } else {
      addToast('error', 'Failed to update partner');
    }
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
      setNewPartner({ business_name: '', contact_name: '', phone: '', email: '', business_type: 'restaurant', notes: '', bank_name: '', account_number: '', account_name: '' });
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

          <div className="bg-slate-50 rounded-xl p-4 space-y-2 mt-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Payment Details</h4>
            {p.bank_name ? (
              <>
                <p className="text-sm">🏦 {p.bank_name}</p>
                <p className="text-sm font-mono">{p.account_number}</p>
                <p className="text-sm text-slate-500">{p.account_name}</p>
              </>
            ) : (
              <p className="text-xs text-amber-600">⚠️ No bank details on file — contact partner to collect before payout</p>
            )}
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
            <button onClick={() => handleOpenEditModal(p)} className="px-4 py-2 bg-blue-50 text-primary-blue border border-blue-200 rounded-lg text-xs font-bold cursor-pointer">
              ✏ Edit Partner
            </button>
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
              <input placeholder="Bank Name" value={newPartner.bank_name} onChange={e => setNewPartner({ ...newPartner, bank_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="Account Number" value={newPartner.account_number} onChange={e => setNewPartner({ ...newPartner, account_number: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="Account Name" value={newPartner.account_name} onChange={e => setNewPartner({ ...newPartner, account_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <textarea placeholder="Notes (optional)" value={newPartner.notes} onChange={e => setNewPartner({ ...newPartner, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <button onClick={handleCreate} className="w-full mt-4 py-3 bg-primary-blue text-white font-bold rounded-xl text-sm cursor-pointer">Create Partner & Generate Code</button>
          </motion.div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-900">Edit Business Partner</h3>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Business Name</label>
                <input placeholder="Business Name" value={editPartner.business_name} onChange={e => setEditPartner({ ...editPartner, business_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contact Person Name</label>
                <input placeholder="Contact Person Name" value={editPartner.contact_name} onChange={e => setEditPartner({ ...editPartner, contact_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone</label>
                <input placeholder="Phone" value={editPartner.phone} onChange={e => setEditPartner({ ...editPartner, phone: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
                <input placeholder="Email (optional)" value={editPartner.email} onChange={e => setEditPartner({ ...editPartner, email: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Business Type</label>
                <select value={editPartner.business_type} onChange={e => setEditPartner({ ...editPartner, business_type: e.target.value as any })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  <option value="restaurant">Restaurant</option>
                  <option value="cybercafe">Cybercafe</option>
                  <option value="pos_agent">POS Agent</option>
                  <option value="community_org">Community/Youth Org</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-3 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Details</p>
                <input placeholder="Bank Name" value={editPartner.bank_name} onChange={e => setEditPartner({ ...editPartner, bank_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
                <input placeholder="Account Number" value={editPartner.account_number} onChange={e => setEditPartner({ ...editPartner, account_number: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
                <input placeholder="Account Name" value={editPartner.account_name} onChange={e => setEditPartner({ ...editPartner, account_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
                <textarea placeholder="Notes (optional)" value={editPartner.notes} onChange={e => setEditPartner({ ...editPartner, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
            <button onClick={handleSaveEdit} className="w-full mt-4 py-3 bg-primary-blue text-white font-bold rounded-xl text-sm cursor-pointer">Save Changes</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
