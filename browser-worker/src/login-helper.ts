import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targetUrl = process.argv[2] || "https://www.canva.com/login";
const parsed = new URL(targetUrl);
const domainName = parsed.hostname.replace(/^www\./, "").split(".")[0]; // e.g. "canva"

const sessionDir = path.join(__dirname, "../sessions");
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}
const sessionFile = path.join(sessionDir, `${domainName}.json`);

async function run() {
  console.log(`\n======================================================`);
  console.log(`  Universal AI Browser Agent - User-Assisted Login`);
  console.log(`======================================================`);
  console.log(`Opening browser window for: ${targetUrl}`);
  console.log(`1. Complete your login (Google, Email, 2FA, OTP) in the browser.`);
  console.log(`2. Once logged in and on your Canva home/dashboard, come back here.`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"]
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();
  await page.goto(targetUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  await new Promise<void>((resolve) => {
    rl.question("Once you have successfully logged in, press [ENTER] here to save session: ", async () => {
      try {
        await context.storageState({ path: sessionFile });
        console.log(`\n[SUCCESS] Session saved to: ${sessionFile}`);
        console.log(`The AI Browser Agent will now use this logged-in session automatically!\n`);
      } catch (err) {
        console.error("[ERROR] Failed to save storage state:", err);
      }
      rl.close();
      await browser.close();
      resolve();
    });
  });
}

run().catch(console.error);
