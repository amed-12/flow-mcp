#!/usr/bin/env node
// Carries a signed-in Flow session to another computer, for a server that has no screen to sign in on.
//   npm run session -- export [file]   where you signed in by hand (npm run login): writes the Google cookies to a file
//   npm run session -- import <file>   on the server: loads them into flow-mcp's own Chrome profile
// It never signs in and never sees a password; it moves a session the user made themselves. The file IS that session
// while it exists: it is written readable by its owner only, and it must never be handed to an AI assistant. Copy it
// straight across (scp), import it, delete both copies. This is a command for a person, deliberately not an MCP tool.
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Cookie } from "playwright-core";
import { FLOW_URL, HEADLESS, canShowWindow, getBrowser, getFlowPage, lastProject, projectUrl, rememberProject } from "./chrome.js";
import { getFlowState } from "./flow.js";

const FORMAT = "flow-mcp-session";
// Only Google's own cookies: the account session lives on .google.com, Flow on flow.google.com (formerly labs.google).
const GOOGLE = /(^|\.)google\.com$|(^|\.)labs\.google$/;
const SIGNED_IN = /^(SID|__Secure-1PSID|__Secure-3PSID)$/;

interface SessionFile {
  format: typeof FORMAT;
  exported: string;
  project?: string;
  cookies: Cookie[];
}

// Uses the Flow Chrome if it runs (in whatever mode); otherwise starts one, with no window where none can be shown.
const context = async () => {
  const b = await getBrowser(HEADLESS || !canShowWindow());
  const ctx = b.contexts()[0];
  if (!ctx) throw new Error("Chrome has no browser context; close the Flow Chrome and try again.");
  return ctx;
};

async function exportSession(file: string): Promise<void> {
  const cookies = (await (await context()).cookies()).filter((c) => GOOGLE.test(c.domain));
  if (!cookies.some((c) => SIGNED_IN.test(c.name))) {
    throw new Error("This Flow Chrome is not signed in to Google, so there is nothing to export. Run npm run login first.");
  }
  const data: SessionFile = { format: FORMAT, exported: new Date().toISOString(), project: lastProject(), cookies };
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  chmodSync(file, 0o600);
  console.log(`Wrote ${file} (${cookies.length} Google cookies${data.project ? `, project ${data.project}` : ""}).`);
  console.log("Anyone holding this file is signed in to your Google account. Copy it straight to the server, for example:");
  console.log(`  scp "${file}" you@server:~/flow-session.json`);
  console.log("then on the server, in the flow-mcp folder: npm run session -- import ~/flow-session.json");
  console.log("and delete both copies afterwards. Never paste it into a chat or give it to an AI assistant.");
}

async function importSession(file: string): Promise<void> {
  if (!existsSync(file)) throw new Error(`No file at ${file}.`);
  let data: SessionFile;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error(`${file} is not a session file made by npm run session -- export.`);
  }
  if (data.format !== FORMAT || !Array.isArray(data.cookies)) throw new Error(`${file} is not a session file made by npm run session -- export.`);
  const cookies = data.cookies.filter((c) => GOOGLE.test(c.domain));
  const ctx = await context();
  // A stale sign-in from another account would mix with the new one.
  await ctx.clearCookies({ domain: GOOGLE });
  await ctx.addCookies(cookies);
  const project = data.project && projectUrl(data.project);
  if (project) rememberProject(project);
  const page = await getFlowPage();
  await page.goto(project ?? FLOW_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const state = await getFlowState(false);
  console.log(`Loaded ${cookies.length} Google cookies from ${file} (exported ${data.exported}).`);
  if (!state.signedIn) {
    throw new Error(
      "Flow still shows the signed-out page, so Google did not accept the session here. Sessions can be tied to the computer they were made on. Sign in on this machine instead: connect with `ssh -X`, then run npm run login -- --close.",
    );
  }
  console.log(state.inProject ? `Signed in, project open: ${state.url}` : "Signed in. No project is open yet: give flow_open_project a project link.");
  console.log(`Now delete ${file}, and the exported copy on the other computer.`);
}

const [command, file] = process.argv.slice(2);
try {
  if (command === "export") await exportSession(resolve(file ?? "flow-session.json"));
  else if (command === "import" && file) await importSession(resolve(file));
  else {
    console.log("npm run session -- export [file]    (default file: flow-session.json)\nnpm run session -- import <file>");
    process.exitCode = 1;
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
process.exit();
