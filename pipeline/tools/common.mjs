// Small helpers shared by the pipeline tools. No dependencies beyond Node and the pipeline's own packages.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PIPELINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TEMPLATE = join(PIPELINE, "remotion-template");
export const HOME = process.env.FLOW_MCP_HOME || join(homedir(), ".flow-mcp");
export const VENV = process.env.PIPELINE_VENV || join(HOME, "pipeline-venv");
export const KOKORO_DIR = process.env.KOKORO_DIR || join(HOME, "kokoro");
export const IS_WIN = process.platform === "win32";
export const PYTHON = join(VENV, IS_WIN ? "Scripts/python.exe" : "bin/python");
export const FPS = 30;

export const runPaths = (run) => {
  const dir = resolve(run);
  return {
    dir,
    video: join(dir, "video"),
    audio: join(dir, "audio"),
    publicAudio: join(dir, "video", "public", "audio"),
    review: join(dir, "review"),
    out: join(dir, "out"),
  };
};

export const ensureDir = (p) => {
  mkdirSync(p, { recursive: true });
  return p;
};

/** Run a command, inherit output, throw with a readable message on failure. */
export function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: opts.capture ? "pipe" : "inherit", encoding: "utf8", ...opts });
  if (r.error) throw new Error(`${cmd} could not start: ${r.error.message}`);
  if (r.status !== 0) {
    const tail = opts.capture ? `\n${(r.stderr || r.stdout || "").trim().split("\n").slice(-15).join("\n")}` : "";
    throw new Error(`${cmd} ${args.slice(0, 3).join(" ")} ... exited with ${r.status}${tail}`);
  }
  return r.stdout || "";
}

export const has = (cmd) => spawnSync(cmd, ["-version"], { stdio: "ignore" }).status === 0 || spawnSync(cmd, ["--version"], { stdio: "ignore" }).status === 0;

export function needPython() {
  if (!existsSync(PYTHON)) throw new Error(`audio tools are not set up yet: run  node pipeline/run.mjs setup  (expected ${PYTHON})`);
  return PYTHON;
}

/** Frames per scene, rounded so they add up exactly to the whole video. */
export function sceneFrames(scenario) {
  const total = Math.round(scenario.duration_s * FPS);
  let acc = 0;
  const frames = scenario.scenes.map((s, i) => {
    const end = i === scenario.scenes.length - 1 ? total : Math.round((acc + s.duration_s) * FPS);
    const f = end - Math.round(acc * FPS);
    acc += s.duration_s;
    return f;
  });
  return { total, frames };
}
