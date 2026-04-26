import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { searchHandler } from "./search";
import { psaHandler } from "./psa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== "production";
const PORT = 3000;

async function start() {
  const app = express();

  // API routes (avant Vite middleware)
  app.get("/api/search", searchHandler);
  app.get("/api/psa", psaHandler);

  if (isDev) {
    // En dev : Vite tourne en middleware dans le même processus
    const { createServer: createVite } = await import("vite");
    const vite = await createVite({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // En prod : sert le build statique
    const dist = path.join(__dirname, "../dist");
    app.use(express.static(dist));
    app.get("*", (_, res) => res.sendFile(path.join(dist, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  App running on http://localhost:${PORT}\n`);
  });
}

start().catch(console.error);
