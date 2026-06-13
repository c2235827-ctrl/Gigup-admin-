import { Stats, Order, User, Plan, AppSetting, DashboardData, Withdrawal, GatewayStatus, AnalyticsData, MarginsData, UserActivity, SessionRecord, ActivitySummary, InactiveAccount, UserStreakAdmin, Ambassador, AmbassadorStats, AmbassadorDetail } from '../types';

const BASE_URL = 'https://ndcztauwnkycknrbbmix.supabase.co/functions/v1';

export const SETTING_LABELS: Record<string, { label: string; desc: string }> = {
  cashback_rate: { label: 'Cashback Rate (%)', desc: 'Percentage cashback awarded to users on every data purchase' },
  min_topup: { label: 'Minimum Top-Up (₦)', desc: 'Minimum amount required to fund a wallet' },
  signup_bonus_mb: { label: 'Signup Bonus (MB)', desc: 'Free data in MB given to users on registration' },
  referral_bonus_mb: { label: 'Referral Bonus (MB)', desc: 'Bonus data in MB awarded to both referrer and referee' },
  min_cashback_withdrawal: { label: 'Min Cashback Withdrawal (₦)', desc: 'Minimum cashback balance required to request a bank withdrawal' }
};

function getHeaders(secret: string): Record<string, string> {
  return {
    'x-admin-secret': secret,
    'Content-Type': 'application/json'
  };
}

// Sub-admins authenticate via x-sub-admin-secret instead of x-admin-secret.
// Pass role='sub_admin' to endpoints that support both (e.g. admin-get-orders, ambassador-dashboard, admin-ambassadors).
function getHeadersForRole(secret: string, role: 'admin' | 'sub_admin' = 'admin'): Record<string, string> {
  if (role === 'sub_admin') {
    return {
      'x-sub-admin-secret': secret,
      'Content-Type': 'application/json'
    };
  }
  return getHeaders(secret);
}

export async function checkSecret(secret: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/admin-stats`, {
    method: 'GET',
    headers: getHeaders(secret)
  });
  if (res.status === 200) return true;
  if (res.status === 401) return false;
  const text = await res.text();
  throw new Error(`Server error (${res.status}): ${text}`);
}

export async function fetchStats(secret: string, role: 'admin' | 'sub_admin' = 'admin'): Promise<DashboardData> {
  const res = await fetch(`${BASE_URL}/admin-stats`, { headers: getHeadersForRole(secret, role) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error(`Failed to load stats (${res.status})`);
  }
  return await res.json();
}

export async function fetchUsers(
  secret: string,
  page = 1,
  limit = 20,
  search = ''
): Promise<{ users: User[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  const res = await fetch(`${BASE_URL}/admin-get-users?${params}`, { headers: getHeaders(secret) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load users');
  }
  return await res.json();
}

export async function fetchOrders(
  secret: string,
  page = 1,
  limit = 20,
  status = 'all',
  network = 'all',
  search = '',
  amountZero = false,
  userId = '',
  role: 'admin' | 'sub_admin' = 'admin'
): Promise<{ orders: Order[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status && status !== 'all') params.set('status', status);
  if (network && network !== 'all') params.set('network', network);
  if (userId) params.set('user_id', userId);
  else if (search) params.set('search', search);
  if (amountZero) params.set('amount_zero', 'true');
  const res = await fetch(`${BASE_URL}/admin-get-orders?${params}`, { headers: getHeadersForRole(secret, role) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load orders');
  }
  return await res.json();
}

export async function fetchManageData(secret: string): Promise<{ plans: Plan[]; settings: AppSetting[] }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, { headers: getHeaders(secret) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load plans and settings');
  }
  const data = await res.json();
  const settings: AppSetting[] = (data.settings || []).map((s: any) => {
    const meta = SETTING_LABELS[s.key] || { label: s.key, desc: '' };
    return { key: s.key, value: String(s.value), label: meta.label, description: meta.desc };
  });
  return { plans: data.plans || [], settings };
}

export async function updatePlan(
  secret: string,
  id: string,
  price: number,
  active: boolean
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'update_plan', id, price, active })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to update plan');
  }
  return await res.json();
}

export async function addPlan(
  secret: string,
  plan: Omit<Plan, 'id' | 'active'>
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'add_plan', ...plan })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to add plan');
  }
  return await res.json();
}

export async function updateAppSetting(
  secret: string,
  key: string,
  value: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'update_setting', key, value })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to update setting');
  }
  return await res.json();
}

export async function requeryOrder(
  secret: string,
  smedataRef: string
): Promise<{ success: boolean; smedata_status: string; data?: any }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'requery_order', smedata_ref: smedataRef })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to requery order');
  }
  return await res.json();
}

export async function fetchWithdrawals(
  secret: string,
  status: 'pending' | 'paid' | 'rejected',
  role: 'admin' | 'sub_admin' = 'admin'
): Promise<{ success: boolean; withdrawals: Withdrawal[] }> {
  const res = await fetch(`${BASE_URL}/admin-manage?section=withdrawals&status=${status}`, {
    headers: getHeadersForRole(secret, role)
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load withdrawals');
  }
  return await res.json();
}

export async function processWithdrawal(
  secret: string,
  withdrawalId: string,
  status: 'paid' | 'rejected',
  adminNote?: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'process_withdrawal', withdrawal_id: withdrawalId, status, admin_note: adminNote })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to process withdrawal');
  }
  return await res.json();
}

export async function fetchGatewayStatus(secret: string): Promise<{ success: boolean; gateway: GatewayStatus }> {
  const res = await fetch(`${BASE_URL}/admin-manage?section=gateway`, { headers: getHeaders(secret) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load gateway status');
  }
  return await res.json();
}

export async function updateGateway(
  secret: string,
  data: {
    flw_secret_key: string;
    flw_public_key: string;
    flw_mode: 'test' | 'live';
  }
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'update_gateway', ...data })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to update gateway settings');
  }
  return await res.json();
}

export async function resendSignupBonus(
  secret: string,
  userId: string
): Promise<{ success: boolean; message: string; status: string }> {
  const res = await fetch(`${BASE_URL}/admin-resend-bonus`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ user_id: userId })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to resend bonus');
  }
  return await res.json();
}

export async function manualWalletCredit(
  secret: string,
  userId: string,
  amount: number,
  reference: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({
      action: 'manual_credit',
      user_id: userId,
      amount,
      reference
    })
  });
  if (!res.ok) throw new Error('Failed to credit wallet');
  return await res.json();
}

export async function fetchPendingPayments(
  secret: string
): Promise<{ success: boolean; pending: any[] }> {
  const res = await fetch(`${BASE_URL}/admin-manage?section=pending_payments`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) throw new Error('Failed to load pending payments');
  return await res.json();
}

export async function fetchAnalytics(
  secret: string,
  range: number = 30
): Promise<AnalyticsData> {
  const res = await fetch(`${BASE_URL}/admin-analytics?range=${range}`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load analytics');
  }
  return await res.json();
}

export async function exportUsersCsv(secret: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/admin-export-users?format=csv`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to export users');
  }
  return await res.blob();
}

export async function fetchExportUsers(
  secret: string
): Promise<{ success: boolean; total: number; users: any[] }> {
  const res = await fetch(`${BASE_URL}/admin-export-users?format=json`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load export users');
  }
  return await res.json();
}

export async function fetchPlanMargins(secret: string): Promise<MarginsData> {
  const res = await fetch(`${BASE_URL}/admin-plan-margins`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) throw new Error('Failed to load plan margins');
  return await res.json();
}

export async function fetchUserActivity(secret: string): Promise<{ summary: ActivitySummary; users: UserActivity[] }> {
  const res = await fetch(`${BASE_URL}/admin-user-activity`, { headers: getHeaders(secret) });
  if (!res.ok) throw new Error('Failed to load activity');
  return await res.json();
}

export async function fetchUserSessions(secret: string, userId: string): Promise<{ sessions: SessionRecord[] }> {
  const res = await fetch(`${BASE_URL}/admin-user-activity?user_id=${userId}`, { headers: getHeaders(secret) });
  if (!res.ok) throw new Error('Failed to load sessions');
  return await res.json();
}

export async function sendPushNotification(
  secret: string,
  payload: { title: string; message: string; target: 'all' | 'inactive' | 'user'; user_id?: string; inactive_days?: number }
): Promise<{ success: boolean; recipients: number }> {
  const res = await fetch(`${BASE_URL}/admin-send-push`, {
    method: 'POST',
    headers: { ...getHeaders(secret), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to send push notification');
  return await res.json();
}

export async function fetchInactiveAccounts(
  secret: string,
  days: number = 180
): Promise<{ total: number; candidates: InactiveAccount[] }> {
  const res = await fetch(`${BASE_URL}/admin-inactive-accounts?action=list&days=${days}`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) throw new Error('Failed to load inactive accounts');
  return await res.json();
}

export async function warnInactiveUser(secret: string, userId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/admin-inactive-accounts?action=warn&user_id=${userId}`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) throw new Error('Failed to send warning');
}

export async function deleteInactiveUser(
  secret: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-inactive-accounts?action=delete&user_id=${userId}`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete account');
  }
  return await res.json();
}

export async function fetchUserStreaks(secret: string): Promise<UserStreakAdmin[]> {
  const res = await fetch(`${BASE_URL}/admin-user-activity`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) throw new Error('Failed to load streaks');
  const data = await res.json();
  // Merge streak data with user data
  return (data.users ?? []).map((u: any) => ({
    user_id: u.id,
    full_name: u.full_name,
    phone: u.phone,
    current_streak: u.current_streak ?? 0,
    longest_streak: u.longest_streak ?? 0,
    last_activity_date: u.last_seen_at,
    streak_reward_7_claimed: false,
    streak_reward_14_claimed: false,
    streak_reward_21_claimed: false,
    streak_reward_30_claimed: false,
  }));
}

export async function triggerScheduledNotification(
  secret: string,
  type: 'weekly_report' | 'streak_reminder' | 'referral_nudge' | 'monthly_statement'
): Promise<{ success: boolean; sent?: number; reminded?: number; nudged?: number }> {
  const res = await fetch(`${BASE_URL}/scheduled-notifications?type=${type}`, {
    method: 'POST',
    headers: getHeaders(secret),
  });
  if (!res.ok) throw new Error('Failed to trigger notification');
  return await res.json();
}

export async function fetchAmbassadorSummaries(secret: string): Promise<Ambassador[]> {
  const res = await fetch(`${BASE_URL}/ambassador-dashboard`, { headers: getHeaders(secret) });
  const data = await res.json();
  return data.ambassadors ?? [];
}

export async function fetchAmbassadorDetail(secret: string, ambassadorId: string): Promise<AmbassadorDetail | null> {
  const res = await fetch(`${BASE_URL}/ambassador-dashboard?ambassador_id=${ambassadorId}`, { headers: getHeaders(secret) });
  if (!res.ok) return null;
  return await res.json();
}

export async function createAmbassador(secret: string, payload: {
  full_name: string; phone: string; email?: string; pin: string; notes?: string;
}): Promise<{ success: boolean; ambassador?: Ambassador; error?: string }> {
  const res = await fetch(`${BASE_URL}/admin-ambassadors`, {
    method: 'POST', headers: getHeaders(secret),
    body: JSON.stringify({ action: 'create', ...payload }),
  });
  return await res.json();
}

export async function updateAmbassador(secret: string, id: string, updates: Partial<Ambassador> & { pin?: string }): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE_URL}/admin-ambassadors`, {
    method: 'POST', headers: getHeaders(secret),
    body: JSON.stringify({ action: 'update', id, ...updates }),
  });
  return await res.json();
}

export async function deleteAmbassador(secret: string, id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-ambassadors`, {
    method: 'POST', headers: getHeaders(secret),
    body: JSON.stringify({ action: 'delete', id }),
  });
  return await res.json();
}

export async function fetchAmbassadorSummariesSubAdmin(subAdminSecret: string): Promise<{ ambassadors: Ambassador[]; role: string }> {
  const res = await fetch(`${BASE_URL}/ambassador-dashboard`, {
    headers: { 'x-sub-admin-secret': subAdminSecret, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Unauthorized');
  return await res.json();
}

export async function fetchAmbassadorDetailSubAdmin(subAdminSecret: string, ambassadorId: string, pin: string): Promise<AmbassadorDetail | { error: string; success?: boolean }> {
  const res = await fetch(`${BASE_URL}/ambassador-dashboard?ambassador_id=${ambassadorId}`, {
    headers: { 'x-sub-admin-secret': subAdminSecret, 'x-ambassador-pin': pin, 'Content-Type': 'application/json' },
  });
  return await res.json();
}

export async function fetchAmbassadorSummariesSubAdminList(subAdminSecret: string): Promise<Ambassador[]> {
  const res = await fetch(`${BASE_URL}/admin-ambassadors`, {
    method: 'POST',
    headers: { 'x-sub-admin-secret': subAdminSecret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list' }),
  });
  const data = await res.json();
  return data.ambassadors ?? [];
}


export async function loginAmbassador(phone: string, pin: string) {
  const res = await fetch(`${BASE_URL}/ambassador-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, pin }),
  });
  return await res.json();
}

export async function fetchAmbassadorDashboard(token: string, ambassadorId: string): Promise<AmbassadorDetail | null> {
  const res = await fetch(`${BASE_URL}/ambassador-dashboard?ambassador_id=${ambassadorId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function changeAmbassadorPin(token: string, currentPin: string, newPin: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/ambassador-change-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
  });
  return await res.json();
}

