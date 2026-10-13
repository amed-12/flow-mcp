// Places the voice lines, normalises the voice to -16 LUFS, ducks the music under it and writes the three tracks
// the Remotion video plays: <run>/video/public/audio/{voiceover,music,sfx}.mp3. Also writes <run>/audio/mix.json.
//   node pipeline/tools/mix.mjs <run dir>
// A prebuilt narration (flow_narrate, Gemini, a recording) can replace the TTS lines: put it at
// <run>/audio/voiceover.wav and leave remotion.voiceover empty; it starts at 0 s.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "../schema.mjs";
import { ensureDir, runPaths, sh } from "./common.mjs";

const ff = (args) => sh("ffmpeg", ["-hide_banner", "-v", "error", "-y", ...args], { capture: true });

export function mix(run) {
  const p = runPaths(run);
  const scenario = load(p.dir, "scenario.json");
  const prompts = load(p.dir, "prompts.json").remotion;
  const dur = scenario.duration_s;
  ensureDir(p.publicAudio);
  const problems = [];
  const lines = existsSync(join(p.audio, "vo.json")) ? JSON.parse(readFileSync(join(p.audio, "vo.json"), "utf8")) : [];

  // Voice: never two lines at once, and the last one ends before the video does.
  lines.forEach((l, i) => {
    const next = lines[i + 1];
    if (next && l.end_s > next.at_s + 0.05) problems.push(`${l.file} ends at ${l.end_s.toFixed(2)} s but ${next.file} starts at ${next.at_s} s`);
  });
  const last = lines.at(-1);
  if (last && last.end_s > dur - 0.15) problems.push(`the last voice line ends at ${last.end_s.toFixed(2)} s, too close to the end (${dur} s)`);

  const vo = join(p.audio, "voiceover-mix.wav");
  let haveVo = false;
  if (lines.length) {
    const inputs = lines.flatMap((l) => ["-i", join(p.audio, l.file)]);
    const delays = lines.map((l, i) => `[${i}:a]aresample=48000,adelay=${Math.round(l.at_s * 1000)}:all=1[v${i}]`).join(";");
    const labels = lines.map((_, i) => `[v${i}]`).join("");
    ff([...inputs, "-filter_complex", `${delays};${labels}amix=inputs=${lines.length}:normalize=0,apad,atrim=0:${dur},pan=stereo|c0=c0|c1=c0,loudnorm=I=-16:TP=-1.5:LRA=11[vo]`, "-map", "[vo]", "-ar", "48000", vo]);
    haveVo = true;
  } else if (existsSync(join(p.audio, "voiceover.wav"))) {
    ff(["-i", join(p.audio, "voiceover.wav"), "-af", `aresample=48000,apad,atrim=0:${dur},aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11`, vo]);
    haveVo = true;
  }

  const mp3 = (src, name, filter) => {
    const dest = join(p.publicAudio, `${name}.mp3`);
    if (!src) return rmSync(dest, { force: true });
    ff([...src, ...(filter ? ["-filter_complex", filter, "-map", "[o]"] : []), "-c:a", "libmp3lame", "-b:a", "192k", dest]);
  };
  mp3(haveVo ? ["-i", vo] : null, "voiceover");
  const music = join(p.audio, "music.wav");
  const gain = prompts.music?.gain ?? 0.5;
  if (prompts.music && existsSync(music)) {
    mp3(
      haveVo ? ["-i", music, "-i", vo] : ["-i", music],
      "music",
      haveVo ? `[0:a]volume=${gain}[m];[m][1:a]sidechaincompress=threshold=0.02:ratio=5:attack=20:release=400[o]` : `[0:a]volume=${gain}[o]`,
    );
  } else mp3(null, "music");
  const sfx = join(p.audio, "sfx.wav");
  mp3(prompts.sfx.length && existsSync(sfx) ? ["-i", sfx] : null, "sfx", "[0:a]volume=0.7[o]");

  const summary = { voice_lines: lines.length, voice_end_s: last?.end_s ?? null, prebuilt_voice: !lines.length && haveVo, problems };
  writeFileSync(join(p.audio, "mix.json"), JSON.stringify(summary, null, 2));
  return summary;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = mix(process.argv[2]);
  console.log(JSON.stringify(s, null, 2));
  if (s.problems.length) process.exit(1);
}
