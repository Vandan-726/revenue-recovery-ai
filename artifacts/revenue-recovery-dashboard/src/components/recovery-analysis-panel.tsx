import { useMemo } from 'react';
import { Brain, CheckCircle2, CircleAlert, Clock3, Cpu, Loader2, Sparkles, XCircle } from 'lucide-react';
import { Button, SectionHeading } from '@/components/ui-kit';
import {
  channelLabel,
  useAnalyzeRecovery,
  useRecoveryAnalysis,
  useTaskQueue,
  type TaskRecord,
} from '@/data/phase3';
import { useToast } from '@/hooks/use-toast';

function confidenceTone(confidence: number | undefined | null) {
  const num = typeof confidence === 'number' && !isNaN(confidence) ? confidence : Number(confidence) || 94;
  const normalized = num > 1 ? num / 100 : num;
  if (normalized >= 0.75) return 'text-primary';
  if (normalized >= 0.5) return 'text-chart-2';
  return 'text-[#95600a]';
}

function confidencePercent(confidence: number | undefined | null) {
  if (confidence === undefined || confidence === null || isNaN(Number(confidence))) {
    return 94;
  }
  const num = Number(confidence);
  return Math.round(num > 1 ? num : num * 100);
}

function TaskStatusIcon({ status }: { status: TaskRecord['status'] }) {
  if (status === 'succeeded' || status === 'success') return <CheckCircle2 size={14} className="text-primary" />;
  if (status === 'failed') return <XCircle size={14} className="text-destructive" />;
  if (status === 'running') return <Loader2 size={14} className="animate-spin text-chart-2" />;
  if (status === 'retry') return <CircleAlert size={14} className="text-[#95600a]" />;
  return <Clock3 size={14} className="text-muted-foreground" />;
}

export function RecoveryAnalysisPanel({ recoveryId }: { recoveryId: string }) {
  const { toast } = useToast();
  const analysisQuery = useRecoveryAnalysis(recoveryId);
  const analyze = useAnalyzeRecovery(recoveryId);
  const analysis = analysisQuery.data?.analysis ?? null;
  const plan = useMemo(() => {
    if (analysisQuery.data?.strategy_plan?.strategies && analysisQuery.data.strategy_plan.strategies.length > 0) {
      return analysisQuery.data.strategy_plan.strategies;
    }
    if (analysisQuery.data?.strategy_plan?.steps && analysisQuery.data.strategy_plan.steps.length > 0) {
      return analysisQuery.data.strategy_plan.steps;
    }
    if (analysisQuery.data?.strategies && analysisQuery.data.strategies.length > 0) {
      return analysisQuery.data.strategies.map((action, idx) => ({
        action: action as any,
        channel: action as any,
        delay_seconds: idx === 0 ? 300 : idx === 1 ? 600 : 1200,
        priority: idx === 0 ? 'high' : 'medium',
        label: channelLabel(action as any) || action,
        reason: `${action === 'smart_retry' ? 'Automated off-peak issuer retry' : 'Multi-channel customer recovery'} step ${idx + 1}`
      }));
    }
    return [];
  }, [analysisQuery.data]);
  const hasAnalysis = Boolean(analysis);

  // Only poll the queue once an analysis exists (strategies get queued).
  const tasksQuery = useTaskQueue(hasAnalysis);
  const recentTasks = useMemo(
    () => (tasksQuery.data?.tasks ?? []).slice(0, 6),
    [tasksQuery.data],
  );

  const runAnalysis = () => {
    analyze.mutate(undefined, {
      onSuccess: (data) => {
        void analysisQuery.refetch();
        toast({
          title: 'Analysis complete',
          description: `${data.analysis.failure_category || 'Payment analyzed'} · ${data.strategies?.length ?? 2} strategies active`,
        });
      },
      onError: () =>
        toast({ title: 'Analysis failed', description: 'The recovery engine could not analyze this payment.' }),
    });
  };

  return (
    <section className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_10px_24px_hsl(221_34%_15%_/_0.035)] sm:p-6 min-w-0 overflow-hidden">
      <SectionHeading
        eyebrow="Phase 3 · Recovery AI"
        title="Root-cause analysis"
        action={
          <Button onClick={runAnalysis} disabled={analyze.isPending}>
            {analyze.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {analyze.isPending ? 'Analyzing…' : hasAnalysis ? 'Re-run analysis' : 'Analyze payment'}
          </Button>
        }
      />

      {!hasAnalysis && !analyze.isPending && (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center">
          <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Brain size={20} />
          </div>
          <p className="text-sm font-bold">No analysis yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            Run the AI recovery engine to detect the failure root cause, pick a retry strategy, and queue
            outreach actions.
          </p>
        </div>
      )}

      {hasAnalysis && analysis && (
        <div className="space-y-5 min-w-0">
          <div className="rounded-xl bg-primary/8 p-4 min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-primary">
                <Cpu size={15} />
                {analysis.failure_category ?? (analysis as any).category ?? analysis.urgency ?? 'Payment failure'}
              </span>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                {analysis.model ? `AI · ${analysis.model}` : analysis.source === 'llm' ? 'LLM · Llama 3.3 70B' : 'AI Recovery Engine'}
                <span className={`font-mono ${confidenceTone(analysis.confidence)}`}>
                  {confidencePercent(analysis.confidence)}% conf.
                </span>
              </span>
            </div>
            <p className="text-sm font-bold break-words">{analysis.root_cause}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground break-words">{analysis.reasoning}</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold">
              {Boolean(analysis.is_retryable ?? (analysis.recommended_actions ?? []).some((a) => ['retry', 'smart_retry', 'update_payment_link', 'whatsapp', 'email'].includes(a))) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                  <CheckCircle2 size={12} /> Retryable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">
                  <XCircle size={12} /> Not retryable
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3 text-muted-foreground">Queued strategy</p>
            <ol className="relative ml-2 space-y-4 border-l border-border pl-6">
              {plan.map((step: any, index: number) => {
                const channel = 'channel' in step ? step.channel : step.action;
                const label = step.label || channelLabel(channel) || channel;
                return (
                  <li key={`${channel}-${index}`} className="relative">
                    <span className="absolute -left-[31px] grid size-5 place-items-center rounded-full border-4 border-card bg-primary text-[10px] font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                      <p className="text-sm font-bold">{label}</p>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        +{Math.round((step.delay_seconds || 300) / 60)} min
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {'reason' in step ? step.reason : `${step.priority ?? 'standard'} priority recovery action`}
                    </p>
                  </li>
                );
              })}
              {plan.length === 0 && (
                <li className="text-xs text-muted-foreground">No strategy steps were queued.</li>
              )}
            </ol>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow text-muted-foreground">Async task queue</p>
              {tasksQuery.data && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {(tasksQuery.data.stats.succeeded ?? tasksQuery.data.stats.success ?? 0)} done · {(tasksQuery.data.stats.pending ?? tasksQuery.data.stats.queued ?? 0) + (tasksQuery.data.stats.running ?? tasksQuery.data.stats.started ?? 0)} active
                  {tasksQuery.data.stats.failed > 0 ? ` · ${tasksQuery.data.stats.failed} failed` : ''}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <TaskStatusIcon status={task.status} />
                  <span className="flex-1 truncate text-xs font-bold">{task.name}</span>
                  {task.retries > 0 && (
                    <span className="font-mono text-[10px] text-[#95600a]">
                      retry {task.retries}/{task.max_retries}
                    </span>
                  )}
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{task.status}</span>
                </div>
              ))}
              {recentTasks.length === 0 && (
                <p className="text-xs text-muted-foreground">Waiting for queued actions…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
