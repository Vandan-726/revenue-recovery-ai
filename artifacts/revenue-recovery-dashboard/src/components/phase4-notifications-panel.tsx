import { useState } from "react";
import { Bell, CheckCircle2, Loader2, MessageSquare, Phone, Mail, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, useProviderHealth, useSendNotification, type NotificationChannel } from "@/data/phase4";

const channels: Array<{ id: NotificationChannel; label: string; icon: typeof Bell }> = [
  { id: "sms", label: "SMS", icon: Smartphone },
  { id: "email", label: "Email", icon: Mail },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "voice", label: "Voice", icon: Phone },
  { id: "payment_retry", label: "Retry payment", icon: RefreshCw },
];

export function Phase4NotificationsPanel({ recoveryId }: { recoveryId: string }) {
  const [channel, setChannel] = useState<NotificationChannel>("sms");
  const notifications = useNotifications(recoveryId);
  const health = useProviderHealth();
  const send = useSendNotification();
  const rows = notifications.data?.notifications ?? [];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><Bell size={15} className="text-primary shrink-0" /><h2 className="text-sm font-bold truncate">Recovery communications</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground break-words">Phase 4 delivery controls with provider fallback and rate limiting.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold text-primary shrink-0 self-start"><ShieldCheck size={12} />3 / hour cap</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {channels.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setChannel(id)} className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-bold transition-colors min-w-0 ${channel === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
            <Icon size={14} className="shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
      <Button className="mt-4 w-full gap-2" onClick={() => send.mutate({ recovery_id: recoveryId, channel, language: "en", template_key: "payment_failed_update_method" })} disabled={send.isPending}>
        {send.isPending ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}{send.isPending ? "Sending…" : `Send ${channels.find((item) => item.id === channel)?.label}`}
      </Button>
      {send.isSuccess && <p className="mt-2 flex items-center gap-1 text-xs text-primary"><CheckCircle2 size={13} /> Notification queued with provider fallback.</p>}
      {send.isError && <p className="mt-2 text-xs text-destructive break-words">{send.error.message}</p>}
      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between"><p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Provider health</p><span className="font-mono text-[10px] text-muted-foreground">{rows.length} events</span></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {["sms", "email", "voice", "payment_retry"].map((key) => {
            const item = health.data?.[key] as { provider?: string; configured?: boolean } | undefined;
            return (
              <div key={key} className="rounded-lg bg-secondary/40 px-3 py-2 min-w-0">
                <p className="text-xs font-bold capitalize truncate">{key.replace("_", " ")}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground truncate">{item?.provider ?? "simulation"} · {item?.configured ? "connected" : "fallback"}</p>
              </div>
            );
          })}
        </div>
      </div>
      {rows.length > 0 && (
        <div className="mt-4 space-y-2">
          {rows.slice(0, 3).map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs min-w-0">
              <span className="font-bold capitalize shrink-0">{row.channel.replace("_", " ")}</span>
              <span className="font-mono text-muted-foreground truncate">{row.provider} · {row.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
