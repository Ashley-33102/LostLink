import dotenv from "dotenv";
dotenv.config();
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cron from "node-cron"; // ✅ Import cron
// ✅ No need to import 'node-fetch' in Node 18+
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set a default session secret if not provided
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'temp_secret_for_development';

// Add enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }
    log(logLine);
  });

  next();
});

(async () => {
  try {
    const startTime = Date.now();
    log(`Starting server at ${new Date().toISOString()}`);
    log(`Environment: ${app.get('env')}`);
    log(`NODE_ENV: ${process.env.NODE_ENV}`);
    log(`PORT: ${process.env.PORT || 5000}`);
    log(`SESSION_SECRET exists: ${Boolean(process.env.SESSION_SECRET)}`);
    log(`REPL_ID exists: ${Boolean(process.env.REPL_ID)}`);
    log(`REPL_SLUG exists: ${Boolean(process.env.REPL_SLUG)}`);

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`);
      res.status(status).json({ message });
    });

    if (process.env.NODE_ENV !== "production") {
      log('Setting up Vite middleware...');
      await setupVite(app, server);
      log('Vite middleware setup complete');
    } else {
      serveStatic(app);
    }

    // ✅ CRON JOB: auto-run cleanup every midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        const res = await fetch('http://localhost:5000/cleanup');
        const text = await res.text();
        console.log(`[CRON] Cleanup ran: ${text}`);
      } catch (err) {
        console.error('[CRON] Cleanup failed:', err);
      }
    });

    const port = process.env.PORT || 5000;
    server.listen(Number(port), "0.0.0.0", () => {
      const startupDuration = Date.now() - startTime;
      log(`Server startup took ${startupDuration}ms`);
      log(`Server running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    log(`Fatal error during startup: ${error}`);
    process.exit(1);
  }
})();