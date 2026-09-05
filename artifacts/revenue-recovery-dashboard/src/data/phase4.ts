import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type NotificationChannel = "sms" | "email" | "whatsapp" | "voice" | "payment_retry";
export interface NotificationRecord { id: string; recoveryId: string | null; channel: string; provider: string; recipient: string; templateKey: string | null; language: string; status: string; providerReference: string | null; content: Record<string, unknown> | null; createdAt: string; }
export interface TemplateRecord { template_key: string; language: string; subject?: string; body: string; }
export interface ProviderHealth { [key: string]: { provider: string; configured: boolean } | { max: number; window_seconds: number }; }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? `Request failed (${response.status})`);
  return response.json();
}

export function useNotifications(recoveryId?: string) {
  const suffix = recoveryId ? `?recovery_id=${encodeURIComponent(recoveryId)}` : "";
  return useQuery<{ notifications: NotificationRecord[]; stats: Record<string, unknown> }>({ queryKey: ["phase4-notifications", recoveryId], queryFn: () => request(`/api/v1/notifications${suffix}`) });
}
export function useNotificationTemplates() {
  return useQuery<{ templates: TemplateRecord[] }>({ queryKey: ["phase4-templates"], queryFn: () => request("/api/v1/notification-templates") });
}
export function useProviderHealth() {
  return useQuery<ProviderHealth>({ queryKey: ["phase4-provider-health"], queryFn: () => request("/api/v1/provider-health") });
}
export function useSendNotification() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { recovery_id: string; channel: NotificationChannel; language?: string; template_key?: string }) => request("/api/v1/notifications", { method: "POST", body: JSON.stringify(input) }), onSuccess: () => client.invalidateQueries({ queryKey: ["phase4-notifications"] }) });
}
