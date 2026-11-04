import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// Ensure ports 8080, 3001, 5173 are free before starting
function freePort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].endsWith(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== "0" && pid !== String(process.pid)) {
            pids.add(pid);
          }
        }
      }
      for (const pid of pids) {
        try { execSync(`taskkill /pid ${pid} /F`, { stdio: "ignore" }); } catch (_) {}
      }
    }
  } catch (_) {}
}

freePort(8080);
freePort(3001);
freePort(5173);

const services = [
  {
    name: "BACKEND",
    color: "\x1b[32m", // Green
    cwd: path.join(__dirname, "backend"),
    cmd: "mvn",
    args: ["spring-boot:run"]
  },
  {
    name: "WORKER ",
    color: "\x1b[33m", // Yellow
    cwd: path.join(__dirname, "browser-worker"),
    cmd: "npm",
    args: ["run", "dev"]
  },
  {
    name: "FRONTEND",
    color: "\x1b[35m", // Magenta
    cwd: path.join(__dirname, "frontend"),
    cmd: "npm",
    args: ["run", "dev"]
  }
];

console.log(`${BOLD}\x1b[36m========================================================${RESET}`);
console.log(`${BOLD}\x1b[36m   Universal AI Browser Agent - Launching All Services  ${RESET}`);
console.log(`${BOLD}\x1b[36m========================================================${RESET}\n`);

const children = [];

for (const svc of services) {
  const prefix = `${svc.color}[${svc.name}]${RESET} `;
  console.log(`${prefix}Starting in ${svc.cwd}...`);

  const child = spawn(svc.cmd, svc.args, {
    cwd: svc.cwd,
    shell: true,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  const logLines = (data, isError = false) => {
    const text = data.toString();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (line.trim().length > 0) {
        if (isError) {
          process.stderr.write(`${prefix}\x1b[31m${line}${RESET}\n`);
        } else {
          process.stdout.write(`${prefix}${line}\n`);
        }
      }
    }
  };

  child.stdout.on("data", d => logLines(d, false));
  child.stderr.on("data", d => logLines(d, true));

  child.on("close", code => {
    console.log(`${prefix}Process exited with code ${code}`);
  });

  child.on("error", err => {
    console.error(`${prefix}Failed to start:`, err.message);
  });

  children.push(child);
}

function cleanup() {
  console.log(`\n${BOLD}Shutting down all services...${RESET}`);
  for (const c of children) {
    try {
      if (process.platform === "win32" && c.pid) {
        spawn("taskkill", ["/pid", c.pid.toString(), "/T", "/F"], { shell: true });
      } else {
        c.kill("SIGINT");
      }
    } catch (_) {}
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
