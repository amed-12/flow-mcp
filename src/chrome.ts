import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import { CHROME_HINT } from "./platform.js";

export const FLOW_URL = "https://flow.google.com/";
const FLOW_HOSTS = /^https:\/\/(flow\.google\.com|labs\.google\/fx)/;
export const HOME_DIR = process.env.FLOW_MCP_HOME ?? join(homedir(), ".flow-mcp");
export const PROFILE_DIR = join(HOME_DIR, "chrome-profile");
// Where finished stills, clips and narrations go. FLOW_MCP_OUTPUT may point at another drive (D:\flow-mcp-out).
export const OUTPUT_ROOT = process.env.FLOW_MCP_OUTPUT ?? join(homedir(), "flow-mcp-out");
export const CDP_PORT = Number(process.env.FLOW_MCP_CDP_PORT ?? 9333);
const CDP_URL = `http://127.0.0.1:${CDP_PORT}`;

const CHROME_PATHS = [
  process.env.FLOW_MCP_CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  // Linux: Google's .deb first, then a distro Chromium. Snap Chromium goes last - see launchChrome.
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  // Windows also installs Chrome here: 32-bit builds, and per-user installs made without admin rights.
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : undefined,
].filter((p): p is string => Boolean(p));

// True for a snap browser asked to use a folder inside a hidden directory of the home folder.
export function snapBlocked(chromePath: string, dir: string, home = homedir()): boolean {
  if (!chromePath.startsWith("/snap/")) return false;
  const rel = relative(home, dir);
  return !rel.startsWith("..") && rel.split(/[\\/]/).some((part) => part.startsWith("."));
}

let browser: Browser | null = null;

async function cdpUp(): Promise<boolean> {
  try {
    const res = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

// Real Chrome with a dedicated profile: Google sign-in works normally and the
// session persists, while the user's everyday profile is never touched.
async function launchChrome(): Promise<void> {
  const chromePath = CHROME_PATHS.find((p) => existsSync(p));
  if (!chromePath) {
    throw new Error(`Google Chrome not found. Install it (${CHROME_HINT}), or set FLOW_MCP_CHROME to the Chrome executable path.`);
  }
  // Ubuntu's Chromium is a snap, and snaps cannot read or write hidden folders in the home directory - the profile and
  // download folders under ~/.flow-mcp would fail in ways that look like Flow bugs. Say so up front.
  if (snapBlocked(chromePath, PROFILE_DIR)) {
    throw new Error(
      `Chromium is installed as a snap, which cannot use the hidden folder ${HOME_DIR}. Install Google Chrome instead (${CHROME_HINT}), or set FLOW_MCP_HOME to a folder that is not hidden, such as ~/flow-mcp-home.`,
    );
  }
  mkdirSync(PROFILE_DIR, { recursive: true });
  const child = spawn(
    chromePath,
    [
      `--user-data-dir=${PROFILE_DIR}`,
      `--remote-debugging-port=${CDP_PORT}`,
      "--no-first-run",
      "--no-default-browser-check",
      FLOW_URL,
    ],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
  for (let i = 0; i < 40; i++) {
    if (await cdpUp()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Chrome started but CDP port ${CDP_PORT} never came up.`);
}

export async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;
  if (!(await cdpUp())) await launchChrome();
  browser = await chromium.connectOverCDP(CDP_URL);
  return browser;
}

export async function getFlowPage(): Promise<Page> {
  const b = await getBrowser();
  const context = b.contexts()[0];
  if (!context) throw new Error("Chrome has no browser context; restart the Flow Chrome window.");
  const existing = context.pages().find((p) => FLOW_HOSTS.test(p.url()));
  if (existing) return existing;
  const page = await context.newPage();
  await page.goto(FLOW_URL, { waitUntil: "domcontentloaded" });
  return page;
}
