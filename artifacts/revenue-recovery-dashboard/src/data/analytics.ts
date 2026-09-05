import { useQuery } from "@tanstack/react-query";

export type Analytics = {
  period: string;
  kpis: { detected: number; recovered: number; recovery_rate: number; recovered_amount: number; total_cost: number; roi: number };
  funnel: Array<{ stage: string; count: number }>;
  strategies: Array<{ strategy: string; attempts: number; recovered: number; amount: number; cost: number; conversion_rate: number; roi: number }>;
  trend: Array<{ date: string; detected: number; recovered: number; amount: number }>;
  event_count: number;
};

async function fetchAnalytics(period: string) {
  const response = await fetch(`/api/v1/analytics?period=${period}`);
  if (!response.ok) throw new Error("Unable to load analytics");
  return response.json() as Promise<Analytics>;
}

export function useAnalytics(period: string) {
  return useQuery({ queryKey: ["phase5-analytics", period], queryFn: () => fetchAnalytics(period) });
}
