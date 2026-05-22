import path from "path";
import dotenv from "dotenv";
import { app } from "./api/app";

dotenv.config({ override: true });

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const { default: express } = await import("express");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Persediaan ATK] Server berjalan di port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
