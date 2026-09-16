import { spawn } from "child_process";

console.log("\x1b[36m%s\x1b[0m", "🐱 [Neko-Router] Starting full-stack development environment...");
console.log("\x1b[32m%s\x1b[0m", "• Server & Frontend (Elysia + Eden): http://localhost:3000 (auto-reloads on src/ changes)\n");

const isWindows = process.platform === "win32";
const bunCmd = isWindows ? "bun.exe" : "bun";

let isShuttingDown = false;
let server: any = null;

const startServer = () => {
  if (isShuttingDown) return;
  server = spawn(bunCmd, ["--watch", "src/index.ts"], {
    stdio: "inherit",
    shell: isWindows,
    env: { ...process.env, NODE_ENV: "development" },
  });

  server.on("exit", (code: number | null) => {
    if (!isShuttingDown) {
      console.log("\x1b[32m%s\x1b[0m", `[Server] Restarting server process...`);
      setTimeout(startServer, 500);
    }
  });
};

startServer();

const cleanup = () => {
  isShuttingDown = true;
  try {
    if (server) server.kill();
  } catch (e) {}
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
