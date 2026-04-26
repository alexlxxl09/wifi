import express from "express";
import { searchHandler } from "./search";
import { psaHandler } from "./psa";

const app = express();
const PORT = 3001;

app.get("/api/search", searchHandler);
app.get("/api/psa", psaHandler);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
