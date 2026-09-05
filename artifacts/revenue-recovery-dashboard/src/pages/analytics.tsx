import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, Coins, Download, Sparkles, WalletCards } from 'lucide-react';
import { useGetAnalytics } from '@workspace/api-client-react';
import { Button, EmptyState, SectionHeading, SelectControl, Skeleton } from '@/components/ui-kit';
import { useWorkspaceFormatters } from '@/data/api-helpers';
import { useToast } from '@/hooks/use-toast';

const ranges = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function dateRange(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

export default function Analytics() {
  const [range, setRange] = useState('Last 30 days');
  const { toast } = useToast();
  const { formatMoney, formatCompact } = useWorkspaceFormatters();
  const days = ranges.find((item) => item.label === range)?.days ?? 30;
  const analytics = useGetAnalytics(dateRange(days));
  const data = analytics.data;
  const strategies = useMemo(() => Object.entries(data?.strategy_performance ?? {}).sort(([, a], [, b]) => b - a), [data?.strategy_performance]);
  const totalCost = Object.values(data?.cost_breakdown ?? {}).reduce((sum, value) => sum + value, 0);
  const exportReport = () => {
    if (!data) return;
    const csv = [
      'metric,value',
      `recovery_rate,${data.recovery_rate}`,
      `revenue_impact,${data.revenue_impact}`,
      `total_attempts,${data.total_attempts}`,
      `successful_attempts,${data.successful_attempts}`,
      ...Object.entries(data.strategy_performance).map(([strategy, rate]) => `strategy_${strategy},${rate}`),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `recovery-analytics-${days}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Report exported', description: `${range} performance report is ready.` });
  };

  if (analytics.isLoading) return <div className="page-enter mx-auto max-w-[1440px] w-full min-w-0 overflow-x-hidden"><Skeleton className="h-[620px]" /></div>;
  if (analytics.isError || !data) return <div className="page-enter mx-auto max-w-[720px] w-full min-w-0 overflow-x-hidden"><EmptyState title="Analytics unavailable" description="The API server could not return analytics for this period." action={<Button variant="secondary" onClick={() => analytics.refetch()}>Try again</Button>} /></div>;

  const avgRecovery = data.successful_attempts ? Math.round(data.revenue_impact / data.successful_attempts) : 0;
  return <div className="page-enter mx-auto max-w-[1440px] w-full min-w-0 overflow-x-hidden">
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-3 text-primary">Performance intelligence</p>
        <h1 className="text-[30px] font-bold tracking-[-.04em] sm:text-[38px] break-words">Analytics<span className="text-primary">.</span></h1>
        <p className="mt-2 text-sm text-muted-foreground break-words">Find the strategies and segments that turn failed payments into retained revenue.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <SelectControl value={range} onChange={setRange} options={ranges.map(item => item.label)} testId="select-analytics-range" />
        <Button variant="secondary" onClick={exportReport} testId="button-export-analytics"><Download size={14} /> Export</Button>
      </div>
    </div>
    <div className="stagger grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 min-w-0">
      <div className="rounded-2xl border border-card-border bg-primary p-5 text-primary-foreground shadow-[0_10px_24px_hsl(165_73%_34%_/_0.15)] min-w-0">
        <div className="mb-7 flex items-start justify-between"><span className="eyebrow text-primary-foreground/65">Recovery rate</span><BarChart3 size={18} /></div>
        <p className="metric-number text-4xl font-bold">{data.recovery_rate.toFixed(1)}%</p>
        <p className="mt-3 flex items-center gap-1 text-[11px] text-primary-foreground/70"><ArrowUpRight size={13} /> API-backed period</p>
      </div>
      <div className="rounded-2xl border border-card-border bg-card p-5 min-w-0">
        <div className="mb-7 flex items-start justify-between"><span className="eyebrow text-muted-foreground">Revenue recovered</span><Coins size={18} className="text-primary" /></div>
        <p className="metric-number text-4xl font-bold">{formatCompact(data.revenue_impact)}</p>
        <p className="mt-3 flex items-center gap-1 text-[11px] text-primary"><ArrowUpRight size={13} /> {data.successful_attempts} successful attempts</p>
      </div>
      <div className="rounded-2xl border border-card-border bg-card p-5 min-w-0">
        <div className="mb-7 flex items-start justify-between"><span className="eyebrow text-muted-foreground">Avg. recovery</span><WalletCards size={18} className="text-chart-2" /></div>
        <p className="metric-number text-4xl font-bold">{formatMoney(avgRecovery)}</p>
        <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground"><ArrowDownRight size={13} /> per successful attempt</p>
      </div>
      <div className="rounded-2xl border border-card-border bg-card p-5 min-w-0">
        <div className="mb-7 flex items-start justify-between"><span className="eyebrow text-muted-foreground">Recovery spend</span><Sparkles size={18} className="text-chart-3" /></div>
        <p className="metric-number text-4xl font-bold">{formatCompact(totalCost)}</p>
        <p className="mt-3 text-[11px] text-muted-foreground">{data.total_attempts} total attempts</p>
      </div>
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr] min-w-0">
      <section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 min-w-0 overflow-hidden">
        <SectionHeading eyebrow="Strategy scorecard" title="What converts best" action={<span className="font-mono text-[10px] text-muted-foreground">{range.toUpperCase()}</span>} />
        {strategies.length ? <div className="space-y-5">{strategies.map(([strategy, rate], index) => <div key={strategy} className="grid grid-cols-[80px_1fr_50px] sm:grid-cols-[100px_1fr_60px] items-center gap-2 sm:gap-3"><span className="truncate text-xs font-bold">{strategy.replace('_', ' ')}</span><div className="h-3 rounded-full bg-muted"><div className={`bar-grow h-3 rounded-full ${index % 2 ? 'bg-chart-2' : 'bg-primary'}`} style={{ width: `${Math.min(100, rate)}%`, animationDelay: `${index * 100}ms` }} /></div><span className="font-mono text-right text-xs font-bold">{rate.toFixed(1)}%</span><span className="col-start-2 text-[10px] text-muted-foreground">success rate</span></div>)}</div> : <p className="rounded-xl bg-muted/40 p-6 text-center text-xs text-muted-foreground">Strategy performance will appear after recovery attempts are recorded.</p>}
        <div className="mt-7 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4"><Sparkles size={16} className="mt-0.5 shrink-0 text-primary" /><p className="text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Live signal:</strong> Rates and spend are calculated from the selected API date range.</p></div>
      </section>
      <section className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 min-w-0 overflow-hidden">
        <SectionHeading eyebrow="Revenue concentration" title="Top customers" />
        <div className="space-y-1 min-w-0">{data.top_customers.length ? data.top_customers.map((customer, index) => <div key={customer.customer_id} className="flex items-center gap-3 border-b border-border/70 py-3.5 last:border-0 min-w-0"><span className="font-mono text-[10px] text-muted-foreground shrink-0">0{index + 1}</span><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-[10px] font-bold">{customer.customer_id.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{customer.customer_id}</p><p className="mt-1 text-[10px] text-muted-foreground">{customer.recovery_count} recoveries</p></div><span className="font-mono text-xs font-bold shrink-0">{formatCompact(customer.recovered_amount)}</span></div>) : <p className="py-10 text-center text-xs text-muted-foreground">No recovered customers in this period.</p>}</div>
      </section>
    </div>
    <section className="mt-6 rounded-2xl border border-card-border bg-card p-5 sm:p-6 min-w-0 overflow-hidden">
      <SectionHeading eyebrow="Operating costs" title="Recovery spend by channel" action={<span className="font-mono text-sm font-bold">{formatMoney(totalCost)} <small className="font-sans text-[10px] font-normal text-muted-foreground">total</small></span>} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 min-w-0">{Object.entries(data.cost_breakdown).map(([label, value]) => <div key={label} className="rounded-xl bg-muted/55 p-4 min-w-0"><div className="mb-6 flex items-center justify-between"><span className="text-xs font-bold truncate">{label.replace('_', ' ')}</span><span className="font-mono text-[10px] text-muted-foreground shrink-0">{totalCost ? Math.round((value / totalCost) * 100) : 0}%</span></div><p className="font-mono text-xl font-bold truncate">{formatMoney(value)}</p><div className="mt-3 h-1.5 rounded-full bg-background"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${totalCost ? (value / totalCost) * 100 : 0}%` }} /></div></div>)}</div>
    </section>
  </div>;
}