import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Charger .env si présent
try {
  const envPath = resolve(
    fileURLToPath(new URL(".", import.meta.url)),
    "../.env"
  );
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
} catch { /* .env absent, pas grave */ }

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { searchHandler } from "./search";
import { psaHandler } from "./psa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.get("/api/search", searchHandler);
app.get("/api/psa", psaHandler);

const dist = path.join(__dirname, "../dist");
app.use(express.static(dist));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(3000, "0.0.0.0", () => {
  console.log("http://localhost:3000");
});
