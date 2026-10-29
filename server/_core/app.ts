import "dotenv/config";
import express, { type Express } from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerLineWebhook } from "../line/webhook";
import { registerLineWorker } from "../line/processWorker";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV } from "./env";

export function createApp(): Express {
  const app = express();

  // CORS — restrict to the configured origin in production; open in dev.
  if (ENV.allowedOrigin) {
    app.use(cors({ origin: ENV.allowedOrigin, credentials: true }));
  } else if (!ENV.isProduction) {
    app.use(cors({ origin: true, credentials: true }));
  }

  // LINE webhook needs raw body stream for HMAC validation — register before body parser
  registerLineWebhook(app);
  // Receipt and slip photos travel as base64 inside tRPC calls, so /api/trpc
  // gets a larger limit than everything else. Vercel rejects request bodies
  // over 4.5 MB before they reach this code, so 5 MB is the useful ceiling.
  // The limit is chosen per request: a second app.use() after a 1 MB parser
  // never runs, because the first parser already rejected the body.
  const jsonDefault = express.json({ limit: "1mb" });
  const jsonTrpc = express.json({ limit: "5mb" });
  app.use((req, res, next) =>
    (req.path.startsWith("/api/trpc") ? jsonTrpc : jsonDefault)(req, res, next)
  );
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  registerStorageProxy(app);
  registerLineWorker(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
