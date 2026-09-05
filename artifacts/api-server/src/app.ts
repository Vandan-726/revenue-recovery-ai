import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { metricsMiddleware, prometheusMetrics } from "./lib/phase5/metrics";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const app: Express = express();

app.use((req, res, next) => {
  if (["TRACE", "CONNECT", "PURGE"].includes(req.method)) {
    res.status(405).json({
      error: "method_not_allowed",
      message: `HTTP method ${req.method} is strictly prohibited.`,
    });
    return;
  }
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(metricsMiddleware);
app.get("/metrics", (_req, res) => {
  res.type("text/plain").send(prometheusMetrics());
});
app.use(
  express.json({
    verify: (_req, _res, buffer) => {
      ( _req as express.Request).rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

app.use(["/api", "/"], router);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, requestId: req.id }, "Unhandled request error");
  if (err instanceof URIError || (err instanceof SyntaxError && "status" in err && err.status === 400)) {
    return res.status(400).json({
      error: "invalid_request",
      message: "Invalid request URL or payload encoding.",
      request_id: req.id,
    });
  }
  return res.status(500).json({
    error: "internal_server_error",
    message: "An unexpected error occurred.",
    request_id: req.id,
  });
});

export default app;
