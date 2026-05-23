/**
 * Formats a number to Nigerian Naira (₦) currency format (e.g. ₦250,000.00)
 */
export function formatNaira(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₦0.00';
  }
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formats an ISO date string to a clean, highly readable date-time string
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '---';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '---';
    
    // Example format: May 23, 2026, 05:52 AM
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return isoString;
  }
}

/**
 * Formats an ISO date string to a simple absolute date without time
 */
export function formatDateOnly(isoString: string): string {
  if (!isoString) return '---';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '---';
    
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return isoString;
  }
}

/**
 * Truncates text with ellipses if it exceeds length
 */
export function truncateText(text: string, length: number): string {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Generates an initials avatar label (e.g., John Doe -> JD)
 */
export function getInitials(fullName: string): string {
  if (!fullName) return 'U';
  return fullName
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0].toUpperCase())
    .slice(0, 2)
    .join('');
}
