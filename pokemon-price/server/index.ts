import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Charger .env local si présent (ignoré sur Railway qui injecte les vars)
try {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
} catch { /* .env absent */ }

import express from "express";
import path from "path";
import { searchHandler } from "./search";
import { psaHandler } from "./psa";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? "3000", 10);

const app = express();

app.get("/api/search", searchHandler);
app.get("/api/psa", psaHandler);

const dist = path.join(__dirname, "../dist");
app.use(express.static(dist));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`http://localhost:${PORT}`);
});
