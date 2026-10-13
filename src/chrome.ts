import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import { CHROME_HINT, IS_MAC, IS_WIN } from "./platform.js";

export const FLOW_URL = "https://flow.google.com/";
export const FLOW_HOSTS = /^https:\/\/(flow\.google\.com|labs\.google\/fx)/;
export const HOME_DIR = process.env.FLOW_MCP_HOME ?? join(homedir(), ".flow-mcp");
export const PROFILE_DIR = join(HOME_DIR, "chrome-profile");
// Where finished stills, clips and narrations go. FLOW_MCP_OUTPUT may point at another drive (D:\flow-mcp-out).
export const OUTPUT_ROOT = process.env.FLOW_MCP_OUTPUT ?? join(homedir(), "flow-mcp-out");
export const CDP_PORT = Number(process.env.FLOW_MCP_CDP_PORT ?? 9333);
const CDP_URL = `http://127.0.0.1:${CDP_PORT}`;

// FLOW_MCP_HEADLESS=1 runs Chrome with no window, for agents on a server (Hermes, Claude Code over SSH) or a machine
// nobody watches. It is Chrome's own headless mode and identifies itself as such: nothing about the browser is
// disguised. Signing in still happens by hand in a window (npm run login), or is carried over (npm run session).
export const HEADLESS = /^(1|true|yes|on)$/i.test(process.env.FLOW_MCP_HEADLESS ?? "");
// Extra Chrome flags, space-separated. A server that runs everything as root needs --no-sandbox, which is the user's
// call to make, so it is never added on its own.
const EXTRA_ARGS = (process.env.FLOW_MCP_CHROME_ARGS ?? "").split(/\s+/).filter(Boolean);
// Flow lays its navigation out for a desktop window; at 1038 px it slid off-screen (2026-10-13).
const HEADLESS_WINDOW = "--window-size=1600,1000";
const CHROME_LOG = join(HOME_DIR, "chrome.log");
const PROJECT_FILE = join(HOME_DIR, "last-project");

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

// A Flow project link, or just its id, as the project's own address (an /edit/ or /scene/ view inside it is trimmed).
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export function projectUrl(input: string): string | undefined {
  const text = input.trim();
  const id = (text.match(new RegExp(`/project/(${UUID})`, "i"))?.[1] ?? text.match(new RegExp(`^${UUID}$`, "i"))?.[0])?.toLowerCase();
  if (!id) return undefined;
  const at = text.indexOf("/project/");
  return `${FLOW_HOSTS.test(text) && at > 0 ? text.slice(0, at + 1) : FLOW_URL}project/${id}`;
}

// The last project seen open is where a fresh Chrome starts. In a window that saves a click; with no window it is the
// only way back into a project, since nobody can click one open. FLOW_MCP_PROJECT pins one instead.
export function rememberProject(url: string): void {
  const project = projectUrl(url);
  if (!project || lastProject() === project) return;
  mkdirSync(HOME_DIR, { recursive: true });
  writeFileSync(PROJECT_FILE, project + "\n");
}

export function lastProject(): string | undefined {
  try {
    return projectUrl(readFileSync(PROJECT_FILE, "utf8")) || undefined;
  } catch {
    return undefined;
  }
}

const startUrl = () => (process.env.FLOW_MCP_PROJECT && projectUrl(process.env.FLOW_MCP_PROJECT)) || lastProject() || FLOW_URL;

let browser: Browser | null = null;

async function cdpVersion(): Promise<{ Browser?: string; "User-Agent"?: string } | null> {
  try {
    const res = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(1500) });
    return res.ok ? ((await res.json()) as { Browser?: string; "User-Agent"?: string }) : null;
  } catch {
    return null;
  }
}

const cdpUp = async () => (await cdpVersion()) !== null;

// "window" or "headless" for the Chrome on the debugging port, undefined when none runs. New headless reports plain
// "Chrome/141..." as its Browser; only its user agent says HeadlessChrome (checked with Chromium 141, 2026-10-13).
export async function chromeMode(): Promise<"window" | "headless" | undefined> {
  const v = await cdpVersion();
  return v ? (/HeadlessChrome/i.test(`${v.Browser} ${v["User-Agent"]}`) ? "headless" : "window") : undefined;
}

// Where the user can act on something only a person may answer (sign-in, a consent dialog).
export async function inWindowHint(): Promise<string> {
  return (await chromeMode()) === "headless"
    ? "Flow is running with no window here. Run `npm run login` in the flow-mcp folder: it reopens the same Chrome profile in a window. Answer it there, close that window, and try again"
    : "Do it in the Flow Chrome window, then try again";
}

const tail = (file: string, lines = 6) => {
  try {
    return readFileSync(file, "utf8").trim().split(/\r?\n/).slice(-lines).join("\n");
  } catch {
    return "";
  }
};

// False on a Linux machine with no desktop session (a server, or a process started with a filtered environment).
export const canShowWindow = () => IS_MAC || IS_WIN || Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);

// Real Chrome with a dedicated profile: Google sign-in works normally and the
// session persists, while the user's everyday profile is never touched.
async function launchChrome(headless: boolean): Promise<void> {
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
  // A window on Linux needs a desktop session. A server has none, and Hermes passes MCP servers a filtered environment
  // without DISPLAY, so Chrome would exit at once and only "port never came up" would be left to see.
  if (!headless && !canShowWindow()) {
    throw new Error(
      "There is no screen here for a Chrome window (DISPLAY is not set). For an agent on a server set FLOW_MCP_HEADLESS=1 (npm run connect -- --headless writes it). To sign in, use `ssh -X` and run npm run login, or bring a session over with npm run session.",
    );
  }
  mkdirSync(PROFILE_DIR, { recursive: true });
  // Chrome's own messages go to a log, so a launch that fails can say why instead of only timing out.
  const log = openSync(CHROME_LOG, "w");
  const child = spawn(
    chromePath,
    [
      `--user-data-dir=${PROFILE_DIR}`,
      `--remote-debugging-port=${CDP_PORT}`,
      "--no-first-run",
      "--no-default-browser-check",
      ...(headless ? ["--headless=new", HEADLESS_WINDOW] : []),
      ...EXTRA_ARGS,
      startUrl(),
    ],
    { detached: true, stdio: ["ignore", "ignore", log] },
  );
  child.unref();
  closeSync(log);
  let exited = false;
  child.once("exit", () => (exited = true));
  for (let i = 0; i < 40 && !exited; i++) {
    if (await cdpUp()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  const why = tail(CHROME_LOG);
  const root = /as root without --no-sandbox/.test(why)
    ? "\nChrome refuses to run as root. Run flow-mcp as a normal user, or set FLOW_MCP_CHROME_ARGS=--no-sandbox if this machine only ever opens Flow."
    : "";
  throw new Error(`Chrome ${exited ? "exited" : "started"} but its debugging port ${CDP_PORT} never came up.${why ? `\nChrome said:\n${why}` : ""}${root}`);
}

// Right after Chrome starts, its port answers before the browser is ready for a debugger. On 2026-10-13 (Windows,
// Chrome 154) a first launch accepted the websocket and then never finished Playwright's handshake, so `npm run login`
// died after connectOverCDP's 30 s, while the same call a few seconds later connected in 0.2 s. Short tries, repeated.
async function connect(): Promise<Browser> {
  let last: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await chromium.connectOverCDP(CDP_URL, { timeout: 10_000 });
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error(`Chrome is running but did not accept the debugging connection on port ${CDP_PORT} (4 tries). Close the Flow Chrome window and try again.\n${last instanceof Error ? last.message.split("\n")[0] : String(last)}`);
}

// Closes the Flow Chrome (whatever mode it runs in) and waits until its profile is free again.
export async function closeChrome(): Promise<void> {
  if (!(await cdpUp())) return;
  const b = browser?.isConnected() ? browser : await connect();
  const session = await b.newBrowserCDPSession();
  await session.send("Browser.close").catch(() => {});
  browser = null;
  for (let i = 0; i < 30 && (await cdpUp()); i++) await new Promise((r) => setTimeout(r, 300));
  // Chrome releases the profile lock a moment after the port goes away.
  await new Promise((r) => setTimeout(r, 1000));
}

// headless: true/false launches in that mode when no Flow Chrome is running yet; an already running one is used as it
// is (the login command closes a headless one first, because a person needs a window to sign in).
export async function getBrowser(headless = HEADLESS): Promise<Browser> {
  if (browser?.isConnected()) return browser;
  if (!(await cdpUp())) await launchChrome(headless);
  browser = await connect();
  return browser;
}

export async function getFlowPage(): Promise<Page> {
  const b = await getBrowser();
  const context = b.contexts()[0];
  if (!context) throw new Error("Chrome has no browser context; restart the Flow Chrome window.");
  const existing = context.pages().find((p) => FLOW_HOSTS.test(p.url()));
  if (existing) return existing;
  const page = await context.newPage();
  await page.goto(startUrl(), { waitUntil: "domcontentloaded" });
  return page;
}
