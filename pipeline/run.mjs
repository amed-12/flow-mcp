#!/usr/bin/env node
// Video pipeline: scenario -> prompt -> generate -> result. Each stage is a separate agent run that reads
// pipeline/stages/<n>-*.md; this script only starts them, checks the hand-off files and stops for approvals.
//
//   node pipeline/run.mjs setup                      install Remotion deps, Python venv + Kokoro voice model
//   node pipeline/run.mjs make <brief.md> [options]  run the four stages with an agent harness
//       --agent claude|codex|gemini|hermes   which CLI runs each stage (default claude; see harness table below)
//       --slug <name>                        run folder name (default: from the brief's file name)
//       --from scenario|prompt|generate|result   start at a later stage of an existing run
//       --yes                                skip the scenario approval (credit approval is never skipped)
//       --dry-run                            print the agent commands instead of running them
//   node pipeline/run.mjs build <run dir>    no agent needed: TTS, music/SFX, mix, manifest, typecheck, render
//   node pipeline/run.mjs stills <run dir>   one PNG per scene (middle frame) into <run>/review, for looking at work
//   node pipeline/run.mjs review <run dir>   measurable checks + contact sheet
//   node pipeline/run.mjs check <run dir>    validate scenario.json / prompts.json / result.json
//
// PIPELINE_AGENT_CMD overrides the harness command: a JSON array where "{prompt}" is replaced, e.g.
//   PIPELINE_AGENT_CMD='["hermes","chat","-q","{prompt}"]'
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { load } from "./schema.mjs";
import { KOKORO_DIR, PIPELINE, PYTHON, VENV, ensureDir, has, needPython, runPaths, sh } from "./tools/common.mjs";
import { mix } from "./tools/mix.mjs";
import { review } from "./tools/review.mjs";
import { writeManifest } from "./tools/write-manifest.mjs";

const REPO = resolve(PIPELINE, "..");
const STAGES = [
  { key: "scenario", doc: "1-scenario.md", role: "video-scenarist", writes: ["scenario.json"] },
  { key: "prompt", doc: "2-prompt.md", role: "video-prompter", writes: ["prompts.json"] },
  { key: "generate", doc: "3-generate.md", role: "video-generator", writes: [] },
  { key: "result", doc: "4-result.md", role: "video-reviewer", writes: ["result.json"] },
];

// Headless mode of each harness. Checked against each CLI's documented flags; only claude has run here.
const HARNESS = {
  claude: ["claude", "-p", "{prompt}", "--permission-mode", "acceptEdits", "--allowedTools", "Bash", "Read", "Write", "Edit", "Glob", "Grep"],
  codex: ["codex", "exec", "--full-auto", "{prompt}"],
  gemini: ["gemini", "--yolo", "-p", "{prompt}"],
  hermes: ["hermes", "chat", "-q", "{prompt}"],
};

const args = process.argv.slice(2);
const cmd = args.shift();
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
};

async function ask(q) {
  if (!process.stdin.isTTY) throw new Error(`${q}\n(no terminal to answer on: re-run interactively)`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question(`${q} [y/N] `)).trim().toLowerCase();
  rl.close();
  return a === "y" || a === "yes";
}

function remotionBin() {
  const bin = join(PIPELINE, "node_modules", "@remotion", "cli", "remotion-cli.js");
  if (!existsSync(bin)) throw new Error("Remotion is not installed: run  node pipeline/run.mjs setup");
  return bin;
}

// ---------- setup ----------
function setup() {
  for (const t of ["ffmpeg", "ffprobe", "curl"]) if (!has(t)) throw new Error(`${t} is not installed (needed by the pipeline)`);
  console.log("== npm install (pipeline)");
  sh(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--no-audit", "--no-fund"], { cwd: PIPELINE, shell: process.platform === "win32" });
  if (!existsSync(PYTHON)) {
    console.log(`== python venv at ${VENV}`);
    const py = ["python3", "python"].find((p) => has(p));
    if (!py) throw new Error("Python 3 is not installed (needed for the voice and music tools)");
    sh(py, ["-m", "venv", VENV]);
  }
  sh(PYTHON, ["-m", "pip", "install", "-q", "kokoro-onnx", "soundfile", "numpy"]);
  ensureDir(KOKORO_DIR);
  const base = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0";
  for (const f of ["kokoro-v1.0.int8.onnx", "voices-v1.0.bin"]) {
    if (existsSync(join(KOKORO_DIR, f))) continue;
    console.log(`== downloading ${f}`);
    sh("curl", ["-sSfL", "-o", join(KOKORO_DIR, f), `${base}/${f}`]);
  }
  console.log("setup done");
}

// ---------- build (deterministic, no agent) ----------
function build(run) {
  const p = runPaths(run);
  const scenario = load(p.dir, "scenario.json");
  load(p.dir, "prompts.json");
  if (scenario.engine !== "remotion") throw new Error("build is for the remotion engine; the flow engine is generated through flow-mcp tools");
  const py = needPython();
  console.log("== voice");
  sh(py, [join(PIPELINE, "tools", "tts.py"), p.dir]);
  console.log("== music and effects");
  sh(py, [join(PIPELINE, "tools", "synth.py"), p.dir]);
  console.log("== mix");
  const m = mix(p.dir);
  if (m.problems.length) throw new Error(`voice timing:\n  ${m.problems.join("\n  ")}\nFix the at_s values or shorten the lines in prompts.json.`);
  console.log("== manifest");
  const man = writeManifest(p.dir);
  if (man.missing.length) throw new Error(`write these scene components first:\n  ${man.missing.join("\n  ")}`);
  console.log("== typecheck");
  sh(process.execPath, [join(PIPELINE, "node_modules", "typescript", "bin", "tsc"), "--noEmit", "-p", p.video], { capture: true });
  console.log("== render");
  ensureDir(p.out);
  const out = join(p.out, `${scenario.slug}.mp4`);
  const browser = process.env.REMOTION_BROWSER_EXECUTABLE ? ["--browser-executable", process.env.REMOTION_BROWSER_EXECUTABLE] : [];
  sh(process.execPath, [remotionBin(), "render", "src/index.ts", "Video", out, "--log=error", "--public-dir", join(p.video, "public"), ...browser], { cwd: p.video });
  console.log(`rendered ${out}`);
  return out;
}

// ---------- stills: one frame per scene, straight from the Remotion project ----------
function stills(run) {
  const p = runPaths(run);
  const man = writeManifest(p.dir);
  if (man.missing.length) throw new Error(`write these scene components first:\n  ${man.missing.join("\n  ")}`);
  ensureDir(p.review);
  const browser = process.env.REMOTION_BROWSER_EXECUTABLE ? ["--browser-executable", process.env.REMOTION_BROWSER_EXECUTABLE] : [];
  for (const r of man.rows) {
    const out = join(p.review, `${r.id}.png`);
    sh(process.execPath, [remotionBin(), "still", "src/index.ts", r.id, out, `--frame=${Math.floor(r.sequenceFrames / 2)}`, "--log=error", "--public-dir", join(p.video, "public"), ...browser], { cwd: p.video });
    console.log(out);
  }
}

// ---------- make (agents) ----------
function stagePrompt(stage, ctx) {
  const doc = relative(REPO, join(PIPELINE, "stages", stage.doc));
  return [
    `You are the ${stage.role} in a four-stage video pipeline (scenario -> prompt -> generate -> result).`,
    `Do ONLY your stage. Read and follow ${doc} exactly; read pipeline/README.md for the file formats.`,
    `Repository root: ${REPO}`,
    `Brief: ${ctx.brief}`,
    `Run folder: ${ctx.run}`,
    ctx.extra || "",
    `When you finish, reply with a short summary of what you wrote.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function agentCommand(agent, prompt) {
  let tpl = HARNESS[agent];
  if (process.env.PIPELINE_AGENT_CMD) tpl = JSON.parse(process.env.PIPELINE_AGENT_CMD);
  if (!tpl) throw new Error(`unknown --agent ${agent}; use ${Object.keys(HARNESS).join(", ")} or set PIPELINE_AGENT_CMD`);
  return tpl.map((x) => (x === "{prompt}" ? prompt : x));
}

async function make(briefArg) {
  if (!briefArg || !existsSync(briefArg)) throw new Error("usage: node pipeline/run.mjs make <brief.md> [--agent claude] [--slug x] [--from stage] [--yes] [--dry-run]");
  const agent = opt("agent", "claude");
  const slug = opt("slug", basename(briefArg).replace(/\.md$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  const from = opt("from", "scenario");
  const yes = flag("yes");
  const dry = flag("dry-run");
  const start = STAGES.findIndex((s) => s.key === from);
  if (start < 0) throw new Error(`--from must be one of ${STAGES.map((s) => s.key).join(", ")}`);
  const run = ensureDir(join(PIPELINE, "runs", slug));
  const brief = join(run, "brief.md");
  if (resolve(briefArg) !== brief) copyFileSync(briefArg, brief);
  console.log(`run folder: ${relative(REPO, run)}   harness: ${agent}`);

  for (const stage of STAGES.slice(start)) {
    let extra = "";
    if (stage.key === "generate" && !(dry && !existsSync(join(run, "prompts.json")))) {
      const prompts = load(run, "prompts.json");
      if (prompts.engine === "flow") {
        const credits = prompts.flow.estimated_credits;
        console.log(`\nThe flow engine will spend about ${credits} Google Flow credits (stills are free).`);
        if (!dry && !(await ask(`Spend up to ${credits} credits?`))) return console.log("stopped before spending credits");
        extra = `The user approved spending up to ${credits} credits. Never exceed it; if a clip needs more, stop and say so.`;
      }
    }
    if (stage.key === "result") extra = "This is review round 1.";
    const argv = agentCommand(agent, stagePrompt(stage, { brief: relative(REPO, brief), run: relative(REPO, run), extra }));
    console.log(`\n== ${stage.key} (${stage.role})`);
    if (dry) {
      console.log(JSON.stringify(argv));
      continue;
    }
    const r = spawnSync(argv[0], argv.slice(1), { cwd: REPO, stdio: "inherit", shell: process.platform === "win32" });
    if (r.error || r.status !== 0) throw new Error(`${stage.key} stage failed (${r.error?.message || `exit ${r.status}`})`);
    for (const f of stage.writes) load(run, f); // throws with the schema problems
    if (stage.key === "scenario") {
      const md = join(run, "scenario.md");
      if (existsSync(md)) console.log(`\n${readFileSync(md, "utf8")}`);
      if (!yes && !(await ask("Approve this scenario and continue?"))) return console.log(`stopped. Edit ${relative(REPO, join(run, "scenario.json"))} and re-run with --from prompt`);
    }
    if (stage.key === "result") {
      const res = load(run, "result.json");
      console.log(`\nresult: ${res.passed ? "PASSED" : "FAILED"}  ${res.output}`);
      if (!res.passed) {
        // one repair round: the generator gets the reviewer's fixes, then the reviewer looks again
        console.log("== generate (repair round)");
        const fix = agentCommand(agent, stagePrompt(STAGES[2], { brief: relative(REPO, brief), run: relative(REPO, run), extra: `REPAIR ROUND. Apply exactly these fixes from result.json, nothing else:\n- ${res.fixes.join("\n- ")}` }));
        if (spawnSync(fix[0], fix.slice(1), { cwd: REPO, stdio: "inherit", shell: process.platform === "win32" }).status !== 0) throw new Error("repair round failed");
        const again = agentCommand(agent, stagePrompt(STAGES[3], { brief: relative(REPO, brief), run: relative(REPO, run), extra: "This is review round 2 (final)." }));
        if (spawnSync(again[0], again.slice(1), { cwd: REPO, stdio: "inherit", shell: process.platform === "win32" }).status !== 0) throw new Error("second review failed");
        const res2 = load(run, "result.json");
        console.log(`\nresult after repair: ${res2.passed ? "PASSED" : "FAILED"}  ${res2.output}`);
      }
    }
  }
}

try {
  if (cmd === "setup") setup();
  else if (cmd === "build") build(args[0]);
  else if (cmd === "stills") stills(args[0]);
  else if (cmd === "review") {
    const r = review(args[0], args[1]);
    for (const c of r.checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}: ${c.detail}`);
    process.exitCode = r.checks.every((c) => c.ok) ? 0 : 1;
  } else if (cmd === "check") {
    let bad = 0;
    for (const f of ["scenario.json", "prompts.json", "result.json"]) {
      if (!existsSync(join(args[0], f))) continue;
      try {
        load(args[0], f);
        console.log(`ok   ${f}`);
      } catch (e) {
        bad++;
        console.log(`FAIL ${e.message}`);
      }
    }
    process.exitCode = bad ? 1 : 0;
  } else if (cmd === "make") await make(args.shift());
  else {
    console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 19).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exitCode = cmd ? 1 : 0;
  }
} catch (e) {
  console.error(`\n${e.message}`);
  process.exitCode = 1;
}
