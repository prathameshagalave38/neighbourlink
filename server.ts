import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { getDb } from "./backend/app/database/client.ts";
import { authRouter } from "./backend/app/api/v1/auth/authRoutes.ts";
import { societyRouter } from "./backend/app/api/v1/admin/societyRoutes.ts";

// Load environment configurations
dotenv.config();

async function bootstrap() {
  const app = express();
  const PORT = 3000;

  // JSON Body parsing middleware
  app.use(express.json());

  // Test Database connectivity on server bootup
  try {
    const db = await getDb();
    console.log(`Database connected successfully. Type: ${db.isAtlas ? "MongoDB Atlas" : "Local Persistent JSON File fallback"}`);
  } catch (err) {
    console.error("Critical: Initial database connection check failed:", err);
  }

  // Register Auth API routes
  app.use("/api/v1/auth", authRouter);

  // Register Society Setup API routes
  app.use("/api/v1/society-management", societyRouter);

  // API v1 Health probe endpoint
  app.get("/api/v1/health", async (req, res) => {
    try {
      const db = await getDb();
      res.json({
        success: true,
        status: "healthy",
        service: "NeighbourLink v1 Engine",
        dbType: db.isAtlas ? "MongoDB Atlas" : "Local File-based fallback"
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        status: "unhealthy",
        error: err.message || "Database connection failure"
      });
    }
  });

  // Serve Frontend assets depending on execution mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NeighbourLink] Server running in ${process.env.NODE_ENV || "development"} mode on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
