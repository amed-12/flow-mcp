#!/usr/bin/env node
// Connects flow-mcp to the AI apps on this computer by writing a "flow" entry into each app's own MCP settings.
//   npm run connect                      finds the apps that are installed and asks before writing
//   npm run connect -- codex antigravity  connects those (names below; "all" = every app found)
//   npm run connect -- --dry-run codex    shows what would be written and writes nothing
//   npm run connect -- print              prints the entry for any other MCP app
//   npm run connect -- --headless hermes  the entry runs Chrome with no window (FLOW_MCP_HEADLESS=1), for a server
// Every entry uses absolute paths (this Node, this checkout), because apps started from the desktop often cannot find
// `node` on their PATH. Other servers in those files are left alone, and a file is backed up before its first change.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { IS_MAC, IS_WIN } from "./platform.js";

const SERVER = fileURLToPath(new URL("./index.js", import.meta.url));
const NODE = process.execPath;
// flow-mcp settings set in this shell are written into every entry, since apps start the server without them.
const PASSED = ["FLOW_MCP_OUTPUT", "FLOW_MCP_HOME", "FLOW_MCP_HEADLESS", "FLOW_MCP_PROJECT", "FLOW_MCP_CHROME", "FLOW_MCP_CHROME_ARGS"];
const vars: Record<string, string> = Object.fromEntries(PASSED.filter((k) => process.env[k]).map((k) => [k, process.env[k]!]));
if (process.argv.includes("--headless")) vars.FLOW_MCP_HEADLESS = "1";
const ENV = Object.keys(vars).length ? vars : undefined;
const ENTRY = { command: NODE, args: [SERVER], ...(ENV ? { env: ENV } : {}) };
const HOME = homedir();
const HERMES_HOME = process.env.HERMES_HOME ?? join(HOME, ".hermes");
const GEMINI = join(HOME, ".gemini");
const CODEX_HOME = process.env.CODEX_HOME ?? join(HOME, ".codex");
const CLAUDE_DESKTOP = IS_MAC
  ? join(HOME, "Library", "Application Support", "Claude", "claude_desktop_config.json")
  : IS_WIN
    ? join(process.env.APPDATA ?? join(HOME, "AppData", "Roaming"), "Claude", "claude_desktop_config.json")
    : undefined; // There is no Claude desktop app for Linux.

const onPath = (cmd: string) => {
  try {
    execFileSync(IS_WIN ? "where" : "which", [cmd], { stdio: "ignore", windowsHide: true });
    return true;
  } catch {
    return false;
  }
};

// Copies a settings file aside before flow-mcp first touches it. A later run keeps that first copy: it is the original.
function backup(file: string): string | undefined {
  if (!existsSync(file) || !readFileSync(file, "utf8").trim()) return undefined;
  const copy = `${file}.bak-flowmcp`;
  if (!existsSync(copy)) copyFileSync(file, copy);
  return copy;
}

// JSON settings shared by most apps: { "mcpServers": { "<name>": { command, args, env } } }. An empty file counts as {}
// (Antigravity creates mcp_config.json empty); a file that is not plain JSON is left alone with instructions instead.
function mergeJson(file: string, dry: boolean): string {
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  let data: { mcpServers?: Record<string, unknown> };
  try {
    data = text.trim() ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${file} is not plain JSON (comments?), so it was not changed. Add this under "mcpServers" by hand:\n"flow": ${JSON.stringify(ENTRY, null, 2)}`);
  }
  const next = JSON.stringify({ ...data, mcpServers: { ...(data.mcpServers ?? {}), flow: ENTRY } }, null, 2) + "\n";
  // Only our own entry is shown: these files also hold account ids and app preferences that have no place in a log.
  const others = Object.keys(data).filter((k) => k !== "mcpServers").length + Object.keys(data.mcpServers ?? {}).filter((k) => k !== "flow").length;
  if (dry) return `would set mcpServers.flow in ${file} (${others} other setting(s) and server(s) left as they are):\n"flow": ${JSON.stringify(ENTRY, null, 2)}`;
  mkdirSync(dirname(file), { recursive: true });
  const copy = backup(file);
  writeFileSync(file, next);
  return `wrote ${file}${copy ? ` (original kept as ${copy})` : ""}`;
}

// Codex keeps its settings in TOML. Only the [mcp_servers.flow] tables are replaced; every other line stays as it was.
// TOML basic strings take the same escapes as JSON, so JSON.stringify writes Windows paths correctly.
export function codexToml(existing: string): string {
  const own = /^\s*\[\s*mcp_servers\.("flow"|flow)(\.[^\]]*)?\s*\]/;
  const kept: string[] = [];
  let skipping = false;
  for (const line of existing.split(/\r?\n/)) {
    if (/^\s*\[/.test(line)) skipping = own.test(line);
    if (!skipping) kept.push(line);
  }
  const block = [
    "[mcp_servers.flow]",
    `command = ${JSON.stringify(NODE)}`,
    `args = [${JSON.stringify(SERVER)}]`,
    // Codex gives a server 10 s to start; a busy Flow session can take longer to hand over.
    "startup_timeout_sec = 60",
    ...(ENV ? ["", "[mcp_servers.flow.env]", ...Object.entries(ENV).map(([k, v]) => `${k} = ${JSON.stringify(v)}`)] : []),
  ];
  return [...kept.join("\n").replace(/\s+$/, "").split("\n"), "", ...block, ""].join("\n").replace(/^\n+/, "");
}

function writeCodex(dry: boolean): string {
  const file = join(CODEX_HOME, "config.toml");
  const next = codexToml(existsSync(file) ? readFileSync(file, "utf8") : "");
  if (dry) return `would write ${file} (only the [mcp_servers.flow] part changes):\n${next.slice(next.indexOf("[mcp_servers.flow]"))}`;
  mkdirSync(CODEX_HOME, { recursive: true });
  const copy = backup(file);
  writeFileSync(file, next);
  return `wrote ${file}${copy ? ` (original kept as ${copy})` : ""}`;
}

// Hermes (Nous Research) keeps MCP servers under `mcp_servers:` in ~/.hermes/config.yaml. It hands a stdio server only
// PATH, HOME, USER, LANG, LC_ALL, TERM, SHELL, TMPDIR, XDG_* and the Windows basics, plus the entry's own `env`
// (tools/mcp_tool_config.py, _build_safe_env). On a Linux desktop Chrome also needs the display for a window, and the
// session bus to unlock the keyring its cookies are encrypted with - without it the profile reads as signed out.
const LINUX_DESKTOP = ["DISPLAY", "WAYLAND_DISPLAY", "DBUS_SESSION_BUS_ADDRESS"];
export function hermesEnv(base = ENV, source: NodeJS.ProcessEnv = process.env): Record<string, string> | undefined {
  const desktop = IS_MAC || IS_WIN ? [] : LINUX_DESKTOP.filter((k) => source[k] && !(base?.FLOW_MCP_HEADLESS && k.endsWith("DISPLAY")));
  const env = { ...base, ...Object.fromEntries(desktop.map((k) => [k, source[k]!])) };
  return Object.keys(env).length ? env : undefined;
}

// Only the `flow:` entry under the top-level `mcp_servers:` is replaced; every other line stays as it was. YAML reads
// JSON strings and arrays as they are, so JSON.stringify quotes paths (also Windows ones) correctly.
export function hermesYaml(existing: string, env = hermesEnv()): string {
  const entry = (pad: string) => [
    `${pad}flow:`,
    `${pad}${pad}command: ${JSON.stringify(NODE)}`,
    `${pad}${pad}args: [${JSON.stringify(SERVER)}]`,
    ...(env ? [`${pad}${pad}env:`, ...Object.entries(env).map(([k, v]) => `${pad}${pad}${pad}${k}: ${JSON.stringify(v)}`)] : []),
    // Hermes waits 60 s for a server to start by default and 300 s per call; flow-mcp answers every call within 45 s.
    `${pad}${pad}connect_timeout: 60`,
  ];
  const lines = existing.split(/\r?\n/);
  const top = lines.findIndex((l) => /^mcp_servers\s*:\s*(#.*)?$/.test(l));
  if (top < 0) {
    if (lines.some((l) => /^mcp_servers\s*:/.test(l))) {
      throw new Error(`mcp_servers in this file is written inline ({...}), so it was not changed. Add this under mcp_servers by hand:\n${entry("  ").join("\n")}`);
    }
    return [...existing.replace(/\s+$/, "").split("\n"), "", "mcp_servers:", ...entry("  "), ""].join("\n").replace(/^\n+/, "");
  }
  // The section runs until the next line that starts at column 0 and is not a comment.
  let end = top + 1;
  while (end < lines.length && (!lines[end].trim() || /^\s/.test(lines[end]) || lines[end].startsWith("#"))) end++;
  const indentOf = (l: string) => l.match(/^\s*/)![0].length;
  const firstChild = lines.slice(top + 1, end).find((l) => l.trim() && !l.trim().startsWith("#"));
  const pad = firstChild ? " ".repeat(indentOf(firstChild)) : "  ";
  const kept = lines.slice(top + 1, end);
  const at = kept.findIndex((l) => indentOf(l) === pad.length && /^\s*("flow"|'flow'|flow)\s*:/.test(l));
  if (at >= 0) {
    let stop = at + 1;
    while (stop < kept.length && (!kept[stop].trim() || indentOf(kept[stop]) > pad.length)) stop++;
    kept.splice(at, stop - at);
  }
  return [...lines.slice(0, top + 1), ...entry(pad), ...kept, ...lines.slice(end)].join("\n");
}

function writeHermes(dry: boolean): string {
  const file = join(HERMES_HOME, "config.yaml");
  const next = hermesYaml(existsSync(file) ? readFileSync(file, "utf8") : "");
  const env = hermesEnv();
  const hint = !IS_MAC && !IS_WIN && !env?.FLOW_MCP_HEADLESS && !env?.DISPLAY && !env?.WAYLAND_DISPLAY ? "\n  No screen here: run npm run connect -- --headless hermes so Chrome runs with no window." : "";
  if (dry) return `would write ${file} (only mcp_servers.flow changes):\n${hermesYaml("").trimEnd()}${hint}`;
  mkdirSync(HERMES_HOME, { recursive: true });
  const copy = backup(file);
  writeFileSync(file, next);
  return `wrote ${file}${copy ? ` (original kept as ${copy})` : ""}${hint}`;
}

function claudeCode(dry: boolean): string {
  const envArgs = Object.entries(ENV ?? {}).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
  const args = ["mcp", "add", "--scope", "user", ...envArgs, "flow", "--", NODE, SERVER];
  const shown = `claude ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")}`;
  if (dry) return `would run: ${shown}`;
  // claude is a .cmd shim on Windows, which only starts through the shell; quote anything with spaces for it.
  const run = (a: string[]) =>
    execFileSync("claude", IS_WIN ? a.map((x) => (/\s/.test(x) ? `"${x}"` : x)) : a, { stdio: "ignore", shell: IS_WIN, windowsHide: true });
  try {
    run(["mcp", "remove", "--scope", "user", "flow"]);
  } catch {
    // Not connected before.
  }
  run(args);
  return `ran: ${shown}`;
}

const vscode = () =>
  `open the Command Palette -> "MCP: Add Server" -> Command (stdio), and enter\n  ${[NODE, SERVER].map((a) => `"${a}"`).join(" ")}\nor run: code --add-mcp '${JSON.stringify({ name: "flow", ...ENTRY })}'`;

const printAll = () =>
  [
    "JSON apps (Antigravity, Gemini CLI, Cursor, Claude Desktop and most others), inside \"mcpServers\":",
    `"flow": ${JSON.stringify(ENTRY, null, 2)}`,
    "",
    "Codex (~/.codex/config.toml):",
    codexToml("").trimEnd(),
    "",
    `VS Code: ${vscode()}`,
    "",
    "Hermes (~/.hermes/config.yaml):",
    hermesYaml("").trimEnd(),
  ].join("\n");

interface Target {
  id: string;
  name: string;
  found: () => boolean;
  connect: (dry: boolean) => string;
  restart: string;
}

const TARGETS: Target[] = [
  { id: "codex", name: "Codex", found: () => existsSync(CODEX_HOME) || onPath("codex"), connect: writeCodex, restart: "Restart Codex" },
  {
    id: "antigravity",
    name: "Antigravity",
    // Antigravity's own docs (agy-customizations/docs/mcp_servers.md): the global file is ~/.gemini/config/mcp_config.json.
    found: () => ["antigravity", "antigravity-ide", "config/mcp_config.json"].some((p) => existsSync(join(GEMINI, p))),
    connect: (dry) => mergeJson(join(GEMINI, "config", "mcp_config.json"), dry),
    restart: "Restart Antigravity (or Manage MCP Servers -> Refresh)",
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    found: () => existsSync(join(GEMINI, "settings.json")) || onPath("gemini"),
    connect: (dry) => mergeJson(join(GEMINI, "settings.json"), dry),
    restart: "Start a new gemini session",
  },
  { id: "cursor", name: "Cursor", found: () => existsSync(join(HOME, ".cursor")), connect: (dry) => mergeJson(join(HOME, ".cursor", "mcp.json"), dry), restart: "Restart Cursor" },
  { id: "claude-code", name: "Claude Code", found: () => onPath("claude"), connect: claudeCode, restart: "Start a new Claude Code session" },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    found: () => Boolean(CLAUDE_DESKTOP && existsSync(dirname(CLAUDE_DESKTOP))),
    connect: (dry) => {
      if (!CLAUDE_DESKTOP) throw new Error("The Claude desktop app does not exist for Linux; use Claude Code instead.");
      return mergeJson(CLAUDE_DESKTOP, dry);
    },
    restart: "Quit Claude completely and open it again",
  },
  {
    id: "hermes",
    name: "Hermes",
    found: () => existsSync(HERMES_HOME) || onPath("hermes"),
    connect: writeHermes,
    restart: "Type /reload-mcp in a running Hermes chat, or start a new one",
  },
  { id: "vscode", name: "VS Code", found: () => onPath("code"), connect: () => vscode(), restart: "Reload the VS Code window" },
];

async function main() {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry-run");
  let ids = argv.filter((a) => !a.startsWith("--"));
  const settings = Object.entries(ENV ?? {}).map(([k, v]) => `\n${k}=${v}`).join("");
  console.log(`flow-mcp server: ${SERVER}\nNode: ${NODE}${settings}\n`);

  if (ids.includes("print")) return console.log(printAll());
  const found = TARGETS.filter((t) => t.found());
  if (ids.includes("all")) ids = found.map((t) => t.id);
  if (!ids.length) {
    console.log(`Found: ${found.map((t) => `${t.name} (${t.id})`).join(", ") || "none of the apps this command knows"}.`);
    if (!found.length || !process.stdin.isTTY) {
      return console.log(`\nRun: npm run connect -- <${TARGETS.map((t) => t.id).join("|")}|all|print> [--dry-run]`);
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(`Connect flow to ${found.map((t) => t.name).join(", ")}? [Y/n] `)).trim().toLowerCase();
    rl.close();
    if (answer && answer !== "y" && answer !== "yes") return console.log("Nothing changed.");
    ids = found.map((t) => t.id);
  }

  let failed = false;
  for (const id of ids) {
    const target = TARGETS.find((t) => t.id === id);
    if (!target) {
      console.log(`? ${id}: unknown. Choose from ${TARGETS.map((t) => t.id).join(", ")}, all, print.`);
      failed = true;
      continue;
    }
    try {
      console.log(`${dry ? "-" : "✓"} ${target.name}: ${target.connect(dry)}${dry ? "" : `\n  ${target.restart}, then ask: "check my Flow session".`}`);
    } catch (err) {
      failed = true;
      console.log(`✗ ${target.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (failed) process.exitCode = 1;
}

// Only when run as a command, so tests can import codexToml without writing anything.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
