import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, BarChart3, ChevronLeft, ChevronRight, CreditCard, LayoutDashboard, Menu, Settings, ShieldCheck, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGetDashboard, useGetSettings } from '@workspace/api-client-react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/recoveries', label: 'Recoveries', icon: Activity },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { toast } = useToast();
  const dashboard = useGetDashboard({ days: 30 });
  const settings = useGetSettings();
  const closeMobile = () => setMobileOpen(false);

  const totalFailed = dashboard.data?.total_failed ?? 0;
  const recoveryRate = dashboard.data?.recovery_rate ?? 0;

  const profile = (settings.data as Record<string, any> | undefined)?.profile || {};
  const userName = profile.name || 'Aarav Rao';
  const userEmail = profile.email || 'admin@recoverly.io';
  const userInitials = profile.avatar_initials || 'AR';

  return (
    <div className="noise min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ${collapsed ? 'w-[248px] md:w-[76px] -translate-x-full md:translate-x-0' : 'w-[248px] -translate-x-full md:translate-x-0'} ${mobileOpen ? '!translate-x-0 shadow-2xl' : ''}`}>
        <div className="flex h-[86px] items-center border-b border-sidebar-border px-5">
          <Link href="/dashboard" onClick={closeMobile} className="flex items-center gap-3" data-testid="link-brand">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_0_4px_hsl(59_84%_62%_/_0.12)]"><ShieldCheck size={21} strokeWidth={2.5} /></span>
            <span className={`overflow-hidden whitespace-nowrap text-[15px] font-bold tracking-tight transition-all ${collapsed ? 'md:w-0 md:opacity-0' : ''}`}>recover<span className="text-sidebar-primary">ly</span></span>
          </Link>
          <button onClick={closeMobile} className="ml-auto rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden" aria-label="Close navigation" data-testid="button-close-nav"><X size={18} /></button>
        </div>
        <div className={`px-4 pt-7 ${collapsed ? 'md:px-3' : ''}`}>
          <p className={`eyebrow mb-3 px-2 text-sidebar-foreground/40 transition-opacity ${collapsed ? 'md:opacity-0' : ''}`}>Workspace</p>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href || (href === '/recoveries' && location.startsWith('/recoveries/'));
              return <Link key={href} href={href} onClick={closeMobile} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition-all ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_18px_hsl(59_84%_62%_/_0.12)]' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground'} ${collapsed ? 'md:justify-center md:px-0' : ''}`} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={18} strokeWidth={active ? 2.4 : 1.8} /><span className={`whitespace-nowrap transition-all ${collapsed ? 'md:hidden' : ''}`}>{label}</span>{label === 'Recoveries' && !collapsed && <span className={`ml-auto rounded-md px-1.5 py-0.5 font-mono text-[10px] ${active ? 'bg-sidebar-primary-foreground/15' : 'bg-sidebar-accent'}`}>{totalFailed ? (totalFailed >= 1000 ? `${(totalFailed / 1000).toFixed(1)}k` : totalFailed) : '0'}</span>}</Link>;
            })}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className={`mb-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-4 ${collapsed ? 'md:hidden' : ''}`}>
            <div className="mb-2 flex items-center justify-between"><span className="eyebrow text-sidebar-foreground/45">Recovery health</span><span className="size-2 rounded-full bg-sidebar-primary shadow-[0_0_0_4px_hsl(59_84%_62%_/_0.14)]" /></div>
            <p className="font-mono text-lg font-bold text-sidebar-foreground">{recoveryRate ? `${recoveryRate.toFixed(1)}%` : '100%'}</p>
            <p className="mt-1 text-[11px] leading-4 text-sidebar-foreground/50">Live calculated health</p>
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden w-full items-center justify-center rounded-xl border border-sidebar-border p-2 text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground md:flex" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} data-testid="button-collapse-nav">{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>
          <Link href="/settings" onClick={closeMobile} className={`mt-4 flex items-center gap-3 border-t border-sidebar-border pt-4 transition-all hover:opacity-85 ${collapsed ? 'md:justify-center' : ''}`} title="Profile & Account Settings" data-testid="sidebar-profile-link">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d5d6ff] text-xs font-bold text-[#39386e]">{userInitials}</div>
            <div className={`min-w-0 transition-all ${collapsed ? 'md:hidden' : ''}`}><p className="truncate text-xs font-semibold">{userName}</p><p className="truncate text-[11px] text-sidebar-foreground/45">{userEmail}</p></div>
          </Link>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-sidebar/50 backdrop-blur-xs md:hidden" onClick={closeMobile} aria-label="Close menu" data-testid="button-overlay" />}
      <main className={`min-h-[100dvh] transition-[padding-left] duration-300 pl-0 ${collapsed ? 'md:pl-[76px]' : 'md:pl-[248px]'}`}>
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-md md:px-9">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label="Open navigation" data-testid="button-open-nav"><Menu size={21} /></button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><CreditCard size={15} /><span>Workspace / </span><strong className="text-foreground">Revenue operations</strong></div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">LIVE DATA · {(settings.data?.account?.timezone || 'Asia/Kolkata').split('/').pop()?.replace('_', ' ') || 'IST'}</span>
            <Link href="/settings" className="grid size-9 place-items-center rounded-full border border-border bg-card text-xs font-bold text-foreground transition-all hover:border-primary/50 hover:bg-muted" aria-label="Open profile settings" data-testid="button-account-menu" title="Profile & Account Settings">{userInitials}</Link>
          </div>
        </header>
        <div className="shell-grid min-h-[calc(100dvh-72px)] p-5 md:p-9">{children}</div>
      </main>
    </div>
  );
}