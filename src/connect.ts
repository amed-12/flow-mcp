#!/usr/bin/env node
// Connects flow-mcp to the AI apps on this computer by writing a "flow" entry into each app's own MCP settings.
//   npm run connect                      finds the apps that are installed and asks before writing
//   npm run connect -- codex antigravity  connects those (names below; "all" = every app found)
//   npm run connect -- --dry-run codex    shows what would be written and writes nothing
//   npm run connect -- print              prints the entry for any other MCP app
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
const ENV = process.env.FLOW_MCP_OUTPUT ? { FLOW_MCP_OUTPUT: process.env.FLOW_MCP_OUTPUT } : undefined;
const ENTRY = { command: NODE, args: [SERVER], ...(ENV ? { env: ENV } : {}) };
const HOME = homedir();
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
  { id: "vscode", name: "VS Code", found: () => onPath("code"), connect: () => vscode(), restart: "Reload the VS Code window" },
];

async function main() {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry-run");
  let ids = argv.filter((a) => !a.startsWith("--"));
  console.log(`flow-mcp server: ${SERVER}\nNode: ${NODE}${ENV ? `\nOutput folder: ${ENV.FLOW_MCP_OUTPUT}` : ""}\n`);

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
