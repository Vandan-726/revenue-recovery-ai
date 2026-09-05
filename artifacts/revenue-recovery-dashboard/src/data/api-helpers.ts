import type { Recovery as ApiRecovery, RecoveryStatus as ApiRecoveryStatus } from '@workspace/api-client-react';
import { useGetSettings } from '@workspace/api-client-react';

export type UiStatus = 'Success' | 'In progress' | 'Pending';
export type UiStrategy = 'Retry' | 'SMS+Retry' | 'Email' | 'Discount';

export function uiStatus(status: ApiRecoveryStatus): UiStatus {
  if (status === 'recovered') return 'Success';
  if (status === 'active') return 'In progress';
  return 'Pending';
}

export function uiStrategy(strategies: string[] = []): UiStrategy {
  if (strategies.includes('discount')) return 'Discount';
  if (strategies.includes('whatsapp') || strategies.includes('sms')) return 'SMS+Retry';
  if (strategies.includes('smart_retry') && !strategies.includes('email')) return 'Retry';
  if (strategies.includes('email')) return 'Email';
  if (strategies.includes('support')) return 'Discount';
  return 'Retry';
}

export function customerLabel(record: ApiRecovery) {
  return record.customer_id ?? record.payment_id;
}

export function initials(label: string) {
  const parts = label.replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'RF';
}

export function getCurrencySymbol(currency: string = 'INR'): string {
  switch (currency.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'AED':
      return 'AED ';
    case 'INR':
    default:
      return '₹';
  }
}

export function formatDetected(date: string, timezone: string = 'Asia/Calcutta'): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  try {
    return parsed.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    });
  } catch {
    return parsed.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }
}

export function formatCompactMoney(amount: number, currency: string = 'INR'): string {
  const sym = getCurrencySymbol(currency);
  if (currency.toUpperCase() === 'INR') {
    if (amount >= 100000) return `${sym}${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${sym}${(amount / 1000).toFixed(1)}K`;
    return `${sym}${amount.toLocaleString('en-IN')}`;
  }
  if (amount >= 1000000) return `${sym}${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${sym}${(amount / 1000).toFixed(1)}K`;
  return `${sym}${amount.toLocaleString()}`;
}

export function formatMoney(amount: number, currency: string = 'INR'): string {
  const sym = getCurrencySymbol(currency);
  const locale = currency.toUpperCase() === 'INR' ? 'en-IN' : 'en-US';
  return `${sym}${amount.toLocaleString(locale)}`;
}

// Aliases for compatibility
export const formatCompactINR = (amount: number) => formatCompactMoney(amount, 'INR');
export const formatINR = (amount: number) => formatMoney(amount, 'INR');

export function useWorkspaceFormatters() {
  const settings = useGetSettings();
  const data = (settings.data as Record<string, any> | undefined) || {};
  const account = data.account || {};
  const recovery = data.recovery || {};
  const currency: string = account.currency || 'INR';
  const timezone: string = account.timezone || 'Asia/Calcutta';
  const maxAttempts: number = typeof recovery.max_attempts === 'number' ? recovery.max_attempts : 3;

  return {
    currency,
    timezone,
    maxAttempts,
    formatMoney: (amount: number) => formatMoney(amount, currency),
    formatCompact: (amount: number) => formatCompactMoney(amount, currency),
    formatDetected: (date: string) => formatDetected(date, timezone),
  };
}