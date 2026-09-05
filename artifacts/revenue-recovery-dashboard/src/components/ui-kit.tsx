import { ArrowDownRight, ArrowUpRight, Check, ChevronDown, CircleAlert, LoaderCircle, Search, SlidersHorizontal } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import type { RecoveryStatus } from '@/data/mock';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Button({ children, variant = 'primary', onClick, className = '', type = 'button', disabled = false, testId }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; onClick?: () => void; className?: string; type?: 'button' | 'submit'; disabled?: boolean; testId?: string }) {
  const styles = {
    primary: 'bg-primary text-primary-foreground shadow-[0_5px_0_hsl(165_73%_22%)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none',
    secondary: 'border border-border bg-card text-foreground hover:bg-muted',
    ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    danger: 'border border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10',
  };
  return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all disabled:pointer-events-none disabled:opacity-50 ${styles[variant]} ${className}`} data-testid={testId}>{children}</button>;
}

export function StatusBadge({ status }: { status: RecoveryStatus }) {
  const config = {
    Success: { cls: 'bg-primary/10 text-primary', dot: 'bg-primary', icon: Check },
    'In progress': { cls: 'bg-chart-2/10 text-chart-2', dot: 'bg-chart-2', icon: LoaderCircle },
    Pending: { cls: 'bg-chart-3/15 text-[#95600a]', dot: 'bg-chart-3', icon: CircleAlert },
  }[status];
  const Icon = config.icon;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${config.cls}`} data-testid={`status-${status.toLowerCase().replaceAll(' ', '-')}`}><span className={`size-1.5 rounded-full ${config.dot}`} />{status === 'In progress' && <Icon size={12} className="animate-spin" />}{status}</span>;
}

export function StatCard({ label, value, detail, trend, tone = 'teal', icon: Icon }: { label: string; value: ReactNode; detail: string; trend?: 'up' | 'down'; tone?: 'teal' | 'yellow' | 'blue' | 'red'; icon: ElementType }) {
  const accents = { teal: 'bg-primary text-primary-foreground', yellow: 'bg-accent text-accent-foreground', blue: 'bg-[#dfe7ff] text-[#3e5fc3]', red: 'bg-[#ffe2de] text-destructive' };
  return <article className="group rounded-2xl border border-card-border bg-card p-5 shadow-[0_10px_24px_hsl(221_34%_15%_/_0.035)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_30px_hsl(221_34%_15%_/_0.07)]" data-testid={`card-stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
    <div className="mb-6 flex items-start justify-between"><span className="eyebrow text-muted-foreground">{label}</span><span className={`grid size-9 place-items-center rounded-xl ${accents[tone]}`}><Icon size={17} /></span></div>
    <p className="metric-number text-[30px] font-bold leading-none tracking-tight sm:text-[34px]" data-testid={`text-metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p>
    <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">{trend && <span className={`inline-flex items-center font-bold ${trend === 'up' ? 'text-primary' : 'text-destructive'}`}>{trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {trend === 'up' ? '12.6%' : '8.4%'}</span>}<span>{detail}</span></div>
  </article>;
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow mb-2 text-primary">{eyebrow}</p><h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2></div>{action}</div>;
}

export function SearchBox({ value, onChange, placeholder = 'Search recoveries...' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="flex h-10 w-full min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 sm:max-w-[290px]" data-testid="label-search"><Search size={16} className="shrink-0" /><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/70" data-testid="input-search" /></label>;
}

export function SelectControl({ value, onChange, options, testId = 'select-control', className = '' }: { value: string; onChange: (value: string) => void; options: string[]; testId?: string; className?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={`relative h-10 w-full min-w-0 gap-2 rounded-xl border border-border bg-card pl-9 pr-3 text-xs font-semibold text-foreground hover:bg-muted focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-auto ${className}`}
        data-testid={testId}
      >
        <SlidersHorizontal size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
        <SelectValue className="truncate">{value}</SelectValue>
      </SelectTrigger>
      <SelectContent className="z-50 min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-32px)] rounded-xl border border-border bg-card p-1 shadow-xl">
        {options.map((option) => (
          <SelectItem key={option} value={option} className="cursor-pointer rounded-lg py-2 pl-3 pr-8 text-xs font-semibold text-foreground focus:bg-muted focus:text-primary">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Skeleton({ className = '' }: { className?: string }) { return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />; }

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/70 px-6 py-16 text-center"><div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Search size={20} /></div><h3 className="font-bold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function TinySparkline({ points, color = '#168c76' }: { points: number[]; color?: string }) {
  const safePoints = points.length > 1 ? points : [points[0] ?? 0, points[0] ?? 0];
  const max = Math.max(...safePoints); const min = Math.min(...safePoints); const span = max - min || 1;
  const d = safePoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${index * (100 / (safePoints.length - 1))} ${34 - ((point - min) / span) * 28}`).join(' ');
  return <svg viewBox="0 0 100 38" className="h-10 w-28 overflow-visible" aria-hidden="true"><path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></svg>;
}