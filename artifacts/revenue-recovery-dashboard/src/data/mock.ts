export type RecoveryStatus = 'Success' | 'In progress' | 'Pending';
export type RecoveryStrategy = 'Retry' | 'SMS+Retry' | 'Email' | 'Discount';

export interface Recovery {
  id: string;
  customer: string;
  email: string;
  amount: number;
  strategy: RecoveryStrategy;
  status: RecoveryStatus;
  detected: string;
  lastAction: string;
  attempts: number;
  initials: string;
}

export const recoveries: Recovery[] = [
  { id: 'pay_123', customer: 'John Doe', email: 'john@northstar.io', amount: 5000, strategy: 'Retry', status: 'Success', detected: 'Today, 09:42', lastAction: 'Payment recovered', attempts: 2, initials: 'JD' },
  { id: 'pay_456', customer: 'Jane Smith', email: 'jane@papertrail.co', amount: 2000, strategy: 'SMS+Retry', status: 'In progress', detected: 'Today, 08:17', lastAction: 'SMS sent 2h ago', attempts: 3, initials: 'JS' },
  { id: 'pay_789', customer: 'Bob Company', email: 'finance@bobcompany.com', amount: 8000, strategy: 'Email', status: 'Pending', detected: 'Yesterday, 16:05', lastAction: 'Email queued', attempts: 1, initials: 'BC' },
  { id: 'pay_224', customer: 'Acme Corp', email: 'billing@acme.com', amount: 12400, strategy: 'Discount', status: 'Success', detected: 'Yesterday, 13:28', lastAction: 'Recovered with offer', attempts: 4, initials: 'AC' },
  { id: 'pay_319', customer: 'TechStart', email: 'ops@techstart.dev', amount: 6800, strategy: 'Retry', status: 'In progress', detected: '02 Mar, 11:14', lastAction: 'Retry scheduled', attempts: 2, initials: 'TS' },
  { id: 'pay_404', customer: 'LocalBiz', email: 'hello@localbiz.in', amount: 3500, strategy: 'SMS+Retry', status: 'Pending', detected: '02 Mar, 09:31', lastAction: 'Awaiting consent', attempts: 1, initials: 'LB' },
  { id: 'pay_501', customer: 'Online Store', email: 'team@onlinestore.com', amount: 9500, strategy: 'Email', status: 'Success', detected: '01 Mar, 17:48', lastAction: 'Payment recovered', attempts: 2, initials: 'OS' },
];

export const auditEvents = [
  { time: 'Today, 09:42', title: 'Payment recovered', detail: '₹5,000 captured successfully via card retry.', tone: 'success' },
  { time: 'Today, 09:41', title: 'Retry succeeded', detail: 'Smart retry ran after a 24-hour cool-off period.', tone: 'success' },
  { time: 'Yesterday, 15:16', title: 'Retry scheduled', detail: 'Recovery engine scheduled attempt 2 for this account.', tone: 'neutral' },
  { time: 'Yesterday, 15:14', title: 'Failure detected', detail: 'Issuer returned do_not_honor for the original charge.', tone: 'danger' },
];

export const formatINR = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
export const formatCompactINR = (amount: number) => amount >= 100000 ? `₹${(amount / 100000).toFixed(1)}L` : formatINR(amount);