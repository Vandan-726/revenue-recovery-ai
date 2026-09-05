import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Coins, Layers3, RotateCcw, Target, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import { useGetDashboard, useListRecoveries, useGetSettings } from '@workspace/api-client-react';
import { Button, EmptyState, SectionHeading, Skeleton, StatCard, StatusBadge, TinySparkline } from '@/components/ui-kit';
import { useWorkspaceFormatters, customerLabel, initials, uiStatus, uiStrategy } from '@/data/api-helpers';
import { useToast } from '@/hooks/use-toast';

function CountUp({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (time: number) => {
      const progress = Math.min((time - start) / 650, 1);
      setCount(Math.floor(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{prefix}{count.toLocaleString('en-IN')}</>;
}

function getDynamicGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}

function DashboardLoading() {
  return <div className="space-y-6"><div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32" />)}</div><div className="grid gap-6 xl:grid-cols-[1.45fr_.9fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { formatMoney, formatCompact, formatDetected } = useWorkspaceFormatters();
  const dashboard = useGetDashboard({ days: 30 }, { query: { refetchInterval: 4000 } as any });
  const active = useListRecoveries({ page: 1, per_page: 3, status: 'active' }, { query: { refetchInterval: 4000 } as any });
  const settings = useGetSettings();
  const profileName = (settings.data as any)?.profile?.name;
  const userName = profileName ? `, ${profileName}` : '';
  const greeting = `${getDynamicGreeting()}${userName}`;

  const data = dashboard.data;
  if (dashboard.isLoading) return <div className="page-enter mx-auto max-w-[1440px]"><DashboardLoading /></div>;
  if (dashboard.isError) return <div className="page-enter mx-auto max-w-[720px]"><EmptyState title="Dashboard unavailable" description="The API server could not return recovery metrics." action={<Button variant="secondary" onClick={() => dashboard.refetch()}><RotateCcw size={14} /> Try again</Button>} /></div>;
  if (!data) return null;
  const trend = data.trend.map((point) => point.recovered_amount).slice(-12);
  const activeRows = active.data?.data ?? [];
  const handleRefresh = async () => {
    await Promise.all([dashboard.refetch(), active.refetch()]);
    toast({ title: 'Refreshed', description: 'Dashboard view updated with live API metrics.' });
  };

  return <div className="page-enter mx-auto max-w-[1440px] w-full min-w-0 overflow-x-hidden">
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-3 text-primary">Recovery operations</p>
        <h1 className="text-[30px] font-bold tracking-[-.04em] sm:text-[38px] break-words">{greeting}<span className="text-primary">.</span></h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground break-words">Your recovery engine is connected to live payment data.</p>
      </div>
      <Button variant="secondary" onClick={handleRefresh} className="shrink-0"><RotateCcw size={14} /> Refresh view</Button>
    </div>
    <div className="stagger grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 min-w-0">
      <StatCard label="Failures detected" value={<CountUp value={data.total_failed} />} detail="in the last 30 days" trend="down" tone="red" icon={Layers3} />
      <StatCard label="Recovery attempts" value={<CountUp value={data.recovery_attempts} />} detail="in the last 30 days" trend="up" tone="blue" icon={Target} />
      <StatCard label="Successful recoveries" value={<><CountUp value={data.total_recovered} /><span className="ml-1 text-xl text-muted-foreground">/ {data.recovery_rate.toFixed(1)}%</span></>} detail="conversion rate" trend="up" tone="teal" icon={CheckCircle2} />
      <StatCard label="Revenue recovered" value={formatCompact(data.revenue_recovered)} detail="in the last 30 days" trend="up" tone="yellow" icon={Coins} />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.9fr] min-w-0">
      <section className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_10px_24px_hsl(221_34%_15%_/_0.035)] sm:p-6 min-w-0 overflow-hidden">
        <SectionHeading eyebrow="Recovery velocity" title="Recovered revenue" action={<span className="font-mono text-[10px] text-muted-foreground">LAST 30 DAYS</span>} />
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="metric-number text-4xl font-bold">{formatCompact(data.revenue_recovered)}</p><p className="mt-2 text-xs text-primary"><TrendingUp size={13} className="mr-1 inline" /> Live API data</p></div><TinySparkline points={trend.length ? trend : [0]} /></div>
        {trend.length ? <div className="mt-7 flex h-40 items-end gap-2 border-b border-border pb-0 sm:gap-3">{trend.map((amount, index) => <div key={`${amount}-${index}`} className="group relative flex h-full flex-1 items-end"><div className={`bar-grow w-full min-w-[8px] rounded-t-md transition-all group-hover:bg-primary ${index === trend.length - 1 ? 'bg-accent' : 'bg-primary/70'}`} style={{ height: `${Math.max(5, (amount / Math.max(...trend, 1)) * 100)}%` }} /><span className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] text-muted-foreground">{index + 1}</span></div>)}</div> : <div className="mt-7 grid h-40 place-items-center rounded-xl bg-muted/30 text-xs text-muted-foreground">No recovery trend data yet.</div>}
      </section>
      <section className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_10px_24px_hsl(221_34%_15%_/_0.035)] sm:p-6 min-w-0 overflow-hidden">
        <SectionHeading eyebrow="Exposure" title="At risk right now" action={<span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive">Live</span>} />
        <p className="metric-number text-4xl font-bold">{formatCompact(data.revenue_at_risk)}</p><p className="mt-2 text-xs text-muted-foreground">across <strong className="text-foreground">{data.total_failed}</strong> failed payments</p>
        <div className="mt-8 space-y-5"><div><div className="mb-2 flex justify-between text-xs font-semibold"><span>Recovered value</span><span className="font-mono text-primary">{data.total_failed ? `${Math.round((data.total_recovered / data.total_failed) * 100)}%` : '0%'}</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, data.recovery_rate)}%` }} /></div></div></div>
        <div className="mt-7 flex items-center justify-between border-t border-border pt-4"><span className="text-xs text-muted-foreground">{data.active_recoveries} active cases</span><Link href="/recoveries" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">View recoveries <ArrowRight size={14} /></Link></div>
      </section>
    </div>
    <div className="mt-8 min-w-0"><SectionHeading eyebrow="Live queue" title="Active recoveries" action={<Link href="/recoveries" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">See all <ArrowRight size={14} /></Link>} />
      {active.isLoading ? <Skeleton className="h-48" /> : activeRows.length === 0 ? <EmptyState title="No active recoveries" description="New failed payments will appear here once the webhook is configured." /> : <div className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-[0_10px_24px_hsl(221_34%_15%_/_0.035)]">{activeRows.map((recovery) => <Link href={`/recoveries/${recovery.id}`} key={recovery.id} className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 transition-colors last:border-0 hover:bg-muted/50 sm:grid sm:grid-cols-[1.4fr_1fr_.8fr_1fr_110px] sm:gap-4 sm:px-5 sm:py-4"><div className="flex min-w-0 items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">{initials(customerLabel(recovery))}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{customerLabel(recovery)}</p><p className="truncate text-[11px] text-muted-foreground">{recovery.payment_id}</p></div></div><span className="hidden text-xs text-muted-foreground sm:block">{uiStrategy(recovery.strategies)}</span><div className="flex shrink-0 items-center gap-3 sm:contents"><span className="font-mono text-xs font-bold">{formatMoney(recovery.amount)}</span><span className="hidden text-xs text-muted-foreground sm:block">{formatDetected(recovery.updated_at)}</span><StatusBadge status={uiStatus(recovery.status)} /></div></Link>)}</div>}
    </div>
    <div className="mt-8 grid gap-4 pb-8 sm:grid-cols-3 min-w-0"><div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 min-w-0"><Clock3 className="text-chart-3 shrink-0" size={18} /><div className="min-w-0"><p className="font-mono text-sm font-bold truncate">API-backed</p><p className="text-[11px] text-muted-foreground truncate">metrics refresh on demand</p></div></div><div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 min-w-0"><TrendingUp className="text-primary shrink-0" size={18} /><div className="min-w-0"><p className="font-mono text-sm font-bold truncate">{data.recovery_rate.toFixed(1)}%</p><p className="text-[11px] text-muted-foreground truncate">current recovery rate</p></div></div><div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 min-w-0"><Coins className="text-chart-2 shrink-0" size={18} /><div className="min-w-0"><p className="font-mono text-sm font-bold truncate">{formatCompact(data.revenue_at_risk)}</p><p className="text-[11px] text-muted-foreground truncate">total at-risk volume</p></div></div></div>
  </div>;
}