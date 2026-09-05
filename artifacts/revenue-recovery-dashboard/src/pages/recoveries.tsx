import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, MoreHorizontal, Plus, RotateCcw, X } from 'lucide-react';
import { Link } from 'wouter';
import { useListRecoveries, useCreateRecovery } from '@workspace/api-client-react';
import { Button, EmptyState, SearchBox, SectionHeading, SelectControl, Skeleton, StatusBadge } from '@/components/ui-kit';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceFormatters, customerLabel, getCurrencySymbol, initials, uiStatus, uiStrategy } from '@/data/api-helpers';
import { useToast } from '@/hooks/use-toast';

const statusMap: Record<string, 'active' | 'recovered' | 'failed'> = { 'In progress': 'active', Success: 'recovered', Pending: 'failed' };

export default function Recoveries() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [strategy, setStrategy] = useState('All strategies');
  const [sort, setSort] = useState('Newest first');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPaymentId, setNewPaymentId] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newRootCause, setNewRootCause] = useState('Insufficient funds');
  const { toast } = useToast();
  const { currency, formatMoney, formatDetected } = useWorkspaceFormatters();

  const result = useListRecoveries(
    { page: 1, per_page: 100, search: query || undefined, status: statusMap[status] },
    { query: { refetchInterval: 4000 } as any }
  );
  const createMutation = useCreateRecovery();

  const rows = useMemo(() => [...(result.data?.data ?? [])].filter((item) => strategy === 'All strategies' || uiStrategy(item.strategies) === strategy).sort((a, b) => {
    if (sort === 'Highest amount') return b.amount - a.amount;
    return sort === 'Oldest first' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at);
  }), [result.data?.data, strategy, sort]);

  const handleRefresh = async () => {
    await result.refetch();
    toast({ title: 'Refreshed', description: 'Recovery list updated with latest data.' });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentId || !newCustomer || !newAmount) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    try {
      await createMutation.mutateAsync({
        data: {
          payment_id: newPaymentId.startsWith('pay_') ? newPaymentId : `pay_${newPaymentId}`,
          customer_id: newCustomer,
          amount: Math.round(parseFloat(newAmount) * 100),
          currency: currency,
          root_cause: newRootCause,
        },
      });
      toast({ title: 'Recovery created', description: `Recovery record ${newPaymentId} created successfully.` });
      setIsModalOpen(false);
      setNewPaymentId('');
      setNewCustomer('');
      setNewAmount('');
      void result.refetch();
    } catch (err) {
      toast({ title: 'Failed to create recovery', description: 'An error occurred while creating the recovery.', variant: 'destructive' });
    }
  };

  const exportData = () => {
    const csv = ['id,customer,amount,currency,strategy,status', ...rows.map((item) => [item.id, customerLabel(item), item.amount, item.currency, uiStrategy(item.strategies), uiStatus(item.status)].join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'recoveries.csv'; anchor.click(); URL.revokeObjectURL(url);
    toast({ title: 'Export ready', description: `${rows.length} API recovery records downloaded as CSV.` });
  };

  return <div className="page-enter mx-auto max-w-[1440px]">
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow mb-3 text-primary">Recovery operations</p>
        <h1 className="text-[30px] font-bold tracking-[-.04em] sm:text-[38px]">All recoveries<span className="text-primary">.</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">The live ledger of payment failures and their next best action.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={handleRefresh}>
          <RotateCcw size={14} /> <span className="hidden sm:inline">Refresh</span>
        </Button>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={14} /> New recovery
        </Button>
      </div>
    </div>

    {isModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
        <div className="w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-lg font-bold">Create New Recovery</h2>
            <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X size={18} /></button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">Payment ID</label>
              <input type="text" placeholder="pay_12345" value={newPaymentId} onChange={(e) => setNewPaymentId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">Customer Email / ID</label>
              <input type="email" placeholder="customer@example.com" value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">Amount ({getCurrencySymbol(currency)})</label>
              <input type="number" placeholder="2500" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">Root Cause</label>
              <Select value={newRootCause} onValueChange={setNewRootCause}>
                <SelectTrigger className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted focus:border-primary focus:ring-2 focus:ring-primary/10">
                  <SelectValue>{newRootCause}</SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50 min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-32px)] rounded-xl border border-border bg-card p-1 shadow-xl">
                  {['Insufficient funds', 'Card expired', 'Bank timeout', 'Authentication failed'].map((opt) => (
                    <SelectItem key={opt} value={opt} className="cursor-pointer rounded-lg py-2 pl-3 pr-8 text-xs font-semibold text-foreground focus:bg-muted focus:text-primary">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-6 flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Recovery'}</Button>
            </div>
          </form>
        </div>
      </div>
    )}
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-[0_10px_24px_hsl(221_34%_15%_/_0.03)] sm:flex-row sm:flex-wrap lg:flex-nowrap">
      <SearchBox value={query} onChange={setQuery} />
      <SelectControl value={status} onChange={setStatus} options={['All statuses', 'Success', 'In progress', 'Pending']} />
      <SelectControl value={strategy} onChange={setStrategy} options={['All strategies', 'Retry', 'SMS+Retry', 'Email', 'Discount']} />
      <div className="w-full sm:w-auto lg:ml-auto">
        <SelectControl value={sort} onChange={setSort} options={['Newest first', 'Oldest first', 'Highest amount']} />
      </div>
      <Button variant="secondary" onClick={exportData} disabled={!rows.length} className="w-full sm:w-auto">
        <Download size={15} /> Export
      </Button>
    </div>
    <div className="mb-5 flex items-center justify-between"><p className="text-xs text-muted-foreground"><strong className="text-foreground">{result.data?.pagination.total ?? 0}</strong> records matching your view</p><span className="font-mono text-[10px] text-muted-foreground">API DATA</span></div>
    {result.isLoading ? <Skeleton className="h-72" /> : result.isError ? <EmptyState title="Recoveries unavailable" description="The API server could not return recovery records." action={<Button variant="secondary" onClick={() => result.refetch()}><RotateCcw size={14} /> Try again</Button>} /> : rows.length === 0 ? <EmptyState title="No recoveries found" description="New failed payments will appear here after the Razorpay webhook is configured." action={<Button variant="secondary" onClick={() => { setQuery(''); setStatus('All statuses'); setStrategy('All strategies'); }}>Clear filters</Button>} /> : <div className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-[0_10px_24px_hsl(221_34%_15%_/_0.035)]"><div className="hidden grid-cols-[1.5fr_1fr_.75fr_1fr_130px_40px] gap-4 border-b border-border bg-muted/45 px-5 py-3 eyebrow text-muted-foreground md:grid"><span>Customer</span><span>Strategy</span><span>Amount</span><span>Detected</span><span>Status</span><span /></div>{rows.map((item) => <Link href={`/recoveries/${item.id}`} key={item.id} className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 transition-colors last:border-0 hover:bg-muted/45 md:grid md:grid-cols-[1.5fr_1fr_.75fr_1fr_130px_40px] md:gap-4 md:px-5 md:py-4"><div className="flex min-w-0 items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">{initials(customerLabel(item))}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{customerLabel(item)}</p><p className="truncate font-mono text-[10px] text-muted-foreground">{item.payment_id}</p></div></div><span className="hidden text-xs text-muted-foreground md:block">{uiStrategy(item.strategies)}</span><div className="flex shrink-0 items-center gap-3 md:contents"><span className="font-mono text-xs font-bold">{formatMoney(item.amount)}</span><span className="hidden text-xs text-muted-foreground md:block">{formatDetected(item.created_at)}</span><StatusBadge status={uiStatus(item.status)} /></div><MoreHorizontal size={17} className="hidden text-muted-foreground md:block" /></Link>)}</div>}
    <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><ArrowUp size={13} className="text-primary" /> API sorted results</span><span className="inline-flex items-center gap-1"><ArrowDown size={13} className="text-chart-3" /> Provider-backed volume</span></div>
  </div>;
}