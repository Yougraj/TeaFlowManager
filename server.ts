import express from "express";
import path from "path";
import fs from "fs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import serverless from "serverless-http";

// Load configuration variables from standard .env file if it exists
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));

// CORS Headers Middleware to support Cross-Origin requests from static hosting environments like Netlify
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Admin-Email, Authorization",
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// List of authorized administrator emails
const ALLOWED_MANAGERS = [
  "yougrajbora1@gmail.com",
  "yougrajbora.developer@gmail.com",
  "yougrajbora5683@gmail.com",
];

// Authorization Middleware to prevent unauthorized mutative actions
app.use((req, res, next) => {
  // Allow normal GET queries, static assets, and system health checks
  if (req.method !== "GET" && req.path !== "/api/status") {
    const adminEmail = req.headers["x-admin-email"];
    if (!adminEmail || typeof adminEmail !== "string") {
      return res.status(403).json({
        error:
          "Access Denied: Only authorized estate admins are permitted to make modifications.",
      });
    }
    const cleanEmail = adminEmail.toLowerCase().trim();
    const isAllowed = ALLOWED_MANAGERS.map((e) =>
      e.toLowerCase().trim(),
    ).includes(cleanEmail);
    if (!isAllowed) {
      return res.status(403).json({
        error:
          "Access Denied: Only authorized estate admins are permitted to make modifications.",
      });
    }
  }
  next();
});

// Resolve MongoDB URI prioritizing actual environment variables first
function resolveMongoUri(): string | undefined {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }
  
  // Only try to read .env.example if NOT on Netlify/Serverless to avoid unnecessary FS calls
  if (!process.env.NETLIFY && !process.env.LAMBDA_TASK_ROOT) {
    try {
      const examplePath = path.join(process.cwd(), ".env.example");
      if (fs.existsSync(examplePath)) {
        const content = fs.readFileSync(examplePath, "utf-8");
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            if (key === "MONGODB_URI") {
              let val = trimmed.substring(eqIdx + 1).trim();
              if (
                (val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))
              ) {
                val = val.slice(1, -1);
              }
              return val;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading fallback MONGODB_URI from .env.example:", error);
    }
  }
  return undefined;
}

const dbName = "teaflow";

// Global cached connection for serverless environments
let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

async function getDb() {
  const uri = resolveMongoUri();
  
  if (!uri) {
    console.warn("MongoDB: MONGODB_URI is not defined in environment variables.");
    return null;
  }

  // If we have a cached connection, reuse it
  if (cachedClient && cachedDb) {
    try {
      // Quick ping to check if connection is still alive
      await cachedDb.command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.log("MongoDB: Cached connection stale, reconnecting...");
      cachedClient = null;
      cachedDb = null;
    }
  }

  try {
    console.log("MongoDB: Connecting to Atlas Cluster...");
    const client = new MongoClient(uri, {
      connectTimeoutMS: 8000, // Stay under Netlify's 10s timeout
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 30000,
      appName: "TeaFlowNetlify"
    });
    
    await client.connect();
    const db = client.db(dbName);
    
    // Cache the client and db for subsequent invocations
    cachedClient = client;
    cachedDb = db;
    
    console.log("MongoDB: Connected to Atlas successfully.");
    return db;
  } catch (err: any) {
    console.error("MongoDB: Connection error:", err.message);
    // Explicitly check for common errors
    if (err.message.includes("ETIMEOUT") || err.message.includes("Could not connect to any servers")) {
      console.error("TIP: Ensure your MongoDB Atlas Cluster has whitelisted 0.0.0.0/0 (Access from anywhere) for Netlify.");
    }
    return null;
  }
}

// Fallback JSON-based Database helper
const FALLBACK_FILE = path.join(process.cwd(), "db_fallback.json");

interface FallbackData {
  workers: any[];
  yields: any[];
  sales: any[];
}

function readFallback(): FallbackData {
  if (fs.existsSync(FALLBACK_FILE)) {
    try {
      const content = fs.readFileSync(FALLBACK_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error(
        "Failed to parse fallback database JSON, resetting file:",
        e,
      );
    }
  }
  return { workers: [], yields: [], sales: [] };
}

function writeFallback(data: FallbackData) {
  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save fallback data to file:", e);
  }
}

// Initialize fallback database with empty structures if not existing
if (!fs.existsSync(FALLBACK_FILE)) {
  try {
    writeFallback({ workers: [], yields: [], sales: [] });
  } catch (e) {
    // In serverless environments, filesystem might be read-only
    console.warn("Could not initialize fallback file (likely serverless environment)");
  }
}

// REST API Endpoints

// 1. Connection status endpoint
app.get("/api/status", async (req, res) => {
  const db = await getDb();
  const resolvedUri = resolveMongoUri();
  res.json({
    connected: !!db,
    provider: db ? "mongodb" : "file_fallback",
    uriConfigured: !!resolvedUri,
    projectId: resolvedUri ? "configured" : "none",
    environment: process.env.NETLIFY ? "netlify" : "local",
  });
});

// 2. Load all data (Batch load)
app.get("/api/data", async (req, res) => {
  try {
    const db = await getDb();
    if (db) {
      const workers = await db.collection("workers").find({}).toArray();
      const yields = await db.collection("yields").find({}).toArray();
      const sales = await db.collection("sales").find({}).toArray();

      // Clean Mongo _id elements to prevent React errors and map beautifully
      const cleanList = (arr: any[]) =>
        arr.map((item) => {
          const { _id, ...rest } = item;
          return rest;
        });

      res.json({
        workers: cleanList(workers),
        yields: cleanList(yields),
        sales: cleanList(sales),
        mongoConnected: true,
        fallbackUsed: false,
      });
    } else {
      const fallback = readFallback();
      res.json({
        workers: fallback.workers,
        yields: fallback.yields,
        sales: fallback.sales,
        mongoConnected: false,
        fallbackUsed: true,
      });
    }
  } catch (err: any) {
    console.error("GET /api/data error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// 3. Upsert a worker
app.post("/api/workers", async (req, res) => {
  try {
    const worker = req.body;
    if (!worker || !worker.id) {
      return res.status(400).json({ error: "Invalid worker structure" });
    }
    const db = await getDb();
    if (db) {
      const { _id, ...workerData } = worker;
      await db
        .collection("workers")
        .updateOne({ id: worker.id }, { $set: workerData }, { upsert: true });
      res.json({ success: true, worker });
    } else {
      const fallback = readFallback();
      const exists = fallback.workers.some((w) => w.id === worker.id);
      let updatedWorkers;
      if (exists) {
        updatedWorkers = fallback.workers.map((w) =>
          w.id === worker.id ? worker : w,
        );
      } else {
        updatedWorkers = [...fallback.workers, worker];
      }
      writeFallback({ ...fallback, workers: updatedWorkers });
      res.json({ success: true, worker });
    }
  } catch (err: any) {
    console.error("POST /api/workers error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// 4. Upsert a daily yield record
app.post("/api/yields", async (req, res) => {
  try {
    const record = req.body;
    if (!record || !record.id) {
      return res.status(400).json({ error: "Invalid yield record structure" });
    }
    const db = await getDb();
    if (db) {
      const { _id, ...recordData } = record;
      await db
        .collection("yields")
        .updateOne({ id: record.id }, { $set: recordData }, { upsert: true });
      res.json({ success: true, record });
    } else {
      const fallback = readFallback();
      const exists = fallback.yields.some((y) => y.id === record.id);
      let updatedYields;
      if (exists) {
        updatedYields = fallback.yields.map((y) =>
          y.id === record.id ? record : y,
        );
      } else {
        updatedYields = [...fallback.yields, record];
      }
      writeFallback({ ...fallback, yields: updatedYields });
      res.json({ success: true, record });
    }
  } catch (err: any) {
    console.error("POST /api/yields error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// 5. Delete a daily yield record
app.delete("/api/yields/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    if (db) {
      await db.collection("yields").deleteOne({ id });
      res.json({ success: true });
    } else {
      const fallback = readFallback();
      const updatedYields = fallback.yields.filter((y) => y.id !== id);
      writeFallback({ ...fallback, yields: updatedYields });
      res.json({ success: true });
    }
  } catch (err: any) {
    console.error("DELETE /api/yields/:id error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// 6. Upsert a sale record
app.post("/api/sales", async (req, res) => {
  try {
    const sale = req.body;
    if (!sale || !sale.id) {
      return res.status(400).json({ error: "Invalid sale structure" });
    }
    const db = await getDb();
    if (db) {
      const { _id, ...saleData } = sale;
      await db
        .collection("sales")
        .updateOne({ id: sale.id }, { $set: saleData }, { upsert: true });
      res.json({ success: true, sale });
    } else {
      const fallback = readFallback();
      const exists = fallback.sales.some((s) => s.id === sale.id);
      let updatedSales;
      if (exists) {
        updatedSales = fallback.sales.map((s) => (s.id === sale.id ? sale : s));
      } else {
        updatedSales = [...fallback.sales, sale];
      }
      writeFallback({ ...fallback, sales: updatedSales });
      res.json({ success: true, sale });
    }
  } catch (err: any) {
    console.error("POST /api/sales error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// 7. Delete a sale record
app.delete("/api/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    if (db) {
      await db.collection("sales").deleteOne({ id });
      res.json({ success: true });
    } else {
      const fallback = readFallback();
      const updatedSales = fallback.sales.filter((s) => s.id !== id);
      writeFallback({ ...fallback, sales: updatedSales });
      res.json({ success: true });
    }
  } catch (err: any) {
    console.error("DELETE /api/sales/:id error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// 8. Bulk import data
app.post("/api/data/import", async (req, res) => {
  try {
    const { workers, yields, sales } = req.body;
    const db = await getDb();
    if (db) {
      await db.collection("workers").deleteMany({});
      await db.collection("yields").deleteMany({});
      await db.collection("sales").deleteMany({});

      if (workers && workers.length > 0) {
        await db.collection("workers").insertMany(workers);
      }
      if (yields && yields.length > 0) {
        await db.collection("yields").insertMany(yields);
      }
      if (sales && sales.length > 0) {
        await db.collection("sales").insertMany(sales);
      }
      res.json({ success: true });
    } else {
      writeFallback({
        workers: workers || [],
        yields: yields || [],
        sales: sales || [],
      });
      res.json({ success: true });
    }
  } catch (err: any) {
    console.error("POST /api/data/import error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// 9. Wipe all data
app.post("/api/data/wipe", async (req, res) => {
  try {
    const db = await getDb();
    if (db) {
      await db.collection("workers").deleteMany({});
      await db.collection("yields").deleteMany({});
      await db.collection("sales").deleteMany({});
      res.json({ success: true });
    } else {
      writeFallback({ workers: [], yields: [], sales: [] });
      res.json({ success: true });
    }
  } catch (err: any) {
    console.error("POST /api/data/wipe error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Export the handler for Netlify Functions
export const handler = serverless(app);

// Only start the server if we are running in a non-serverless environment
if (!process.env.NETLIFY && !process.env.LAMBDA_TASK_ROOT) {
  (async () => {
    if (process.env.NODE_ENV !== "production") {
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } catch (e) {
        console.error("Failed to load Vite:", e);
      }
    } else {
      const distPath = path.join(process.cwd(), "dist");
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });
      }
    }

    // Pre-connect dynamically
    getDb().catch((e) => console.error("Initial database connection error:", e));

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Express server powering tea estate management on http://localhost:${PORT}`,
      );
    });
  })();
}

export default app;
