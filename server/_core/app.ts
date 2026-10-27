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
  // General routes use a 1 MB limit; the tRPC upload path uses 50 MB.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  // tRPC receipt/slip upload path needs a higher body limit.
  app.use(
    "/api/trpc/expenses.uploadReceipt,line.uploadSlip",
    express.json({ limit: "50mb" })
  );
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
