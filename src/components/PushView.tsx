import { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Users, UserX, User, Send } from 'lucide-react';
import { sendPushNotification, fetchUserActivity } from '../services/api';
import { UserActivity } from '../types';

interface PushViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const QUICK_MESSAGES = [
  { label: '💰 Bonus reminder', title: '💰 You have ₦500 waiting!', message: 'Your welcome bonus is still unused! Buy cheap data now on GigUp Nigeria 🚀' },
  { label: '📦 Data promo', title: '🔥 Cheap Data Alert!', message: 'Buy MTN, GLO or Airtel data at below-retail price + earn 10% cashback. Open GigUp now!' },
  { label: '🎁 Referral push', title: '🎁 Earn free data!', message: 'Refer a friend to GigUp and you both get 500MB free data. Share your code now!' },
  { label: '👋 We miss you', title: '👋 We miss you!', message: 'You haven\'t bought data in a while. Come back to GigUp and enjoy cheap bundles + 10% cashback 💙' },
];

export default function PushView({ adminSecret, addToast }: PushViewProps) {
  const [target, setTarget] = useState<'all' | 'inactive' | 'user'>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [inactiveDays, setInactiveDays] = useState(3);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ recipients: number } | null>(null);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const loadUsers = async () => {
    if (usersLoaded) return;
    try {
      const result = await fetchUserActivity(adminSecret);
      setUsers(result.users);
      setUsersLoaded(true);
    } catch { /* silent */ }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      addToast('error', 'Title and message are required');
      return;
    }
    if (target === 'user' && !selectedUserId) {
      addToast('error', 'Select a user to send to');
      return;
    }

    setIsSending(true);
    setLastResult(null);
    try {
      const result = await sendPushNotification(adminSecret, {
        title: title.trim(),
        message: message.trim(),
        target,
        user_id: target === 'user' ? selectedUserId : undefined,
        inactive_days: target === 'inactive' ? inactiveDays : undefined,
      });
      setLastResult({ recipients: result.recipients });
      addToast('success', `✅ Notification sent to ${result.recipients} user(s)`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const applyQuick = (q: typeof QUICK_MESSAGES[0]) => {
    setTitle(q.title);
    setMessage(q.message);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Push Notifications</h1>
        <p className="text-sm text-text-muted mt-1">
          Send push notifications to your users directly from the dashboard.
        </p>
      </div>

      {/* QUICK MESSAGES */}
      <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">⚡ Quick Templates</h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_MESSAGES.map(q => (
            <button
              key={q.label}
              onClick={() => applyQuick(q)}
              className="text-left px-3 py-2.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-primary-blue transition-all cursor-pointer text-slate-700"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* COMPOSE */}
      <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-900">Compose Message</h3>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Notification Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. 🔥 Cheap Data Alert!"
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-blue transition-colors bg-white font-sans text-slate-900"
          />
          <span className="text-[10px] text-slate-400 mt-1 block text-right font-mono">{title.length}/100</span>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your message here..."
            maxLength={300}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-blue transition-colors resize-none bg-white font-sans text-slate-900"
          />
          <span className="text-[10px] text-slate-400 mt-1 block text-right font-mono">{message.length}/300</span>
        </div>

        {/* Target */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-2">Send To</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'all', label: '👥 All Users', icon: <Users className="w-4 h-4" /> },
              { value: 'inactive', label: '😴 Inactive', icon: <UserX className="w-4 h-4" /> },
              { value: 'user', label: '👤 One User', icon: <User className="w-4 h-4" /> },
            ].map(t => (
              <button
                key={t.value}
                onClick={() => {
                  setTarget(t.value as any);
                  if (t.value === 'user') loadUsers();
                }}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  target === t.value
                    ? 'bg-primary-blue text-white border-primary-blue shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Inactive days selector */}
        {target === 'inactive' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Inactive for at least</label>
            <select
              value={inactiveDays}
              onChange={e => setInactiveDays(Number(e.target.value))}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-blue bg-white text-slate-800"
            >
              <option value={1}>1 day</option>
              <option value={2}>2 days</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
        )}

        {/* User selector */}
        {target === 'user' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Select User</label>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-blue bg-white text-slate-800"
            >
              <option value="">-- Choose a user --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.phone})</option>
              ))}
            </select>
          </div>
        )}

        {/* Preview */}
        {(title || message) && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Device Preview</p>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 max-w-sm">
              <div className="flex items-center gap-2 mb-1 select-none">
                <div className="w-5 h-5 bg-primary-blue rounded flex items-center justify-center text-[10px] text-white font-bold font-mono">
                  G
                </div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">GigUp Nigeria · now</span>
              </div>
              <p className="text-xs font-bold text-slate-900">{title || 'Notification Title'}</p>
              <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{message || 'Your message here...'}</p>
            </div>
          </div>
        )}

        {/* Send Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSend}
          disabled={isSending || !title.trim() || !message.trim()}
          className="w-full py-4 bg-primary-blue hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-primary-blue/20"
        >
          {isSending ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : <Send className="w-4 h-4" />}
          {isSending ? 'Sending push broadcast...' : 'Send Notification'}
        </motion.button>

        {/* Result */}
        {lastResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-sm font-bold text-success/90">
              &check; Successfully broadcasted to {lastResult.recipients} users!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
