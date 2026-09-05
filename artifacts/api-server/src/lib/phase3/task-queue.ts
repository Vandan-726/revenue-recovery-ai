// In-process async task queue (Phase 3, section 3 — Celery/Redis replacement).
// Supports delayed scheduling, retries with exponential backoff, and status
// tracking. Suitable for a single-instance deployment; swap for BullMQ/Redis
// to scale horizontally without changing callers.
import { randomUUID } from "node:crypto";
import { DEMO_SPEED, MAX_SCHEDULED_DELAY_MS } from "./config";
import { logger } from "../logger";

export type TaskStatus =
  | "queued"
  | "scheduled"
  | "started"
  | "retrying"
  | "success"
  | "failed";

export interface TaskRecord {
  id: string;
  name: string;
  status: TaskStatus;
  retries: number;
  maxRetries: number;
  createdAt: number;
  updatedAt: number;
  runAt: number;
  error?: string;
  result?: unknown;
}

export interface EnqueueOptions {
  name: string;
  delaySeconds?: number;
  maxRetries?: number;
  priority?: number;
}

type TaskFn = () => Promise<unknown>;

const tasks = new Map<string, TaskRecord>();

export function getTask(id: string): TaskRecord | undefined {
  return tasks.get(id);
}

export function listTasks(): TaskRecord[] {
  return [...tasks.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function queueStats() {
  const all = listTasks();
  const by = (s: TaskStatus) => all.filter((t) => t.status === s).length;
  return {
    total: all.length,
    queued: by("queued") + by("scheduled"),
    started: by("started"),
    retrying: by("retrying"),
    success: by("success"),
    failed: by("failed"),
  };
}

// Real delays (up to 24h) are compressed for demoability; DEMO_SPEED=1 disables.
function scheduledDelayMs(delaySeconds: number): number {
  if (delaySeconds <= 0) return 0;
  const compressed = (delaySeconds * 1000) / Math.max(1, DEMO_SPEED);
  return Math.min(compressed, MAX_SCHEDULED_DELAY_MS);
}

function backoffMs(retry: number): number {
  // 60s * 2^retry, compressed the same way, capped.
  return Math.min(scheduledDelayMs(60 * 2 ** retry), MAX_SCHEDULED_DELAY_MS);
}

export function enqueue(fn: TaskFn, options: EnqueueOptions): string {
  const now = Date.now();
  const delay = scheduledDelayMs(options.delaySeconds ?? 0);
  const record: TaskRecord = {
    id: randomUUID(),
    name: options.name,
    status: delay > 0 ? "scheduled" : "queued",
    retries: 0,
    maxRetries: options.maxRetries ?? 3,
    createdAt: now,
    updatedAt: now,
    runAt: now + delay,
  };
  tasks.set(record.id, record);

  const execute = async () => {
    const current = tasks.get(record.id);
    if (!current) return;
    current.status = "started";
    current.updatedAt = Date.now();
    try {
      const result = await fn();
      current.status = "success";
      current.result = result;
      current.updatedAt = Date.now();
      logger.info({ task: current.name, id: current.id }, "Task succeeded");
    } catch (error) {
      current.error = error instanceof Error ? error.message : String(error);
      if (current.retries < current.maxRetries) {
        current.retries += 1;
        current.status = "retrying";
        current.updatedAt = Date.now();
        const wait = backoffMs(current.retries);
        current.runAt = Date.now() + wait;
        logger.warn(
          { task: current.name, id: current.id, retry: current.retries, wait },
          "Task failed; retrying",
        );
        setTimeout(execute, wait).unref?.();
      } else {
        current.status = "failed";
        current.updatedAt = Date.now();
        logger.error(
          { task: current.name, id: current.id, err: current.error },
          "Task failed permanently",
        );
      }
    }
  };

  setTimeout(execute, delay).unref?.();
  return record.id;
}
