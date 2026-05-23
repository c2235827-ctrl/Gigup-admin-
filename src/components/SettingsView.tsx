import { useState, useEffect } from 'react';
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
  Database
} from 'lucide-react';
import { AppSetting } from '../types';
import { fetchManageData, updateAppSetting, SETTING_LABELS } from '../services/api';
import { formatNaira } from '../utils/formatters';

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

  useEffect(() => {
    loadSettings();
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

    setIsSavingKey(key);
    try {
      const outcome = await updateAppSetting(adminSecret, key, editingValue.trim());
      if (outcome.success) {
        addToast('success', `Setting "${key}" updated successfully!`);
        setEditingKey(null);
        setEditingValue('');
        loadSettings(); // Reload rows
      } else {
        addToast('error', outcome.message || 'Error saving configuration.');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to sync settings database.');
    } finally {
      setIsSavingKey(null);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Global App Settings
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Adjust system purchase kickbacks, customize registration data awards, and set minimum payment triggers.
        </p>
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
          settings.map((setting) => {
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
    </div>
  );
}
