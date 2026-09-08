import { spawn } from "child_process";

console.log("\x1b[36m%s\x1b[0m", "🐱 [Neko-Router] Starting full-stack development environment...");
console.log("\x1b[33m%s\x1b[0m", "• Backend (Elysia): http://localhost:3000 (auto-reloads on src/ changes)");
console.log("\x1b[35m%s\x1b[0m", "• Frontend (Vite HMR): http://localhost:5173 (instant hot module reload on frontend/ changes)\n");

const isWindows = process.platform === "win32";
const bunCmd = isWindows ? "bun.exe" : "bun";

const server = spawn(bunCmd, ["--watch", "src/index.ts"], {
  stdio: "inherit",
  shell: isWindows,
  env: { ...process.env, NODE_ENV: "development" },
});

const client = spawn(bunCmd, ["x", "vite"], {
  stdio: "inherit",
  shell: isWindows,
  env: { ...process.env, NODE_ENV: "development" },
});

const cleanup = () => {
  try {
    server.kill();
    client.kill();
  } catch (e) {}
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
