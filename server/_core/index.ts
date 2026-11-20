import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApp } from "./app";
import { installProcessHandlers } from "./processHandlers";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function getConfiguredHost(): string {
  const hostFlagIndex = process.argv.indexOf("--host");
  if (hostFlagIndex >= 0 && process.argv[hostFlagIndex + 1]) {
    return process.argv[hostFlagIndex + 1];
  }

  return process.env.HOST || "127.0.0.1";
}

function getConfiguredPort(defaultPort: number): number {
  const portFlagIndex = process.argv.indexOf("--port");
  if (portFlagIndex >= 0 && process.argv[portFlagIndex + 1]) {
    const requestedPort = Number(process.argv[portFlagIndex + 1]);
    if (!Number.isNaN(requestedPort)) {
      return requestedPort;
    }
  }

  const envPort = Number(process.env.PORT || "");
  return Number.isFinite(envPort) && envPort > 0 ? envPort : defaultPort;
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);

  // Log and gracefully shut down on unhandled rejections / uncaught
  // exceptions instead of dying mid-request with a bare stack dump. This is
  // the long-lived monolith only — the Vercel serverless handler
  // (apiHandler.ts) intentionally does not install these; its lifecycle is
  // owned by the platform.
  installProcessHandlers(server);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const host = getConfiguredHost();
  const preferredPort = getConfiguredPort(5500);
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
}

startServer().catch(console.error);
