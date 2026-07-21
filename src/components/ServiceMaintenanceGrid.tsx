import { useState, useEffect } from 'react';
import { AlertTriangle, Wallet, Signal, Phone, Tv, Zap, Printer } from 'lucide-react';
import { fetchAllServiceMaintenance, toggleServiceMaintenance } from '../services/api';

interface ServiceMaintenanceGridProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const SERVICE_META: Record<string, { label: string; icon: any }> = {
  deposits: { label: 'Deposits', icon: Wallet },
  data: { label: 'Data', icon: Signal },
  airtime: { label: 'Airtime', icon: Phone },
  cable: { label: 'Cable TV', icon: Tv },
  electricity: { label: 'Electricity', icon: Zap },
  recharge_cards: { label: 'Recharge Cards', icon: Printer },
};

export default function ServiceMaintenanceGrid({ adminSecret, addToast }: ServiceMaintenanceGridProps) {
  const [services, setServices] = useState<any[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftHours, setDraftHours] = useState('24');
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    try {
      const result = await fetchAllServiceMaintenance(adminSecret);
      setServices(result);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to load service maintenance statuses');
    }
  };

  useEffect(() => {
    load();
  }, [adminSecret]);

  const handleActivate = async (serviceKey: string) => {
    if (isLoading) return;
    setIsLoading(true);
    const meta = SERVICE_META[serviceKey] || { label: serviceKey };
    try {
      const result = await toggleServiceMaintenance(
        adminSecret,
        serviceKey,
        true,
        `${meta.label} Under Maintenance`,
        draftMessage.trim() || `${meta.label} service is temporarily unavailable for maintenance.`,
        Number(draftHours) || undefined
      );
      if (result.success) {
        addToast('warning', result.message || `${meta.label} maintenance mode activated`);
        setEditingKey(null);
        setDraftMessage('');
        await load();
      } else {
        addToast('error', `Failed to activate maintenance for ${meta.label}`);
      }
    } catch (err: any) {
      addToast('error', err?.message || 'Error occurred while activating service maintenance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async (serviceKey: string) => {
    if (isLoading) return;
    setIsLoading(true);
    const meta = SERVICE_META[serviceKey] || { label: serviceKey };
    try {
      const result = await toggleServiceMaintenance(adminSecret, serviceKey, false);
      if (result.success) {
        addToast('success', result.message || `${meta.label} is now active and live`);
        await load();
      } else {
        addToast('error', `Failed to deactivate maintenance for ${meta.label}`);
      }
    } catch (err: any) {
      addToast('error', err?.message || 'Error occurred while deactivating service maintenance');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-1 font-sans">Service Maintenance Control</h3>
      <p className="text-xs text-slate-400 mb-5 font-sans">
        Turn off any service independently — others stay live. E.g. disabling Deposits does NOT block Data purchases for users with existing wallet balance.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map(s => {
          const meta = SERVICE_META[s.service_key] || { label: s.service_key, icon: AlertTriangle };
          const Icon = meta.icon;

          return (
            <div 
              key={s.service_key} 
              className={`rounded-xl border-2 p-4 transition-all duration-200 ${
                s.active 
                  ? 'bg-red-50 border-danger/60 shadow-sm' 
                  : 'bg-slate-50 border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${s.active ? 'bg-danger/10 text-danger' : 'bg-slate-200/50 text-slate-600'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 font-sans">{meta.label}</span>
                </div>
                <span className={`text-[10px] tracking-wider font-extrabold px-2 py-0.5 rounded-full font-sans ${s.active ? 'bg-danger text-white animate-pulse' : 'bg-green-100 text-success'}`}>
                  {s.active ? 'DOWN' : 'LIVE'}
                </span>
              </div>

              {s.active && (
                <div className="mb-3 bg-white/60 rounded-lg p-2.5 border border-red-100/50">
                  <p className="text-xs text-slate-650 font-sans leading-relaxed">{s.message}</p>
                  {s.expected_end_at && (
                    <p className="text-[10px] text-amber-600 font-mono mt-1">
                      Expected back: {new Date(s.expected_end_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {s.active ? (
                <button 
                  onClick={() => handleDeactivate(s.service_key)} 
                  disabled={isLoading}
                  className="w-full py-2 bg-success hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors font-sans border-none"
                >
                  {isLoading ? 'Processing...' : 'Turn Back On'}
                </button>
              ) : editingKey === s.service_key ? (
                <div className="space-y-2 mt-2">
                  <textarea
                    value={draftMessage}
                    onChange={e => setDraftMessage(e.target.value)}
                    placeholder="Custom offline message shown to users..."
                    rows={2}
                    className="w-full px-2 py-1.5 border border-slate-205 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-danger/10 focus:border-danger font-sans"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-slate-500 font-sans shrink-0">Duration (hrs):</label>
                    <input
                      type="number"
                      value={draftHours}
                      onChange={e => setDraftHours(e.target.value)}
                      placeholder="e.g. 24"
                      className="w-full px-2 py-1 border border-slate-205 rounded-lg text-xs bg-white font-sans"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingKey(null)} 
                      disabled={isLoading}
                      className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-600 text-[10px] font-bold rounded-lg cursor-pointer font-sans border-none"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleActivate(s.service_key)} 
                      disabled={isLoading}
                      className="flex-1 py-1.5 bg-danger hover:bg-red-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg cursor-pointer font-sans border-none"
                    >
                      {isLoading ? 'Starting...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setEditingKey(s.service_key);
                    setDraftMessage('');
                    setDraftHours('24');
                  }} 
                  disabled={isLoading}
                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-colors font-sans border-none"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Take Down
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
