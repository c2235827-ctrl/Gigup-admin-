import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Percent, 
  Wallet, 
  UserPlus, 
  Share2, 
  Edit3, 
  Check, 
  X, 
  RefreshCw,
  HelpCircle,
  Database,
  CreditCard,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';
import { AppSetting, GatewayStatus } from '../types';
import { fetchManageData, updateAppSetting, SETTING_LABELS, fetchGatewayStatus, updateGateway } from '../services/api';
import { formatNaira } from '../utils/formatters';
import { addAuditLog } from '../utils/auditLogger';

interface SettingsViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function SettingsView({ adminSecret, addToast }: SettingsViewProps) {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Tracks which card keys are currently in Edit state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingKey, setIsSavingKey] = useState<string | null>(null);

  // Flutterwave Gateway State
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [isLoadingGateway, setIsLoadingGateway] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flwMode, setFlwMode] = useState<'test' | 'live'>('test');
  const [flwSecretKey, setFlwSecretKey] = useState('');
  const [flwPublicKey, setFlwPublicKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [isSavingGateway, setIsSavingGateway] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetchManageData(adminSecret);
      setSettings(response.settings || []);
    } catch (err: any) {
      addToast('error', err.message || 'Error occurred querying app settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGateway = async () => {
    setIsLoadingGateway(true);
    try {
      const resp = await fetchGatewayStatus(adminSecret);
      if (resp.success && resp.gateway) {
        setGateway(resp.gateway);
        setFlwMode(resp.gateway.flw_mode || 'test');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Error occurred loading Payment Gateway details.');
    } finally {
      setIsLoadingGateway(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadGateway();
  }, []);

  const handleStartEdit = (setting: AppSetting) => {
    setEditingKey(setting.key);
    setEditingValue(setting.value);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  const handleSaveSetting = async (key: string) => {
    if (!editingValue.trim() || isNaN(Number(editingValue)) || Number(editingValue) < 0) {
      addToast('error', 'Please enter a valid positive numeric value.');
      return;
    }

    const readableLabel = SETTING_LABELS[key as keyof typeof SETTING_LABELS] || key;
    setIsSavingKey(key);
    try {
      const outcome = await updateAppSetting(adminSecret, key, editingValue.trim());
      if (outcome.success) {
        addToast('success', `Setting "${key}" updated successfully!`);
        addAuditLog('setting', 'update_setting', `Successfully updated app setting "${readableLabel}" (${key}) to ${editingValue.trim()}`, 'success');
        setEditingKey(null);
        setEditingValue('');
        loadSettings(); // Reload rows
      } else {
        addToast('error', outcome.message || 'Error saving configuration.');
        addAuditLog('setting', 'update_setting', `Failed to update app setting "${readableLabel}" (${key}) to ${editingValue.trim()}: ${outcome.message}`, 'failed');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to sync settings database.');
      addAuditLog('setting', 'update_setting', `Error while attempting to update app setting "${readableLabel}" (${key}): ${err.message || err}`, 'failed');
    } finally {
      setIsSavingKey(null);
    }
  };

  const handleToggleSetting = async (key: string, currentValue: string) => {
    const nextValue = currentValue === 'true' ? 'false' : 'true';
    const readableLabel = SETTING_LABELS[key as keyof typeof SETTING_LABELS] || key;
    setIsLoading(true);
    try {
      const outcome = await updateAppSetting(adminSecret, key, nextValue);
      if (outcome.success) {
        addToast('success', `Setting "${readableLabel}" updated to ${nextValue === 'true' ? 'enabled' : 'disabled'}!`);
        addAuditLog('setting', 'update_setting', `Successfully toggled app setting "${readableLabel}" (${key}) to ${nextValue}`, 'success');
        loadSettings(); // Reload rows
      } else {
        addToast('error', outcome.message || 'Error saving configuration.');
        addAuditLog('setting', 'update_setting', `Failed to toggle app setting "${readableLabel}" (${key}) to ${nextValue}: ${outcome.message}`, 'failed');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to sync settings database.');
      addAuditLog('setting', 'update_setting', `Error while attempting to toggle app setting "${readableLabel}" (${key}): ${err.message || err}`, 'failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flwSecretKey.trim() || !flwPublicKey.trim()) {
      addToast('error', 'Both Secret Key and Public Key are required.');
      return;
    }
    
    setIsSavingGateway(true);
    try {
      const outcome = await updateGateway(adminSecret, {
        flw_secret_key: flwSecretKey.trim(),
        flw_public_key: flwPublicKey.trim(),
        flw_mode: flwMode
      });
      if (outcome.success) {
        addToast('success', outcome.message || 'Payment gateway settings updated successfully!');
        addAuditLog('gateway', 'update_gateway', `Successfully updated Flutterwave payment gateway credentials. Mode: ${flwMode.toUpperCase()}`, 'success');
        setIsModalOpen(false);
        setFlwSecretKey('');
        setFlwPublicKey('');
        loadGateway();
      } else {
        addToast('error', outcome.message || 'Error updating gateway settings.');
        addAuditLog('gateway', 'update_gateway', `Failed to update Flutterwave payment gateway credentials in mode ${flwMode.toUpperCase()}: ${outcome.message}`, 'failed');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save payment gateway configuration.');
      addAuditLog('gateway', 'update_gateway', `Error while configuring Flutterwave payment gateway: ${err.message || err}`, 'failed');
    } finally {
      setIsSavingGateway(false);
    }
  };

  // Helper to resolve nice icons per setting
  const getSettingIcon = (key: string) => {
    switch (key) {
      case 'cashback_rate':
        return <Percent className="w-5 h-5 text-indigo-500" />;
      case 'min_topup':
        return <Wallet className="w-5 h-5 text-emerald-500" />;
      case 'signup_bonus_mb':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'referral_bonus_mb':
        return <Share2 className="w-5 h-5 text-purple-500" />;
      default:
        return <Settings className="w-5 h-5 text-slate-500" />;
    }
  };

  // Helper to format values elegantly in display mode
  const getFormattedDisplayValue = (key: string, value: string) => {
    const num = Number(value);
    if (isNaN(num)) return value;

    switch (key) {
      case 'cashback_rate':
        return `${num}%`;
      case 'min_topup':
        return formatNaira(num);
      case 'signup_bonus_mb':
      case 'referral_bonus_mb':
        return `${num.toLocaleString()} MB`;
      default:
        return value;
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Global App Settings
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Adjust system purchase kickbacks, customize registration data awards, and set minimum payment triggers.
          </p>
        </div>
        <button
          onClick={() => { loadSettings(); loadGateway(); }}
          disabled={isLoading || isLoadingGateway}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-205 hover:bg-slate-100 disabled:opacity-55 text-slate-700 font-semibold rounded-lg text-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || isLoadingGateway) ? 'animate-spin' : ''}`} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* PAYMENT GATEWAY CONFIGURATION CARD */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6"
      >
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-50">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary-blue">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Payment Gateway</h2>
            <p className="text-xs text-text-muted mt-0.5">Configure online payments deposit flow using Flutterwave</p>
          </div>
        </div>

        {isLoadingGateway ? (
          <div className="h-28 flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-primary-blue" />
              <span>Loading payment settings...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left side settings */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gateway Mode:</span>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-205">
                  <button
                    type="button"
                    onClick={() => {
                      setFlwMode('test');
                      setIsModalOpen(true);
                      addToast('info', 'Updating Flutterwave mode to Test. Please specify keys.');
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      flwMode === 'test'
                        ? 'bg-primary-blue text-white shadow-sm'
                        : 'text-slate-650 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${flwMode === 'test' ? 'bg-white' : 'bg-slate-400'}`} />
                    TEST MODE
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFlwMode('live');
                      setIsModalOpen(true);
                      addToast('warning', 'Switching to Live Mode processes real payments. Secrets required.');
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      flwMode === 'live'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-650 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${flwMode === 'live' ? 'bg-white' : 'bg-slate-450'}`} />
                    LIVE MODE
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Config Status:</span>
                {gateway?.is_configured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    ✅ Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    ⚠️ Not set
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-sm font-mono flex-wrap">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 font-sans">Key Preview:</span>
                {gateway?.flw_secret_key_preview ? (
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
                    {gateway.flw_secret_key_preview}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">None configured</span>
                )}
              </div>
            </div>

            {/* Right side configure button */}
            <div className="md:text-right">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-primary-blue hover:bg-blue-600 active:translate-y-[1px] text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                Update Keys
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* DATA PROVIDER ROUTINGS CARD */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6 mt-6"
      >
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-50">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Data Provider Routings</h2>
            <p className="text-xs text-text-muted mt-0.5">Control dynamic routing of active carrier networks and providers</p>
          </div>
        </div>

        {/* Warning label requested by the user */}
        <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs leading-relaxed mb-6">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5 text-amber-900">Provider Routing Notice</p>
            <p>Disabling a provider hides its plans and stops routing to it. Plans with no available provider show as unavailable.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* SMEData plans enabled Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-205 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-slate-900">SMEData plans enabled</span>
              <p className="text-[11px] text-text-muted">key: smedata_data_enabled</p>
            </div>
            <button
              onClick={() => {
                const setting = settings.find(s => s.key === 'smedata_data_enabled');
                const val = setting?.value ?? 'true';
                handleToggleSetting('smedata_data_enabled', val);
              }}
              className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none cursor-pointer ${
                (settings.find(s => s.key === 'smedata_data_enabled')?.value ?? 'true') === 'true' ? 'bg-success' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                (settings.find(s => s.key === 'smedata_data_enabled')?.value ?? 'true') === 'true' ? 'translate-x-4.5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Peyflex plans enabled Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-205 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-slate-900">Peyflex plans enabled</span>
              <p className="text-[11px] text-text-muted">key: peyflex_data_enabled</p>
            </div>
            <button
              onClick={() => {
                const setting = settings.find(s => s.key === 'peyflex_data_enabled');
                const val = setting?.value ?? 'true';
                handleToggleSetting('peyflex_data_enabled', val);
              }}
              className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none cursor-pointer ${
                (settings.find(s => s.key === 'peyflex_data_enabled')?.value ?? 'true') === 'true' ? 'bg-success' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                (settings.find(s => s.key === 'peyflex_data_enabled')?.value ?? 'true') === 'true' ? 'translate-x-4.5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="border-t border-slate-105 my-2 pt-6">
        <h2 className="text-base font-bold text-slate-900 mb-1">Operational Config Keys</h2>
        <p className="text-xs text-text-muted mb-4">Core platform threshold values, fees and sign-up rewards</p>
      </div>

      {/* CARDS LIST CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-slate-105 rounded-xl shadow-geometric p-6 h-48 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-8 h-8 rounded-lg bg-slate-150" />
                <div className="w-16 h-4 bg-slate-100 rounded" />
              </div>
              <div className="h-6 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-50 rounded w-2/3" />
            </div>
          ))
        ) : settings.length === 0 ? (
          <div className="md:col-span-2 text-center py-12 bg-white rounded-xl border border-slate-105 shadow-geometric text-slate-400">
            No active configuration keys found in the system.
          </div>
        ) : (
          settings
            .filter((s) => s.key !== 'smedata_data_enabled' && s.key !== 'peyflex_data_enabled')
            .map((setting) => {
              const isEditing = editingKey === setting.key;
            const isSaving = isSavingKey === setting.key;
            const icon = getSettingIcon(setting.key);

            return (
              <motion.div
                layout
                key={setting.key}
                className={`bg-white rounded-xl border p-6 flex flex-col justify-between shadow-geometric transition-all ${
                  isEditing 
                    ? 'border-primary-blue hover:shadow-geometric-lg ring-2 ring-primary-blue/5' 
                    : 'border-slate-105 hover:border-slate-300 hover:shadow-geometric-lg'
                }`}
              >
                <div className="space-y-3">
                  {/* CARD HEADER */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        {icon}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{setting.label}</span>
                    </div>
                    <code className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {setting.key}
                    </code>
                  </div>

                  {/* VALUE CARD BODY */}
                  <div className="py-2.5">
                    {isEditing ? (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Edit Value Numeric Ratio
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            required
                            disabled={isSaving}
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            placeholder="Type new threshold"
                            className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 font-mono font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 focus:border-primary-blue transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveSetting(setting.key)}
                            disabled={isSaving}
                            className="p-2 py-2.5 bg-success hover:bg-green-600 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer shadow-sm active:translate-y-[0.5px]"
                            title="Commit Changes"
                          >
                            {isSaving ? (
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="p-2 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-650 rounded-xl transition-all cursor-pointer"
                            title="Discard Input"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 block">
                          {getFormattedDisplayValue(setting.key, setting.value)}
                        </span>
                        <p className="text-xs text-text-muted font-medium mt-1.5 leading-relaxed">
                          {setting.description || SETTING_LABELS[setting.key]?.desc}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* EDIT BUTTON ACTION BAR */}
                {!isEditing && (
                  <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                    <button
                      onClick={() => handleStartEdit(setting)}
                      className="inline-flex items-center gap-1.5 p-1 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-150 rounded-lg text-xs font-semibold cursor-pointer transition-all active:translate-y-[0.5px]"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit Setting</span>
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden"
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-blue" />
                <h3 className="font-bold text-slate-900 text-base">Update Flutterwave Keys</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-650 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGateway} className="p-6 space-y-5 animate-none">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Gateway Mode
                </label>
                <select
                  value={flwMode}
                  onChange={(e) => setFlwMode(e.target.value as 'test' | 'live')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-205 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 focus:border-primary-blue transition-all font-semibold"
                >
                  <option value="test">Test Mode (Simulation & Sandbox)</option>
                  <option value="live">Live Mode (Real Money Payments)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Flutterwave Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    required
                    value={flwSecretKey}
                    onChange={(e) => setFlwSecretKey(e.target.value)}
                    placeholder="e.g. FLWSECK_TEST-xxxxxx-X"
                    className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-205 text-slate-900 placeholder:text-slate-400 font-mono text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 focus:border-primary-blue transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Flutterwave Public Key
                </label>
                <div className="relative">
                  <input
                    type={showPublicKey ? 'text' : 'password'}
                    required
                    value={flwPublicKey}
                    onChange={(e) => setFlwPublicKey(e.target.value)}
                    placeholder="e.g. FLWPUBK_TEST-xxxxxx-X"
                    className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-205 text-slate-900 placeholder:text-slate-400 font-mono text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/15 focus:border-primary-blue transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPublicKey(!showPublicKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                  >
                    {showPublicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {flwMode === 'live' && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <p>
                    <strong>⚠️ Caution:</strong> Switching to Live mode processes real money transactions. Make sure your flutterwave API keys are 100% correct and corresponding to your live account.
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSavingGateway}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-250 disabled:opacity-50 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer border-none"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSavingGateway}
                  className="px-5 py-2.5 bg-primary-blue hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer border-none"
                >
                  {isSavingGateway ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Saving integration...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Config</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
