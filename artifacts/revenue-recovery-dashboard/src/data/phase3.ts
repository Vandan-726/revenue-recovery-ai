import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Phase 3 endpoints are served by the same API server but are not part of the
// generated OpenAPI client yet, so we call them with a small typed helper.

export type StrategyChannel = 'smart_retry' | 'email' | 'sms' | 'whatsapp' | 'support';

export interface AnalysisResult {
  root_cause: string;
  failure_category?: string;
  confidence: number;
  is_retryable?: boolean;
  urgency?: string;
  reasoning: string;
  recommended_actions?: string[];
  recommended_channels?: StrategyChannel[];
  source: 'llm' | 'fallback' | 'rules';
  model?: string | null;
} 

export interface StrategyPlan {
  action: StrategyChannel;
  delay_seconds: number;
  priority?: string;
  max_attempts?: number;
  config?: Record<string, unknown>;
  order?: number;
  label?: string;
  reason?: string;
}

export interface StrategyStep {
  channel: StrategyChannel;
  label: string;
  delay_seconds: number;
  reason: string;
}

export interface AnalyzeResponse {
  recovery_id: string;
  status: string;
  analysis: AnalysisResult;
  strategies: StrategyPlan[];
  task_ids: string[];
}

export interface AnalysisRecord {
  recovery_id: string;
  root_cause: string | null;
  selected_strategy: string | null;
  strategies: string[] | null;
  analysis: AnalysisResult | null;
  strategy_plan: { strategies?: StrategyPlan[]; steps?: StrategyStep[] } | null;
  analyzed_at: string | null;
}

export interface TaskRecord {
  id: string;
  name: string;
  status: 'scheduled' | 'pending' | 'running' | 'succeeded' | 'success' | 'failed' | 'retry';
  retries: number;
  max_retries: number;
  run_at: string;
  updated_at: string;
  error: string | null;
}

export interface TasksResponse {
  stats: { total?: number; queued?: number; pending?: number; started?: number; running?: number; succeeded?: number; success?: number; failed: number; retry?: number; retrying?: number };
  tasks: TaskRecord[];
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { accept: 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function useRecoveryAnalysis(id: string) {
  return useQuery({
    queryKey: ['phase3', 'analysis', id],
    queryFn: () => apiJson<AnalysisRecord>(`/api/v1/recoveries/${id}/analysis`),
    enabled: Boolean(id),
  });
}

export function useAnalyzeRecovery(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiJson<AnalyzeResponse>(`/api/v1/recoveries/${id}/analyze`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['phase3', 'analysis', id] });
      void qc.invalidateQueries({ queryKey: ['phase3', 'tasks'] });
    },
  });
}

export function useTaskQueue(enabled = true) {
  return useQuery({
    queryKey: ['phase3', 'tasks'],
    queryFn: () => apiJson<TasksResponse>(`/api/v1/tasks`),
    enabled,
    refetchInterval: 4000,
  });
}

export function channelLabel(channel: StrategyChannel): string {
  return {
    smart_retry: 'Smart card retry',
    email: 'Email outreach',
    sms: 'SMS reminder',
    whatsapp: 'WhatsApp message',
    support: 'Support / discount offer',
  }[channel];
}
