import type { RequestHandler } from "express";

const counters = new Map<string, number>();
const durations = new Map<string, { total: number; count: number }>();
const key = (method: string, route: string, status: number) => `${method.toLowerCase()}|${route}|${status}`;

export const metricsMiddleware: RequestHandler = (req, res, next) => {
  const started = performance.now();
  res.on("finish", () => {
    const route = req.route?.path ?? req.path;
    const metricKey = key(req.method, route, res.statusCode);
    counters.set(metricKey, (counters.get(metricKey) ?? 0) + 1);
    const duration = durations.get(`${req.method}|${route}`) ?? { total: 0, count: 0 };
    duration.total += performance.now() - started;
    duration.count += 1;
    durations.set(`${req.method}|${route}`, duration);
  });
  next();
};

export function prometheusMetrics() {
  const lines = [
    "# HELP revenue_recovery_http_requests_total Total HTTP requests.",
    "# TYPE revenue_recovery_http_requests_total counter",
    ...[...counters.entries()].map(([metricKey, value]) => {
      const [method, route, status] = metricKey.split("|");
      return `revenue_recovery_http_requests_total{method=\"${method}\",route=\"${route}\",status=\"${status}\"} ${value}`;
    }),
    "# HELP revenue_recovery_http_request_duration_ms Average HTTP request duration.",
    "# TYPE revenue_recovery_http_request_duration_ms gauge",
    ...[...durations.entries()].map(([metricKey, value]) => {
      const [method, route] = metricKey.split("|");
      return `revenue_recovery_http_request_duration_ms{method=\"${method}\",route=\"${route}\"} ${value.count ? value.total / value.count : 0}`;
    }),
  ];
  return `${lines.join("\n")}\n`;
}
