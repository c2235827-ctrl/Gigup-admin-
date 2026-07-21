import { useState, useEffect } from 'react';
import { AlertTriangle, Power } from 'lucide-react';
import { fetchMaintenanceMode, toggleMaintenanceMode } from '../services/api';

interface MaintenanceModeCardProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function MaintenanceModeCard({ adminSecret, addToast }: MaintenanceModeCardProps) {
  const [status, setStatus] = useState<{ active: boolean; title: string; message: string; started_at: string | null } | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadStatus = async () => {
    try {
      const result = await fetchMaintenanceMode(adminSecret);
      setStatus(result);
      if (result) {
        setCustomMessage(result.message || '');
      }
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to load maintenance mode status');
    }
  };

  useEffect(() => {
    loadStatus();
  }, [adminSecret]);

  const handleActivate = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await toggleMaintenanceMode(
        adminSecret,
        true,
        'Scheduled Maintenance',
        customMessage.trim() || undefined
      );
      if (result.success) {
        addToast('warning', result.message || 'Maintenance mode activated successfully');
        setShowConfirm(false);
        await loadStatus();
      } else {
        addToast('error', 'Failed to activate maintenance mode');
      }
    } catch (err: any) {
      addToast('error', err?.message || 'Error occurred while activating maintenance mode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await toggleMaintenanceMode(adminSecret, false);
      if (result.success) {
        addToast('success', result.message || 'Maintenance mode deactivated successfully');
        await loadStatus();
      } else {
        addToast('error', 'Failed to deactivate maintenance mode');
      }
    } catch (err: any) {
      addToast('error', err?.message || 'Error occurred while deactivating maintenance mode');
    } finally {
      setIsLoading(false);
    }
  };

  if (!status) return null;

  return (
    <div className={`rounded-xl border-2 p-6 transition-all duration-200 ${status.active ? 'bg-red-50 border-danger' : 'bg-white border-slate-105'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Power className={`w-5 h-5 ${status.active ? 'text-danger' : 'text-success'}`} />
          <h3 className="text-sm font-bold text-slate-900 font-sans">Platform Status</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] tracking-wider font-bold font-sans ${status.active ? 'bg-danger text-white animate-pulse' : 'bg-green-100 text-success'}`}>
          {status.active ? '🔴 MAINTENANCE MODE' : '🟢 LIVE'}
        </span>
      </div>

      {status.active && (
        <div className="bg-white/75 rounded-lg p-3 mb-4 border border-red-100 shadow-sm">
          <p className="text-xs font-bold text-danger mb-1 font-sans">{status.title || 'Scheduled Maintenance'}</p>
          <p className="text-xs text-slate-650 font-sans leading-relaxed">{status.message}</p>
          {status.started_at && (
            <p className="text-[10px] text-slate-400 mt-2 font-mono">
              Activated: {new Date(status.started_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {status.active ? (
        <button
          onClick={handleDeactivate}
          disabled={isLoading}
          className="w-full py-3 bg-success hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer transition-colors shadow-sm font-sans"
        >
          {isLoading ? 'Deactivating...' : '✅ Turn Off Maintenance Mode — Resume Deposits'}
        </button>
      ) : (
        <>
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isLoading}
              className="w-full py-3 bg-danger hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 transition-colors shadow-sm font-sans"
            >
              <AlertTriangle className="w-4 h-4 animate-bounce" /> Activate Maintenance Mode
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="Message shown to users (e.g. what's down, expected resolution time)"
                rows={3}
                className="w-full px-3 py-2 border border-slate-205 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-danger/15 focus:border-danger transition-all font-sans"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-205 disabled:opacity-50 text-slate-600 font-bold rounded-xl text-xs cursor-pointer transition-colors font-sans border-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-danger hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors font-sans border-none"
                >
                  {isLoading ? 'Activating...' : 'Confirm — Block Deposits'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
