import { Elysia } from "elysia";
import { join } from "path";
import { existsSync } from "fs";

// Cache bundled frontend assets in memory
let cachedJs: Uint8Array | null = null;
let cachedCss: Uint8Array | null = null;
let lastBuildTime = 0;

async function bundleFrontend(force = false) {
  const isDev = process.env.NODE_ENV !== "production";
  const now = Date.now();

  // In dev mode, re-bundle if older than 1 second; in production cache forever
  if (!force && cachedJs && cachedCss && (!isDev || now - lastBuildTime < 1000)) {
    return { js: cachedJs, css: cachedCss };
  }

  try {
    const entryPath = join(import.meta.dir, "main.tsx");
    const result = await Bun.build({
      entrypoints: [entryPath],
      target: "browser",
      minify: !isDev,
      sourcemap: isDev ? "inline" : "none",
      define: {
        "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production"),
      },
    });

    if (!result.success) {
      console.error("[Web Bundler] Build failed:", result.logs);
      if (cachedJs && cachedCss) return { js: cachedJs, css: cachedCss };
      throw new Error(`Frontend bundle failed: ${result.logs.map((l) => l.message).join("\n")}`);
    }

    for (const output of result.outputs) {
      if (output.kind === "entry-point") {
        cachedJs = new Uint8Array(await output.arrayBuffer());
      } else if (output.kind === "asset" && output.path.endsWith(".css")) {
        cachedCss = new Uint8Array(await output.arrayBuffer());
      }
    }

    lastBuildTime = now;
  } catch (err) {
    console.error("[Web Bundler] Error during build:", err);
  }

  return { js: cachedJs, css: cachedCss };
}

const htmlTemplate = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/public/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Neko-Router | High Performance AI Gateway</title>
    <link rel="stylesheet" href="/_web/main.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/_web/main.js"></script>
  </body>
</html>`;

export const webHandler = new Elysia()
  // Bundled JS route
  .get("/_web/main.js", async ({ set }) => {
    const { js } = await bundleFrontend();
    if (!js) {
      set.status = 500;
      return "Bundle error";
    }
    set.headers["Content-Type"] = "application/javascript; charset=utf-8";
    set.headers["Cache-Control"] =
      process.env.NODE_ENV === "production" ? "public, max-age=86400" : "no-cache";
    return new Response(js as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control":
          process.env.NODE_ENV === "production" ? "public, max-age=86400" : "no-cache",
      },
    });
  })
  // Bundled CSS route
  .get("/_web/main.css", async ({ set }) => {
    const { css } = await bundleFrontend();
    if (!css) {
      set.status = 500;
      return "Bundle error";
    }
    return new Response(css as unknown as BodyInit, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control":
          process.env.NODE_ENV === "production" ? "public, max-age=86400" : "no-cache",
      },
    });
  })
  // Serve static public assets from src/web/public
  .get("/public/*", ({ params, set }) => {
    const publicPath = (params as Record<string, string>)["*"] || "";
    const filePath = join(import.meta.dir, "public", publicPath);
    if (publicPath && existsSync(filePath)) {
      return Bun.file(filePath);
    }
    set.status = 404;
    return "Not found";
  })
  // Fallback for favicon
  .get("/favicon.svg", () => {
    const filePath = join(import.meta.dir, "public/favicon.svg");
    if (existsSync(filePath)) {
      return Bun.file(filePath);
    }
    return new Response(null, { status: 404 });
  });

export { bundleFrontend, htmlTemplate };
