#!/usr/bin/env node
// Sign-in, by hand: opens the dedicated Chrome profile on Flow IN A WINDOW so the user signs in to Google themselves.
// The program never sees or types the password. The session stays in the profile, so a headless run later
// (FLOW_MCP_HEADLESS=1) reuses it.
//   npm run login               open the window; in a terminal, wait until you are signed in with a project open
//   npm run login -- --close    then close the window again (the default with FLOW_MCP_HEADLESS=1)
//   npm run login -- --yes      reopen a running headless Chrome in a window without asking first
import { createInterface } from "node:readline/promises";
import { FLOW_HOSTS, HEADLESS, PROFILE_DIR, canShowWindow, chromeMode, closeChrome, getBrowser, getFlowPage, rememberProject } from "./chrome.js";

const argv = process.argv.slice(2);
const close = argv.includes("--close") || HEADLESS;
const wait = close || argv.includes("--wait") || Boolean(process.stdin.isTTY);

// Checked before anything is closed: on a server a running headless Chrome is all there is.
if (!canShowWindow()) {
  console.log(
    [
      "There is no screen here for the sign-in window (DISPLAY is not set). Either:",
      "  - connect with a forwarded display and run this again: ssh -X you@this-machine, then npm run login -- --close",
      "  - or sign in on a computer with a screen and carry the session over:",
      "      there: npm run login, then npm run session -- export",
      "      here:  npm run session -- import <file>",
    ].join("\n"),
  );
  process.exit(1);
}

// A headless Chrome holds the profile and has no window to sign in with, so it has to be reopened in one.
if ((await chromeMode()) === "headless") {
  console.log(
    "The Flow Chrome is running with no window. Signing in needs one, so it will close and reopen in a window. Anything it is generating right now stops being watched; Flow itself finishes it and the result stays in your project.",
  );
  if (!argv.includes("--yes")) {
    if (!process.stdin.isTTY) {
      console.log("Run `npm run login -- --yes` to go ahead.");
      process.exit(1);
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question("Reopen it in a window? [Y/n] ")).trim().toLowerCase();
    rl.close();
    if (answer && answer !== "y" && answer !== "yes") process.exit(0);
  }
  await closeChrome();
}

const browser = await getBrowser(false);
try {
  const page = await getFlowPage();
  await page.bringToFront();
  console.log(`Chrome is open on ${page.url()}`);
} catch (err) {
  // The window is open either way; the user can retry the page there.
  console.log(`Chrome is open, but Flow did not load (${(err instanceof Error ? err.message : String(err)).split("\n")[0]}). Check the connection and reload it in that window.`);
}
console.log(`Profile: ${PROFILE_DIR}`);
console.log("Sign in to Google in that window, then open or create a Flow project. The session is kept for next time.");
if (!wait) process.exit(0);

// Watch the window's tabs without opening any: while the user is on Google's sign-in page there is no Flow tab, and
// getFlowPage would open a second one.
const flowUrls = () => browser.contexts().flatMap((c) => c.pages().map((p) => p.url())).filter((u) => FLOW_HOSTS.test(u));
let signedIn = false;
let project: string | undefined;
const deadline = Date.now() + 20 * 60_000;
while (Date.now() < deadline) {
  if (!browser.isConnected()) {
    console.log("The window was closed before a project was open. Run npm run login again when you are ready.");
    process.exit(1);
  }
  const urls = flowUrls();
  project = urls.find((u) => /\/project\//.test(u));
  if (project) break;
  if (!signedIn && urls.some((u) => !/\/about/.test(u))) {
    signedIn = true;
    console.log("Signed in. Now open (or create) a project in that window.");
  }
  await new Promise((r) => setTimeout(r, 2000));
}
if (!project) {
  console.log("Stopped waiting after 20 minutes. The window stays open; run npm run login again once a project is open.");
  process.exit(1);
}
rememberProject(project);
console.log(`Ready: signed in, project ${project} (remembered for next time).`);
if (close) {
  await closeChrome();
  console.log("Window closed. flow-mcp opens Chrome again by itself when it needs Flow, with no window if FLOW_MCP_HEADLESS=1 is set for it.");
} else {
  console.log("Leave the window open or close it; flow-mcp reopens it when it needs Flow.");
}
process.exit(0);
