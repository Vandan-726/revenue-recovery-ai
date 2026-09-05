import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  Globe,
  Key,
  Mail,
  MessageSquare,
  Pause,
  Phone,
  Play,
  Radio,
  RefreshCw,
  Save,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { useGetSettings, useUpdateSettings } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, SectionHeading, Skeleton } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import { useLiveStream } from '@/context/live-stream-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const tabs = ['Profile', 'Account', 'Recovery config', 'Integrations', 'Danger zone'];

const TIMEZONES = [
  { value: 'Asia/Calcutta', label: 'Asia/Calcutta (IST · UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST · UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST · UTC-08:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT · UTC+00:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT · UTC+08:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST · UTC+04:00)' },
];

const CURRENCIES = [
  { value: 'INR', label: 'INR (₹ · Indian Rupee)' },
  { value: 'USD', label: 'USD ($ · US Dollar)' },
  { value: 'EUR', label: 'EUR (€ · Euro)' },
  { value: 'GBP', label: 'GBP (£ · British Pound)' },
  { value: 'AED', label: 'AED (AED · UAE Dirham)' },
];

const ROLES = [
  'Workspace Owner',
  'Revenue Operations Lead',
  'Finance Director',
  'Growth Engineer',
  'Customer Success Lead',
];

export default function Settings() {
  const [tab, setTab] = useState('Profile');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const settings = useGetSettings();

  // User Profile state
  const [name, setName] = useState('Aarav Rao');
  const [email, setEmail] = useState('admin@recoverly.io');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [role, setRole] = useState('Workspace Owner');
  const [department, setDepartment] = useState('Revenue Operations');

  // Account details state
  const [businessName, setBusinessName] = useState('Revenue Recovery Account');
  const [timezone, setTimezone] = useState('Asia/Calcutta');
  const [currency, setCurrency] = useState('INR');
  const [supportEmail, setSupportEmail] = useState('support@recoverly.io');
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [highValueAlerts, setHighValueAlerts] = useState(true);
  const [webhookAlerts, setWebhookAlerts] = useState(false);

  // Recovery playbook config state
  const [retry, setRetry] = useState(true);
  const [sms, setSms] = useState(true);
  const [reminderEmail, setReminderEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(true);
  const [discount, setDiscount] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [retryWindow, setRetryWindow] = useState(72);
  const [highValueThreshold, setHighValueThreshold] = useState(25000);
  const [isPaused, setIsPaused] = useState(false);

  // Integration Config & Testing state
  const [rzpKeyId, setRzpKeyId] = useState('');
  const [rzpKeySecret, setRzpKeySecret] = useState('');
  const [rzpWebhookSecret, setRzpWebhookSecret] = useState('');
  const [rzpMode, setRzpMode] = useState<'live' | 'simulation'>('live');

  const [twilioSid, setTwilioSid] = useState('');
  const [twilioAuth, setTwilioAuth] = useState('');
  const [twilioPhone, setTwilioPhone] = useState('');
  const [twilioWaFrom, setTwilioWaFrom] = useState('');
  const [smsMode, setSmsMode] = useState<'live' | 'simulation'>('simulation');

  const [sendgridKey, setSendgridKey] = useState('');
  const [sendgridFrom, setSendgridFrom] = useState('');
  const [emailMode, setEmailMode] = useState<'live' | 'simulation'>('simulation');

  // Interactive Test State
  const [testTargetPhone, setTestTargetPhone] = useState('+919876543210');
  const [testTargetEmail, setTestTargetEmail] = useState('admin@recoverly.io');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  // Global persistent live traffic stream context
  const {
    isStreaming,
    countdown,
    streamCount,
    isIngesting,
    isClearing,
    startStream,
    pauseStream,
    toggleStream,
    ingestRandomPayment,
    clearAllRecoveries,
  } = useLiveStream();

  const update = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/v1/settings'] });
        toast({ title: 'Settings saved successfully', description: 'Your updates are now live in the workspace.' });
      },
      onError: () => {
        toast({ title: 'Unable to save settings', description: 'Could not connect to the settings service.' });
      },
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    const data = settings.data as Record<string, any>;

    // Profile
    const prof = data.profile || {};
    if (prof.name) setName(prof.name);
    if (prof.email) setEmail(prof.email);
    if (prof.phone) setPhone(prof.phone);
    if (prof.role) setRole(prof.role);
    if (prof.department) setDepartment(prof.department);

    // Account
    const acc = data.account || {};
    if (acc.business_name) setBusinessName(acc.business_name);
    if (acc.timezone) setTimezone(acc.timezone);
    if (acc.currency) setCurrency(acc.currency);
    if (acc.support_email) setSupportEmail(acc.support_email);
    if (typeof acc.weekly_digest === 'boolean') setWeeklyDigest(acc.weekly_digest);
    if (typeof acc.high_value_alerts === 'boolean') setHighValueAlerts(acc.high_value_alerts);
    if (typeof acc.webhook_alerts === 'boolean') setWebhookAlerts(acc.webhook_alerts);

    // Recovery
    const rec = data.recovery || {};
    const configured = Array.isArray(rec.default_strategies) ? rec.default_strategies.map(String) : [];
    if (configured.length) {
      setRetry(configured.includes('smart_retry'));
      setSms(configured.includes('sms'));
      setReminderEmail(configured.includes('email'));
      setWhatsapp(configured.includes('whatsapp'));
      setDiscount(configured.includes('support'));
    }
    if (typeof rec.max_attempts === 'number') setMaxAttempts(rec.max_attempts);
    if (typeof rec.retry_window_hours === 'number') setRetryWindow(rec.retry_window_hours);
    if (typeof rec.high_value_threshold === 'number') setHighValueThreshold(rec.high_value_threshold);
    if (typeof rec.paused === 'boolean') setIsPaused(rec.paused);

    // Integrations
    const intg = data.integrations || {};
    if (intg.razorpay) {
      if (intg.razorpay.key_id) setRzpKeyId(intg.razorpay.key_id);
      if (intg.razorpay.mode) setRzpMode(intg.razorpay.mode);
    }
    if (intg.twilio) {
      if (intg.twilio.account_sid) setTwilioSid(intg.twilio.account_sid);
      if (intg.twilio.phone_number) setTwilioPhone(intg.twilio.phone_number);
      if (intg.twilio.whatsapp_from) setTwilioWaFrom(intg.twilio.whatsapp_from);
      if (intg.twilio.mode) setSmsMode(intg.twilio.mode);
    }
    if (intg.sendgrid) {
      if (intg.sendgrid.from_email) setSendgridFrom(intg.sendgrid.from_email);
      if (intg.sendgrid.mode) setEmailMode(intg.sendgrid.mode);
    }
  }, [settings.data]);

  const saveProfile = () => {
    const initials = name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'AR';

    update.mutate({
      data: {
        profile: {
          name,
          email,
          phone,
          role,
          department,
          avatar_initials: initials,
        },
      },
    });
  };

  const saveAccount = () => {
    update.mutate({
      data: {
        account: {
          business_name: businessName,
          timezone,
          currency,
          support_email: supportEmail,
          weekly_digest: weeklyDigest,
          high_value_alerts: highValueAlerts,
          webhook_alerts: webhookAlerts,
        },
      },
    });
  };

  const saveRecoveryConfig = () => {
    const activeStrategies: string[] = [];
    if (retry) activeStrategies.push('smart_retry');
    if (sms) activeStrategies.push('sms');
    if (reminderEmail) activeStrategies.push('email');
    if (whatsapp) activeStrategies.push('whatsapp');
    if (discount) activeStrategies.push('support');

    update.mutate({
      data: {
        recovery: {
          enabled: true,
          paused: isPaused,
          max_attempts: maxAttempts,
          retry_window_hours: retryWindow,
          high_value_threshold: highValueThreshold,
          default_strategies: activeStrategies,
        },
      },
    });
  };

  const saveIntegrations = () => {
    update.mutate({
      data: {
        integrations: {
          razorpay: {
            connected: Boolean(rzpKeyId || rzpMode === 'live'),
            key_id: rzpKeyId,
            mode: rzpMode,
          },
          twilio: {
            connected: Boolean(twilioSid || smsMode === 'live'),
            account_sid: twilioSid,
            phone_number: twilioPhone,
            whatsapp_from: twilioWaFrom,
            mode: smsMode,
          },
          sendgrid: {
            connected: Boolean(sendgridKey || emailMode === 'live'),
            from_email: sendgridFrom,
            mode: emailMode,
          },
        },
      },
    });
  };

  const togglePauseRecovery = async () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    try {
      await update.mutateAsync({
        data: {
          recovery: {
            paused: nextState,
          },
        },
      });
      await queryClient.invalidateQueries();
      toast({
        title: nextState ? 'Recovery activity paused' : 'Recovery activity resumed',
        description: nextState
          ? 'Automated retries and message dispatches are now halted across the workspace.'
          : 'Automated recovery flows are actively operating.',
      });
    } catch {
      setIsPaused(!nextState);
      toast({
        title: 'Update failed',
        description: 'Could not update recovery pause state.',
        variant: 'destructive',
      });
    }
  };

  const getWebhookUrl = () => {
    return 'https://api.recoverly.io/api/v1/webhooks/razorpay';
  };

  const copyWebhookUrl = () => {
    const url = getWebhookUrl();
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied to clipboard', description: url });
  };

  const triggerIntegrationTest = async (channel: 'sms' | 'whatsapp' | 'email' | 'razorpay', simulated: boolean) => {
    setTestingChannel(channel);
    setTestResult(null);
    try {
      const recipient = channel === 'email' ? testTargetEmail : testTargetPhone;
      const res = await fetch('/api/v1/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          recipient,
          simulated,
          message:
            channel === 'whatsapp'
              ? '⚡ Recoverly AI: Action required for your payment retry. Click here to complete 1-click UPI checkout: https://pay.example.com/update'
              : channel === 'sms'
              ? 'Recoverly: Your transaction timed out. Tap to retry securely: https://pay.example.com/update'
              : 'Test notification from Recoverly AI revenue recovery system.',
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (res.ok && data.success) {
        toast({
          title: `${channel.toUpperCase()} Test Successful!`,
          description: `Mode: ${data.mode?.toUpperCase()} · Reference: ${data.reference}`,
        });
      } else {
        toast({
          title: `${channel.toUpperCase()} Dispatch Warning`,
          description: data.error || data.message || 'Check provider credentials or test in simulated mode.',
        });
      }
    } catch (e: any) {
      toast({ title: 'Test Failed', description: e.message || 'Unable to execute test dispatch.' });
    } finally {
      setTestingChannel(null);
    }
  };

  if (settings.isLoading) {
    return (
      <div className="page-enter mx-auto max-w-[1080px] w-full min-w-0 overflow-x-hidden">
        <Skeleton className="h-[560px]" />
      </div>
    );
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AR';

  return (
    <div className="page-enter mx-auto max-w-[1080px] w-full min-w-0 overflow-x-hidden">
      <div className="mb-8">
        <p className="eyebrow mb-3 text-primary">Workspace controls</p>
        <h1 className="text-[30px] font-bold tracking-[-.04em] sm:text-[38px] break-words">
          Settings<span className="text-primary">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground break-words">
          Configure real-world payment gateways, SMS/WhatsApp messaging, email notifications, and automated recovery playbooks.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[210px_1fr] min-w-0">
        <nav className="flex gap-1 overflow-x-auto pb-2 min-w-0 max-w-full lg:block lg:space-y-1 lg:pb-0">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-all lg:block lg:w-full ${
                tab === item
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${item === 'Danger zone' ? 'mt-3 lg:border-t lg:border-border lg:pt-4 text-destructive/80 hover:text-destructive' : ''}`}
              data-testid={`button-settings-${item.toLowerCase().replaceAll(' ', '-')}`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {/* TAB 1: PROFILE */}
          {tab === 'Profile' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
                <SectionHeading eyebrow="Identity" title="User profile" />
                <div className="mb-6 flex items-center gap-4 rounded-xl border border-border/80 bg-background/50 p-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#d5d6ff] font-mono text-lg font-bold text-[#39386e] shadow-inner">
                    {initials}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{name || 'Your Name'}</h3>
                    <p className="text-xs text-muted-foreground">{email || 'your.email@example.com'}</p>
                    <span className="mt-1.5 inline-block rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                      {role}
                    </span>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aarav Rao" />
                  <Field label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. admin@recoverly.io" />
                  <Field label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 98765 43210" />
                  <SelectField label="Role / Designation" value={role} options={ROLES} onChange={setRole} />
                  <div className="sm:col-span-2">
                    <Field label="Team / Department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Revenue Operations & Finance" />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={saveProfile} disabled={update.isPending} testId="button-save-profile">
                    <Save size={14} /> {update.isPending ? 'Saving profile…' : 'Save profile changes'}
                  </Button>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: ACCOUNT */}
          {tab === 'Account' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
                <SectionHeading eyebrow="Organization" title="Account details" />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Acme Corp" />
                  <SelectField
                    label="Timezone"
                    value={timezone}
                    options={TIMEZONES.map((t) => t.value)}
                    displayMap={Object.fromEntries(TIMEZONES.map((t) => [t.value, t.label]))}
                    onChange={setTimezone}
                  />
                  <SelectField
                    label="Primary currency"
                    value={currency}
                    options={CURRENCIES.map((c) => c.value)}
                    displayMap={Object.fromEntries(CURRENCIES.map((c) => [c.value, c.label]))}
                    onChange={setCurrency}
                  />
                  <Field label="Support escalation email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="e.g. support@recoverly.io" />
                </div>
              </section>

              <section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
                <SectionHeading eyebrow="Notifications" title="Access & alerts" />
                <SettingRow
                  icon={ShieldCheck}
                  title="Weekly recovery digest"
                  detail="Email a summary of recovered revenue and unresolved cases every Monday morning."
                  checked={weeklyDigest}
                  onChange={() => setWeeklyDigest(!weeklyDigest)}
                />
                <SettingRow
                  icon={Zap}
                  title="High-value payment alerts"
                  detail={`Instantly notify the team when a transaction above ₹${highValueThreshold.toLocaleString()} fails.`}
                  checked={highValueAlerts}
                  onChange={() => setHighValueAlerts(!highValueAlerts)}
                />
                <SettingRow
                  icon={Bell}
                  title="Webhook gateway failure alerts"
                  detail="Receive operational alerts if Razorpay or gateway webhooks fail signature checks."
                  checked={webhookAlerts}
                  onChange={() => setWebhookAlerts(!webhookAlerts)}
                />
                <div className="mt-6 flex justify-end">
                  <Button onClick={saveAccount} disabled={update.isPending} testId="button-save-account">
                    <Save size={14} /> {update.isPending ? 'Saving…' : 'Save account details'}
                  </Button>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: RECOVERY CONFIG */}
          {tab === 'Recovery config' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
                <SectionHeading eyebrow="Playbook" title="Recovery channels & strategies" />
                <p className="mb-5 text-xs leading-5 text-muted-foreground">
                  Recoverly executes the active channels sequentially and stops as soon as payment is captured.
                </p>
                <SettingRow
                  icon={CreditCard}
                  title="Smart card retry"
                  detail="Retry at the card issuer's highest-probability historical success window."
                  checked={retry}
                  onChange={() => setRetry(!retry)}
                />
                <SettingRow
                  icon={MessageSquare}
                  title="WhatsApp 1-click recovery"
                  detail="Send an interactive WhatsApp message with dynamic UPI / NetBanking payment link."
                  checked={whatsapp}
                  onChange={() => setWhatsapp(!whatsapp)}
                />
                <SettingRow
                  icon={Smartphone}
                  title="SMS follow-up"
                  detail="Deliver a concise SMS payment link via Twilio/Exotel after initial soft declines."
                  checked={sms}
                  onChange={() => setSms(!sms)}
                />
                <SettingRow
                  icon={Mail}
                  title="Branded email reminder"
                  detail="Send a responsive invoice breakdown with a secure payment update gateway."
                  checked={reminderEmail}
                  onChange={() => setReminderEmail(!reminderEmail)}
                />
                <SettingRow
                  icon={Zap}
                  title="Offer dynamic support / discount"
                  detail="Trigger concierge support outreach or grace-period discount when primary channels fail."
                  checked={discount}
                  onChange={() => setDiscount(!discount)}
                />
              </section>

              <section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
                <SectionHeading eyebrow="Guardrails" title="Timing, limits & thresholds" />
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field
                    label="Maximum recovery attempts"
                    type="number"
                    value={String(maxAttempts)}
                    onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <Field
                    label="Cool-off window (hours)"
                    type="number"
                    value={String(retryWindow)}
                    onChange={(e) => setRetryWindow(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <Field
                    label="High-value threshold (₹)"
                    type="number"
                    value={String(highValueThreshold)}
                    onChange={(e) => setHighValueThreshold(Math.max(1000, Number(e.target.value) || 1000))}
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={saveRecoveryConfig} disabled={update.isPending} testId="button-save-config">
                    <Save size={14} /> {update.isPending ? 'Saving configuration…' : 'Save playbook configuration'}
                  </Button>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: INTEGRATIONS */}
          {tab === 'Integrations' && (
            <div className="space-y-6">
              {/* Test Recipient Config Box */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Radio size={16} className={`text-primary ${isStreaming ? 'animate-ping' : ''}`} />
                      Live Traffic Streamer & Testing Sandbox
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Stream authentic webhook failure events periodically (every 30-45s) or trigger single events to test real-time AI diagnosis & recovery.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isStreaming ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                        <span className="size-2 rounded-full bg-primary animate-pulse" />
                        Next event in {countdown}s
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                        Stream Idle
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {isStreaming ? (
                    <Button variant="secondary" onClick={pauseStream}>
                      <Pause size={13} /> Pause Live Stream
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={startStream}>
                      <Play size={13} /> Start Live Traffic Stream
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => ingestRandomPayment()}
                    disabled={isIngesting}
                  >
                    <Send size={13} className={isIngesting ? 'animate-spin' : ''} />
                    {isIngesting ? 'Ingesting…' : 'Ingest Single Event'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={clearAllRecoveries}
                    disabled={isClearing}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={13} />
                    {isClearing ? 'Clearing…' : 'Clear All Recoveries'}
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Test phone number (WhatsApp & SMS)"
                    value={testTargetPhone}
                    onChange={(e) => setTestTargetPhone(e.target.value)}
                    placeholder="e.g. +919876543210"
                  />
                  <Field
                    label="Test recipient email"
                    value={testTargetEmail}
                    onChange={(e) => setTestTargetEmail(e.target.value)}
                    placeholder="e.g. your.email@example.com"
                  />
                </div>

                {testResult && (
                  <div className="mt-4 rounded-xl border border-border bg-background p-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-foreground">
                        Last Test Dispatch Status: {testResult.success ? '✅ SUCCESS' : '⚠️ FAILED'}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        Mode: {testResult.mode?.toUpperCase()}
                      </span>
                    </div>
                    <pre className="overflow-x-auto text-[11px] text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* 1. RAZORPAY INTEGRATION */}
              <section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 font-bold text-primary">
                      RZ
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-foreground">Razorpay Payment Gateway</h3>
                      <p className="text-xs text-muted-foreground">
                        Live webhook ingestion for failed payments & dynamic recovery link generation.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    Live API
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Key ID"
                    value={rzpKeyId}
                    onChange={(e) => setRzpKeyId(e.target.value)}
                    placeholder="rzp_live_... or rzp_test_..."
                  />
                  <Field
                    label="Key Secret"
                    type="password"
                    value={rzpKeySecret}
                    onChange={(e) => setRzpKeySecret(e.target.value)}
                    placeholder="Enter Razorpay Key Secret"
                  />
                </div>

                <div className="mt-4 rounded-xl bg-background/80 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="eyebrow text-[10px] text-muted-foreground">Webhook endpoint URL</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        HTTPS Live Webhook
                      </span>
                    </div>
                    <button
                      onClick={copyWebhookUrl}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold text-primary hover:bg-primary/10"
                    >
                      <Copy size={12} /> Copy URL
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-xs text-foreground truncate">
                    {getWebhookUrl()}
                  </p>
                </div>

                {Boolean(rzpKeyId && rzpKeySecret) && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                    <p className="text-xs text-muted-foreground">
                      Test payment webhook processing or trigger live payment link generation.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => triggerIntegrationTest('razorpay', false)}
                        disabled={testingChannel === 'razorpay'}
                      >
                        <Zap size={13} className={testingChannel === 'razorpay' ? 'animate-spin' : 'text-primary'} />
                        {testingChannel === 'razorpay' ? 'Testing…' : 'Test Live Payment API'}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={toggleStream}
                      >
                        {isStreaming ? <Pause size={13} /> : <Play size={13} />}
                        {isStreaming ? `Streaming (${countdown}s)` : 'Start Live Stream'}
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* 2. WHATSAPP & SMS (TWILIO) */}
              <section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-[#25D366]/15 font-bold text-[#25D366]">
                      WA
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-foreground">WhatsApp Business API & SMS (Twilio)</h3>
                      <p className="text-xs text-muted-foreground">
                        Dispatches direct 1-click UPI recovery links via WhatsApp and SMS channels.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-lg bg-[#25D366]/10 px-3 py-1 text-xs font-bold text-[#25D366]">
                    Live API
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Twilio Account SID"
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <Field
                    label="Twilio Auth Token"
                    type="password"
                    value={twilioAuth}
                    onChange={(e) => setTwilioAuth(e.target.value)}
                    placeholder="Enter Twilio Auth Token"
                  />
                  <Field
                    label="WhatsApp From Number"
                    value={twilioWaFrom}
                    onChange={(e) => setTwilioWaFrom(e.target.value)}
                    placeholder="whatsapp:+14155238886"
                  />
                  <Field
                    label="SMS From Number"
                    value={twilioPhone}
                    onChange={(e) => setTwilioPhone(e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>

                {Boolean(twilioSid && twilioAuth && twilioWaFrom && twilioPhone) && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                    <p className="text-xs text-muted-foreground">
                      Send test dispatch to <strong>{testTargetPhone}</strong> via Live API.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => triggerIntegrationTest('sms', false)}
                        disabled={testingChannel === 'sms'}
                      >
                        <Smartphone size={13} className={testingChannel === 'sms' ? 'animate-spin' : ''} />
                        {testingChannel === 'sms' ? 'Sending SMS…' : 'Send SMS'}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => triggerIntegrationTest('whatsapp', false)}
                        disabled={testingChannel === 'whatsapp'}
                      >
                        <MessageSquare size={13} className={testingChannel === 'whatsapp' ? 'animate-spin' : ''} />
                        {testingChannel === 'whatsapp' ? 'Sending WhatsApp…' : 'Send WhatsApp'}
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* 3. EMAIL (SENDGRID / AWS SES) */}
              <section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-chart-2/15 font-bold text-chart-2">
                      EM
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-foreground">Email Dispatcher (SendGrid / AWS SES)</h3>
                      <p className="text-xs text-muted-foreground">
                        Sends branded invoice breakdown emails and secure card update links.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-lg bg-chart-2/10 px-3 py-1 text-xs font-bold text-chart-2">
                    Live API
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="SendGrid API Key"
                    type="password"
                    value={sendgridKey}
                    onChange={(e) => setSendgridKey(e.target.value)}
                    placeholder="SG.xxxxxxxxxxxxxxxxxxxx"
                  />
                  <Field
                    label="Verified Sender Email (From)"
                    type="email"
                    value={sendgridFrom}
                    onChange={(e) => setSendgridFrom(e.target.value)}
                    placeholder="billing@yourdomain.com"
                  />
                </div>

                {Boolean(sendgridKey && sendgridFrom) && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                    <p className="text-xs text-muted-foreground">
                      Send test recovery email to <strong>{testTargetEmail}</strong> via Live API.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => triggerIntegrationTest('email', false)}
                      disabled={testingChannel === 'email'}
                    >
                      <Mail size={13} className={testingChannel === 'email' ? 'animate-spin' : ''} />
                      {testingChannel === 'email' ? 'Sending Email…' : 'Send Email'}
                    </Button>
                  </div>
                )}
              </section>

              <div className="flex justify-end pt-2">
                <Button onClick={saveIntegrations} disabled={update.isPending} testId="button-save-integrations">
                  <Save size={14} /> {update.isPending ? 'Saving…' : 'Save integration settings'}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 5: DANGER ZONE */}
          {tab === 'Danger zone' && (
            <section className="rounded-2xl border border-destructive/25 bg-card p-5 sm:p-6">
              <SectionHeading eyebrow="Proceed carefully" title="Danger zone & operational kill-switch" />
              
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-destructive">
                          {isPaused ? 'Recovery operations are currently PAUSED' : 'Pause all automated recovery activity'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {isPaused
                            ? 'All outbound messages and retries are halted. Click resume to restore automated recovery flows.'
                            : 'Temporarily halt all AI analysis, webhook triggers, and outbound recovery messages.'}
                        </p>
                      </div>
                      <Button
                        variant={isPaused ? 'primary' : 'danger'}
                        onClick={togglePauseRecovery}
                        disabled={update.isPending}
                        testId="button-pause-recovery"
                      >
                        {isPaused ? <Play size={14} /> : <Pause size={14} />}
                        {isPaused ? 'Resume recovery' : 'Pause activity'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
                <div className="flex items-center gap-3">
                  <RefreshCw size={18} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Clear recovery sandbox cache</p>
                    <p className="text-[11px] text-muted-foreground">Reset local in-memory queue metrics without deleting database history.</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    queryClient.invalidateQueries();
                    toast({ title: 'Cache refreshed', description: 'Workspace data re-synchronized with database.' });
                  }}
                  testId="button-refresh-cache"
                >
                  <RefreshCw size={13} /> Refresh cache
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeBadge({ mode, onChange }: { mode: 'live' | 'simulation'; onChange: (m: 'live' | 'simulation') => void }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-background p-1 text-[11px] font-bold">
      <button
        type="button"
        onClick={() => onChange('live')}
        className={`rounded-lg px-2.5 py-1 transition-all ${
          mode === 'live' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Live API
      </button>
      <button
        type="button"
        onClick={() => onChange('simulation')}
        className={`rounded-lg px-2.5 py-1 transition-all ${
          mode === 'simulation'
            ? 'bg-foreground text-background shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Simulated
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  type = 'text',
  placeholder,
  readOnly = false,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/10"
        data-testid={`input-${label.toLowerCase().replaceAll(' ', '-')}`}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  displayMap = {},
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  displayMap?: Record<string, string>;
  onChange: (val: string) => void;
}) {
  return (
    <div className="block">
      <span className="mb-2 block text-[11px] font-bold text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted focus:border-primary focus:ring-2 focus:ring-primary/10"
          data-testid={`select-${label.toLowerCase().replaceAll(' ', '-')}`}
        >
          <SelectValue className="truncate">{displayMap[value] || value}</SelectValue>
        </SelectTrigger>
        <SelectContent className="z-50 min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-32px)] rounded-xl border border-border bg-card p-1 shadow-xl">
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-xs font-semibold text-foreground focus:bg-muted focus:text-primary">
              {displayMap[opt] || opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  title,
  detail,
  checked,
  onChange,
}: {
  icon: typeof CreditCard;
  title: string;
  detail: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/70 py-4 last:border-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{detail}</p>
      </div>
      <button
        onClick={onChange}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`relative h-6 w-11 shrink-0 rounded-full p-1 transition-colors ${
          checked ? 'bg-primary' : 'bg-muted-foreground/25'
        }`}
        data-testid={`switch-${title.toLowerCase().replaceAll(' ', '-')}`}
      >
        <span
          className={`block size-4 rounded-full bg-card shadow-sm transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}