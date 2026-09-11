import path from "path";
import dotenv from "dotenv";

dotenv.config({ override: true });

const PORT = 3000;

// How the frontend is served is decided by the npm script (--dev / --prod),
// not by NODE_ENV. dotenv runs with override:true, so a local .env carrying
// NODE_ENV=production would otherwise make `npm run dev` quietly serve a
// stale dist/ build instead of Vite — edits appear to do nothing.
// With no flag, fall back to the old NODE_ENV behaviour.
const serveBuiltFiles =
  process.argv.includes("--prod") ||
  (!process.argv.includes("--dev") && process.env.NODE_ENV === "production");

async function startServer() {
  const { default: app } = await import("./api/index");

  if (!serveBuiltFiles) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const { default: express } = await import("express");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: any, res: any) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    const mode = serveBuiltFiles ? "produksi (menyajikan dist/)" : "pengembangan (Vite, hot reload)";
    console.log(`[Persediaan ATK] Server berjalan di port ${PORT} — mode ${mode}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
