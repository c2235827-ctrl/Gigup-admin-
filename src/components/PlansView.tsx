import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit3, 
  Radio, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Cpu, 
  DollarSign,
  ChevronRight,
  Sparkles,
  Layers,
  Settings
} from 'lucide-react';
import { Plan } from '../types';
import { fetchManageData, updatePlan, addPlan } from '../services/api';
import { formatNaira } from '../utils/formatters';

interface PlansViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function PlansView({ adminSecret, addToast }: PlansViewProps) {
  const [activeTab, setActiveTab] = useState<'MTN' | 'GLO' | 'AIRTEL'>('MTN');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals management
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Custom Deactivate Confirmation Modal state
  const [pendingTogglePlan, setPendingTogglePlan] = useState<Plan | null>(null);

  // Action loaders
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New plan form schema
  const [newPlanForm, setNewPlanForm] = useState({
    network: 'MTN',
    plan_name: '',
    size_label: '',
    price: 0,
    smedata_plan_id: '',
    validity: '30 Days'
  });

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const response = await fetchManageData(adminSecret);
      setPlans(response.plans || []);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to query plans list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleToggleActiveClick = (plan: Plan) => {
    // If we are enabling a plan, we do it instantly. 
    // If disabling, we show our custom modal overlay to confirm.
    if (plan.active) {
      setPendingTogglePlan(plan);
    } else {
      executePlanToggle(plan, true);
    }
  };

  const executePlanToggle = async (plan: Plan, nextActive: boolean) => {
    setIsLoading(true);
    try {
      const outcome = await updatePlan(adminSecret, plan.id, plan.price, nextActive);
      if (outcome.success) {
        addToast('success', `Plan "${plan.plan_name}" ${nextActive ? 'activated' : 'deactivated'} successfully!`);
        loadPlans();
      } else {
        addToast('error', outcome.message || 'Could not update plan status.');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Operation failed.');
    } finally {
      setIsLoading(false);
      setPendingTogglePlan(null);
    }
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    if (editingPlan.price <= 0) {
      addToast('error', 'Please enter a valid amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updatePlan(adminSecret, editingPlan.id, editingPlan.price, editingPlan.active);
      if (result.success) {
        addToast('success', `Pricing for "${editingPlan.plan_name}" set to ${formatNaira(editingPlan.price)}`);
        setEditingPlan(null);
        loadPlans();
      } else {
        addToast('error', result.message || 'Plan update was not successful.');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Pricing update failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanForm.plan_name.trim() || !newPlanForm.size_label.trim() || !newPlanForm.smedata_plan_id.trim()) {
      addToast('error', 'Please complete all required forms.');
      return;
    }
    if (newPlanForm.price <= 0) {
      addToast('error', 'Rate must be higher than 0 Naira.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await addPlan(adminSecret, newPlanForm);
      if (response.success) {
        addToast('success', `New VTU Plan "${newPlanForm.plan_name}" added successfully!`);
        setIsAddModalOpen(false);
        // Reset Form
        setNewPlanForm({
          network: activeTab,
          plan_name: '',
          size_label: '',
          price: 0,
          smedata_plan_id: '',
          validity: '30 Days'
        });
        loadPlans();
      } else {
        addToast('error', response.message || 'Failed to add plan catalog.');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Add plan transaction failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPlans = plans.filter(p => p.network.toUpperCase() === activeTab.toUpperCase());

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            VTU Operator Plans
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Reconfigure selling prices, toggle active packages, or add new SME plans.
          </p>
        </div>

        <button
          onClick={() => {
            setNewPlanForm(prev => ({ ...prev, network: activeTab }));
            setIsAddModalOpen(true);
          }}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-primary-blue hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-primary-blue/25 transition-all cursor-pointer hover:shadow-lg active:translate-y-[0.5px] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Plan</span>
        </button>
      </div>

      {/* FILTER OPERATOR TABS */}
      <div className="flex border-b border-slate-200">
        {(['MTN', 'GLO', 'AIRTEL'] as const).map((net) => {
          const isActive = activeTab === net;
          const count = plans.filter(p => p.network.toUpperCase() === net.toUpperCase()).length;
          return (
            <button
              key={net}
              onClick={() => setActiveTab(net)}
              className={`px-6 py-4 font-semibold text-sm relative transition-all cursor-pointer whitespace-nowrap ${
                isActive ? 'text-primary-blue scale-[1.02]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{net} Carrier</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${isActive ? 'bg-blue-50 text-primary-blue' : 'bg-slate-150 text-slate-500'}`}>
                  {count}
                </span>
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activePlanTabState" 
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-blue rounded-t-full" 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* PLANS LIST GRID */}
      <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Package Name</th>
                <th className="px-6 py-4 text-center">Size Tag</th>
                <th className="px-6 py-4 text-right">Price (₦)</th>
                <th className="px-6 py-4">SMEDATA Plan ID</th>
                <th className="px-6 py-4">Validity</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F8] text-xs">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-8 mx-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-full w-12 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-slate-100 rounded-lg w-10 mx-auto" /></td>
                  </tr>
                ))
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No VTU plans added for {activeTab}. Click "Add Custom Plan" to create one.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {plan.plan_name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {plan.size_label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <strong className="text-sm font-bold text-slate-900 font-mono">
                        {formatNaira(plan.price)}
                      </strong>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 font-medium">
                      {plan.smedata_plan_id}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {plan.validity}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActiveClick(plan)}
                        className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none cursor-pointer ${
                          plan.active ? 'bg-success' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                          plan.active ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setEditingPlan({ ...plan })}
                        className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold active:translate-y-[0.5px]"
                        title="Edit Selling Rate"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED PRICE MODAL */}
      <AnimatePresence>
        {editingPlan && (
          <div id="price-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPlan(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', duration: 0.3 } }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full z-10 overflow-hidden"
            >
              <div className="bg-primary-dark text-white p-5 flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider">Configure Selling Price</h3>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="p-1 text-slate-300 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePrice} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Selected Package
                  </label>
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                    <span className="block font-bold text-slate-800 text-sm">{editingPlan.plan_name}</span>
                    <span className="text-[11px] text-text-muted mt-1 block">Carrier Code ID: <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px]">{editingPlan.smedata_plan_id}</code></span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Selling Rate Price (₦)
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-700 font-bold">
                      ₦
                    </div>
                    <input
                      type="number"
                      required
                      value={editingPlan.price || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                      placeholder="Enter price in Naira"
                      className="w-full pl-8 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 focus:border-primary-blue transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-primary-blue hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Pricing'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED PLANNED ADD MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div id="add-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', duration: 0.3 } }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full z-10 overflow-hidden"
            >
              <div className="bg-primary-dark text-white p-5 flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider">Add Custom operator Plan</h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-300 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddPlanSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Carrier Operator
                    </label>
                    <select
                      value={newPlanForm.network}
                      onChange={(e) => setNewPlanForm({ ...newPlanForm, network: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 transition-all cursor-pointer"
                    >
                      <option value="MTN">MTN</option>
                      <option value="GLO">GLO</option>
                      <option value="AIRTEL">AIRTEL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Size label
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1GB, 4.5GB"
                      value={newPlanForm.size_label}
                      onChange={(e) => setNewPlanForm({ ...newPlanForm, size_label: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Plan Display Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MTN 1GB Monthly SME"
                    value={newPlanForm.plan_name}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, plan_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Price/Rate (₦)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="Selling price"
                      value={newPlanForm.price || ''}
                      onChange={(e) => setNewPlanForm({ ...newPlanForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Validity Days
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 30 Days, 14 Days"
                      value={newPlanForm.validity}
                      onChange={(e) => setNewPlanForm({ ...newPlanForm, validity: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    SMEDATA Provider Plan ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mtn-sme-1gb, glo125"
                    value={newPlanForm.smedata_plan_id}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, smedata_plan_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 transition-all"
                  />
                  <p className="text-[10px] text-text-muted mt-1.5">
                    Must align with your VTU API credentials system identifiers.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-primary-blue hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Plan Catalog'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION OVERLAY FOR PLAN TOGGLE */}
      <AnimatePresence>
        {pendingTogglePlan && (
          <div id="confirm-modal-overlay" className="fixed inset-0 z-55 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingTogglePlan(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', duration: 0.25 } }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full z-10 overflow-hidden"
            >
              <div className="bg-amber-50 text-warning px-5 py-4 flex gap-3 items-center border-b border-amber-100">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Deactivate Plan Confirmation</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-slate-600 text-sm leading-relaxed">
                  Are you sure you want to deactivate <strong className="text-slate-900 font-semibold">"{pendingTogglePlan.plan_name}"</strong>? This will immediately hide the plan from customers on the client application storefront.
                </p>
                <div className="flex gap-2 justify-end pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => setPendingTogglePlan(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Keep Active
                  </button>
                  <button
                    type="button"
                    onClick={() => executePlanToggle(pendingTogglePlan, false)}
                    className="px-4 py-2 bg-danger hover:bg-red-650 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Confirm Deactivation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
