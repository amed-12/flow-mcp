// Measurable checks on a finished video, for the result stage. Writes <run>/review/auto.json and
// <run>/review/contact.png (one frame from the middle of every scene, in order).
//   node pipeline/tools/review.mjs <run dir> [video.mp4]
// The reviewer agent adds its own judgement (spelling, overlaps, guardrails) on top of these numbers.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "../schema.mjs";
import { ensureDir, runPaths, sh } from "./common.mjs";

export function review(run, video) {
  const p = runPaths(run);
  const scenario = load(p.dir, "scenario.json");
  const file = video || join(p.out, `${scenario.slug}.mp4`);
  if (!existsSync(file)) throw new Error(`no video at ${file}`);
  ensureDir(p.review);
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  const probe = JSON.parse(sh("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height", "-of", "json", file], { capture: true }));
  const v = probe.streams.find((s) => s.codec_type === "video");
  const a = probe.streams.find((s) => s.codec_type === "audio");
  const duration = Number(probe.format.duration);
  const [w, h] = scenario.aspect === "9:16" ? [1080, 1920] : [1920, 1080];
  add("duration", Math.abs(duration - scenario.duration_s) <= 0.1, `${duration.toFixed(2)} s (target ${scenario.duration_s} s)`);
  add("resolution", v?.width === w && v?.height === h, `${v?.width}x${v?.height} ${v?.codec_name} (target ${w}x${h})`);
  const wantsAudio = scenario.voice.engine !== "none";
  add("audio track", !!a || !wantsAudio, a ? a.codec_name : "none");

  let lufs = null, peak = null;
  if (a) {
    // ebur128 prints its summary on stderr, so read it from a separate run that captures stderr.
    const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
    const sum = r.stderr.split("Summary:").pop();
    lufs = Number(sum.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
    peak = Number(sum.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
    add("loudness", lufs >= -17.5 && lufs <= -14.5, `${lufs} LUFS (target -16 ±1.5)`);
    add("true peak", peak <= -0.3, `${peak} dBFS (must stay below -0.3)`);
  }
  const mixFile = join(p.audio, "mix.json");
  if (existsSync(mixFile)) {
    const m = JSON.parse(readFileSync(mixFile, "utf8"));
    add("voice timing", m.problems.length === 0, m.problems.length ? m.problems.join("; ") : `last line ends at ${m.voice_end_s ?? "-"} s`);
  }

  // Contact sheet: two frames per scene (40 % in, and 85 % in, after most entrances have landed), in order.
  let t = 0;
  const times = scenario.scenes.flatMap((s) => {
    const pair = [t + s.duration_s * 0.4, t + s.duration_s * 0.85];
    t += s.duration_s;
    return pair;
  });
  const cols = scenario.aspect === "9:16" ? 6 : 4;
  const rows = Math.ceil(times.length / cols);
  const select = times.map((s) => `lt(prev_pts*TB\\,${s.toFixed(2)})*gte(pts*TB\\,${s.toFixed(2)})`).join("+");
  const contact = join(p.review, "contact.png");
  sh("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-i", file, "-vf", `select='${select}',scale=${scenario.aspect === "9:16" ? 360 : 640}:-1,tile=${cols}x${rows}`, "-frames:v", "1", "-fps_mode", "vfr", contact], { capture: true });
  add("contact sheet", existsSync(contact), `${times.length} frames, two per scene, at ${times.map((x) => x.toFixed(1)).join(", ")} s`);

  const result = { file, duration, lufs, peak, checks, contact, scene_times_s: times };
  writeFileSync(join(p.review, "auto.json"), JSON.stringify(result, null, 2));
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = review(process.argv[2], process.argv[3]);
  for (const c of r.checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}: ${c.detail}`);
  console.log(`contact sheet: ${r.contact}`);
  process.exit(r.checks.every((c) => c.ok) ? 0 : 1);
}
