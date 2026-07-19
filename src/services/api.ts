import { Stats, Order, User, Plan, AppSetting, DashboardData, Withdrawal, GatewayStatus, AnalyticsData, MarginsData, UserActivity, SessionRecord, ActivitySummary, InactiveAccount, UserStreakAdmin, Ambassador, AmbassadorStats, AmbassadorDetail, FinancialSummary, FinancialReport, AppRating, SurveyResponseItem, SurveyQuestion, FeedbackOverview, RechargeCardStats, RechargeCardConfig, RechargeCardSubscription, RechargeCardOrder, ReconciliationItem, RechargeCardOverview, PeyflexRate, DenominationBreakdownItem, BusinessPartner, BusinessPartnerDetail, BlacklistedIp, IpCluster, UtilityServicesSummary, UtilityOrder } from '../types';

const BASE_URL = 'https://ndcztauwnkycknrbbmix.supabase.co/functions/v1';

export const SETTING_LABELS: Record<string, { label: string; desc: string }> = {
  cashback_rate: { label: 'Cashback Rate (%)', desc: 'Percentage cashback awarded to users on every data purchase' },
  min_topup: { label: 'Minimum Top-Up (₦)', desc: 'Minimum amount required to fund a wallet' },
  signup_bonus_mb: { label: 'Signup Bonus (MB)', desc: 'Free data in MB given to users on registration' },
  referral_bonus_mb: { label: 'Referral Bonus (MB)', desc: 'Bonus data in MB awarded to both referrer and referee' },
  min_cashback_withdrawal: { label: 'Min Cashback Withdrawal (₦)', desc: 'Minimum cashback balance required to request a bank withdrawal' },
  smedata_data_enabled: { label: 'SMEData plans enabled', desc: 'Enables routing and visibility for plans provided by SMEData.' },
  peyflex_data_enabled: { label: 'Peyflex plans enabled', desc: 'Enables routing and visibility for plans provided by Peyflex.' }
};

function getHeaders(secret: string): Record<string, string> {
  return {
    'x-admin-secret': secret,
    'Content-Type': 'application/json'
  };
}

// Removed getHeadersForRole helper as sub_admin path is deleted.

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
  const res = await fetch(`${BASE_URL}/admin-stats`, { headers: getHeaders(secret) });
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
  const res = await fetch(`${BASE_URL}/admin-get-orders?${params}`, { headers: getHeaders(secret) });
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
    headers: getHeaders(secret)
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
  const res = await fetch(`${BASE_URL}/admin-streaks`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) throw new Error('Failed to load streaks');
  const data = await res.json();
  return data.streaks ?? [];
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
  bank_name?: string; account_number?: string; account_name?: string;
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

export async function fetchFinancialSummary(secret: string): Promise<FinancialSummary | null> {
  const res = await fetch(`${BASE_URL}/admin-financial-summary`, {
    headers: getHeaders(secret),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function retryPendingOrders(secret: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/retry-pending-orders`, {
    method: 'POST',
    headers: getHeaders(secret),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to retry pending orders');
  }
  return await res.json();
}

export interface RetryResponseNormalized {
  summary: {
    total: number;
    fulfilled: number;
    still_pending: number;
    failed: number;
  };
  results: Array<{
    order_id: string;
    status: 'fulfilled' | 'still_pending' | 'failed' | 'still_pending_provider_disabled';
    provider: 'smedata' | 'peyflex';
    cashback?: number;
  }>;
}

export function normalizeRetryResponse(response: any): RetryResponseNormalized {
  // Extract summary
  let summary = response?.summary;
  if (!summary && response?.data?.summary) {
    summary = response.data.summary;
  }
  
  let total = 0;
  let fulfilled = 0;
  let still_pending = 0;
  let failed = 0;

  if (summary) {
    total = typeof summary.total === 'number' ? summary.total : (Number(summary.total) || 0);
    fulfilled = typeof summary.fulfilled === 'number' ? summary.fulfilled : (Number(summary.fulfilled) || 0);
    still_pending = typeof summary.still_pending === 'number' ? summary.still_pending : (Number(summary.still_pending) || 0);
    failed = typeof summary.failed === 'number' ? summary.failed : (Number(summary.failed) || 0);
  } else {
    // Try flat fields at root level or under data
    const targetObj = response?.data || response;
    if (targetObj && (targetObj.total !== undefined || targetObj.fulfilled !== undefined)) {
      total = Number(targetObj.total) || 0;
      fulfilled = Number(targetObj.fulfilled) || 0;
      still_pending = Number(targetObj.still_pending) || 0;
      failed = Number(targetObj.failed) || 0;
    }
  }

  // Extract results
  let results = response?.results;
  if (!results && response?.data?.results) {
    results = response.data.results;
  }
  if (!Array.isArray(results)) {
    results = [];
  }

  return {
    summary: { total, fulfilled, still_pending, failed },
    results
  };
}

export async function fetchFinancialReport(
  secret: string,
  from?: string,
  to?: string
): Promise<FinancialReport> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await fetch(`${BASE_URL}/admin-financial-report?${params}`, { headers: getHeaders(secret) });
  if (!res.ok) throw new Error('Failed to fetch financial report');
  return await res.json();
}

export async function fetchFeedbackOverview(secret: string): Promise<FeedbackOverview | null> {
  const res = await fetch(`${BASE_URL}/admin-survey-feedback?action=overview`, {
    headers: getHeaders(secret),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.success ? data : null;
}

export async function fetchSurveyQuestions(secret: string): Promise<SurveyQuestion[]> {
  const res = await fetch(`${BASE_URL}/admin-survey-feedback?action=questions`, {
    headers: getHeaders(secret),
  });
  const data = await res.json();
  return data.questions ?? [];
}

export async function createSurveyQuestion(
  secret: string,
  payload: { question_text: string; question_type: string; options?: string[] }
): Promise<{ success: boolean; question?: SurveyQuestion }> {
  const res = await fetch(`${BASE_URL}/admin-survey-feedback?action=questions`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function toggleSurveyQuestion(secret: string, id: string, is_active: boolean): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-survey-feedback?action=questions`, {
    method: 'PATCH',
    headers: getHeaders(secret),
    body: JSON.stringify({ id, is_active }),
  });
  return await res.json();
}

export async function deleteSurveyQuestion(secret: string, id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-survey-feedback?action=questions`, {
    method: 'DELETE',
    headers: getHeaders(secret),
    body: JSON.stringify({ id }),
  });
  return await res.json();
}

export async function fetchRechargeCardOverview(secret: string): Promise<RechargeCardOverview | null> {
  const res = await fetch(`${BASE_URL}/admin-recharge-cards`, {
    method: 'POST', headers: getHeaders(secret),
    body: JSON.stringify({ action: 'overview' }),
  });
  const data = await res.json();
  return data.success ? data : null;
}

export async function updateRechargeCardPricing(secret: string, updates: Partial<{
  weekly_price: number; weekly_batches: number; monthly_price: number;
  monthly_batches: number; markup_per_card: number; max_per_batch: number;
}>): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-recharge-cards`, {
    method: 'POST', headers: getHeaders(secret),
    body: JSON.stringify({ action: 'update_pricing', ...updates }),
  });
  return await res.json();
}

export async function updateRechargeCardConfig(secret: string, updates: Partial<{
  peyflex_api_token: string; peyflex_account_pin: string; enabled: boolean; account_tier: string;
}>): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-recharge-cards`, {
    method: 'POST', headers: getHeaders(secret),
    body: JSON.stringify({ action: 'update_config', ...updates }),
  });
  return await res.json();
}

export async function resolveReconciliation(secret: string, id: string, status: string, notes?: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-recharge-cards`, {
    method: 'POST', headers: getHeaders(secret),
    body: JSON.stringify({ action: 'resolve_reconciliation', id, status, notes }),
  });
  return await res.json();
}

export async function fetchPeyflexRateCard(secret: string): Promise<PeyflexRate[]> {
  const res = await fetch(`${BASE_URL}/admin-recharge-cards`, {
    method: 'POST', headers: getHeaders(secret),
    body: JSON.stringify({ action: 'get_rate_card' }),
  });
  const data = await res.json();
  return data.rates ?? [];
}

export async function updatePeyflexRate(secret: string, id: string, api_user_cost?: number, top_reseller_cost?: number): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-recharge-cards`, {
    method: 'POST', headers: getHeaders(secret),
    body: JSON.stringify({ action: 'update_rate', id, api_user_cost, top_reseller_cost }),
  });
  return await res.json();
}

export async function fetchRechargeCardSpendBreakdown(secret: string): Promise<DenominationBreakdownItem[]> {
  const res = await fetch(`${BASE_URL}/admin-recharge-cards`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'spend_breakdown' }),
  });
  const data = await res.json();
  return data.breakdown ?? [];
}

export async function fetchBusinessPartners(secret: string): Promise<BusinessPartner[]> {
  const res = await fetch(`${BASE_URL}/admin-business-partners?action=list`, { headers: getHeaders(secret) });
  const data = await res.json();
  return data.partners ?? [];
}

export async function fetchBusinessPartnerDetail(secret: string, id: string): Promise<BusinessPartnerDetail | null> {
  const res = await fetch(`${BASE_URL}/admin-business-partners?action=detail&id=${id}`, { headers: getHeaders(secret) });
  const data = await res.json();
  return data.success ? data : null;
}

export async function createBusinessPartner(secret: string, payload: {
  business_name: string; contact_name?: string; phone: string; email?: string;
  business_type?: string; notes?: string;
  bank_name?: string; account_number?: string; account_name?: string;
}): Promise<{ success: boolean; partner?: BusinessPartner; signup_link?: string }> {
  const res = await fetch(`${BASE_URL}/admin-business-partners?action=create`, {
    method: 'POST', headers: getHeaders(secret), body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function updateBusinessPartner(secret: string, id: string, updates: Partial<BusinessPartner>): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-business-partners?action=update`, {
    method: 'POST', headers: getHeaders(secret), body: JSON.stringify({ id, ...updates }),
  });
  return await res.json();
}

export async function deleteBusinessPartner(secret: string, id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-business-partners?action=delete`, {
    method: 'POST', headers: getHeaders(secret), body: JSON.stringify({ id }),
  });
  return await res.json();
}

export async function recalculatePartnerTier(secret: string, id: string): Promise<{ success: boolean; partner?: BusinessPartner }> {
  const res = await fetch(`${BASE_URL}/admin-business-partners?action=recalculate_tier`, {
    method: 'POST', headers: getHeaders(secret), body: JSON.stringify({ id }),
  });
  return await res.json();
}

export async function recordPartnerPayout(secret: string, id: string, amount: number): Promise<{ success: boolean; partner?: BusinessPartner }> {
  const res = await fetch(`${BASE_URL}/admin-business-partners?action=record_payout`, {
    method: 'POST', headers: getHeaders(secret), body: JSON.stringify({ id, amount }),
  });
  return await res.json();
}

export async function fetchBlacklist(secret: string): Promise<BlacklistedIp[]> {
  const res = await fetch(`${BASE_URL}/admin-ip-blacklist?action=list`, { headers: getHeaders(secret) });
  const data = await res.json();
  return data.blacklist ?? [];
}

export async function fetchIpClusters(secret: string): Promise<IpCluster[]> {
  const res = await fetch(`${BASE_URL}/admin-ip-blacklist?action=clusters`, { headers: getHeaders(secret) });
  const data = await res.json();
  return data.clusters ?? [];
}

export async function addToBlacklist(secret: string, ip_address: string, reason?: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-ip-blacklist?action=add`, {
    method: 'POST', headers: getHeaders(secret), body: JSON.stringify({ ip_address, reason }),
  });
  return await res.json();
}

export async function removeFromBlacklist(secret: string, ip_address: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-ip-blacklist?action=remove`, {
    method: 'POST', headers: getHeaders(secret), body: JSON.stringify({ ip_address }),
  });
  return await res.json();
}

export async function fetchUtilityServicesSummary(secret: string): Promise<UtilityServicesSummary | null> {
  const res = await fetch(`${BASE_URL}/admin-utility-services?action=summary`, { headers: getHeaders(secret) });
  const data = await res.json();
  return data.success ? data : null;
}

export async function fetchUtilityOrders(secret: string, service: 'airtime' | 'cable' | 'electricity', status?: string): Promise<UtilityOrder[]> {
  const params = new URLSearchParams({ action: 'orders', service });
  if (status) params.set('status', status);
  const res = await fetch(`${BASE_URL}/admin-utility-services?${params.toString()}`, { headers: getHeaders(secret) });
  const data = await res.json();
  return data.orders ?? [];
}

export async function fetchUtilitySettings(secret: string): Promise<{ airtime_enabled: boolean; cable_enabled: boolean; electricity_enabled: boolean; peyflex_token_configured: boolean } | null> {
  const res = await fetch(`${BASE_URL}/admin-utility-services?action=settings`, { headers: getHeaders(secret) });
  const data = await res.json();
  return data.success ? data : null;
}

export async function toggleUtilityService(secret: string, service: 'airtime' | 'cable' | 'electricity', enabled: boolean): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/admin-utility-services?action=update_settings`, {
    method: 'POST', headers: getHeaders(secret), body: JSON.stringify({ service, enabled }),
  });
  return await res.json();
}







