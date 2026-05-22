import path from "path";
import dotenv from "dotenv";

dotenv.config({ override: true });

const PORT = 3000;

async function startServer() {
  const { default: app } = await import("./api/index");

  if (process.env.NODE_ENV !== "production") {
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
    console.log(`[Persediaan ATK] Server berjalan di port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
