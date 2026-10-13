// The three hand-off files between pipeline stages, as zod schemas.
// Plain JavaScript on purpose: run.mjs imports it without a build, from any harness.
//   node pipeline/schema.mjs <run dir>   validates whatever of the three files exists there.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "colour must be #RRGGBB");
const seconds = z.number().positive();
// Speaking pace measured on the Kokoro voices at speed 1.08 (2.8-3.1 words/s). A scene's narration may lean up
// to NARRATION_SLACK_S into its neighbours (a line often starts just before its scene); mix.mjs then checks the
// real recorded timing, which is the hard limit.
export const WORDS_PER_SECOND = 3.0;
export const NARRATION_SLACK_S = 1.5;
export const TRANSITION_FRAMES = 12;

const scene = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "scene id: lowercase letters, digits and dashes"),
  duration_s: seconds,
  goal: z.string().min(1).describe("What the viewer should take away from this scene."),
  visual: z.string().min(1).describe("What is on screen and how it moves."),
  on_screen_text: z.array(z.string()).default([]),
  narration: z.string().default(""),
  sound: z.array(z.string()).default([]).describe("Sound cues in words, e.g. 'radar ping as the beam passes'."),
  transition_in: z.enum(["none", "fade", "slide-left", "slide-up", "wipe-left", "wipe-right"]).default("fade"),
});

export const scenarioSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    engine: z.enum(["remotion", "flow"]),
    aspect: z.enum(["16:9", "9:16"]),
    fps: z.literal(30).default(30),
    duration_s: seconds,
    language: z.string().default("en"),
    voice: z.object({
      engine: z.enum(["kokoro", "gemini", "mac", "none"]),
      voice: z.string().default(""),
    }),
    style: z.object({
      background: hex,
      ink: hex,
      accent: hex,
      warn: hex.optional(),
      danger: hex.optional(),
      font_display: z.string().default("Space Grotesk"),
      font_mono: z.string().default("JetBrains Mono"),
      notes: z.string().default(""),
    }),
    guardrails: z.array(z.string()).default([]),
    scenes: z.array(scene).min(1).max(20),
  })
  .superRefine((s, ctx) => {
    const total = s.scenes.reduce((a, x) => a + x.duration_s, 0);
    if (Math.abs(total - s.duration_s) > 0.05)
      ctx.addIssue({ code: "custom", message: `scene durations add up to ${total.toFixed(2)} s, not ${s.duration_s} s` });
    const ids = new Set();
    s.scenes.forEach((x, i) => {
      if (ids.has(x.id)) ctx.addIssue({ code: "custom", path: ["scenes", i, "id"], message: `duplicate id ${x.id}` });
      ids.add(x.id);
      const words = x.narration.split(/\s+/).filter(Boolean).length;
      if (words / WORDS_PER_SECOND > x.duration_s + NARRATION_SLACK_S)
        ctx.addIssue({
          code: "custom",
          path: ["scenes", i, "narration"],
          message: `${words} words need ~${(words / WORDS_PER_SECOND).toFixed(1)} s but the scene lasts ${x.duration_s} s`,
        });
    });
  });

const sfxCue = z.object({
  at_s: z.number().min(0),
  kind: z.enum(["whoosh", "ping", "pop", "buzz", "chime", "click", "thunk", "shimmer", "riser"]),
  gain: z.number().min(0).max(1).optional(),
  pitch: z.number().int().min(24).max(108).optional().describe("MIDI note for tonal cues (ping, pop, chime)."),
  length_s: z.number().positive().optional(),
});

const remotionPart = z.object({
  scenes: z
    .array(
      z.object({
        id: z.string(),
        component: z.string().regex(/^[A-Z][A-Za-z0-9]*$/, "component: PascalCase"),
        spec: z.string().min(20).describe("Layout, elements, timings in seconds from scene start, text sizes."),
      }),
    )
    .min(1),
  voiceover: z
    .array(z.object({ at_s: z.number().min(0), text: z.string().min(1), speed: z.number().min(0.7).max(1.4).default(1.08) }))
    .default([]),
  voice: z.string().default("am_michael"),
  music: z
    .object({
      bpm: z.number().min(60).max(180).default(120),
      chords: z.array(z.array(z.number().int())).min(1).describe("MIDI chords, one per bar of 4 beats."),
      bass: z.array(z.number().int()).min(1),
      drums_from_s: z.number().min(0).default(4),
      end_s: z.number().positive().describe("Drums stop and one chord holds from here (the end card)."),
      gain: z.number().min(0).max(1).default(0.5),
    })
    .nullable()
    .default(null),
  sfx: z.array(sfxCue).default([]),
});

const flowScene = z.record(z.string(), z.unknown()); // passed verbatim to flow_generate; flow-mcp validates it
const flowPart = z.object({
  project: z.string().min(1),
  stills: z.array(flowScene).min(1),
  clips: z.array(flowScene).min(1),
  estimated_credits: z.number().int().min(0),
  narration: z.record(z.string(), z.unknown()).nullable().default(null),
  assemble: z.record(z.string(), z.unknown()),
});

export const promptsSchema = z
  .object({ slug: z.string(), engine: z.enum(["remotion", "flow"]), remotion: remotionPart.optional(), flow: flowPart.optional() })
  .superRefine((p, ctx) => {
    if (!p[p.engine]) ctx.addIssue({ code: "custom", message: `engine is ${p.engine} but the "${p.engine}" section is missing` });
  });

export const resultSchema = z.object({
  slug: z.string(),
  engine: z.enum(["remotion", "flow"]),
  output: z.string(),
  passed: z.boolean(),
  rounds: z.number().int().min(1),
  checks: z.array(z.object({ name: z.string(), ok: z.boolean(), detail: z.string() })),
  fixes: z.array(z.string()).default([]).describe("What the generator must change when passed is false."),
  credits_spent: z.number().int().min(0).default(0),
});

export const FILES = { "scenario.json": scenarioSchema, "prompts.json": promptsSchema, "result.json": resultSchema };

/** Parse one hand-off file; throws an Error listing every problem in plain words. */
export function load(runDir, file) {
  const path = join(runDir, file);
  if (!existsSync(path)) throw new Error(`${file} is missing in ${runDir}`);
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${file} is not valid JSON: ${e.message}`);
  }
  const r = FILES[file].safeParse(data);
  if (!r.success) {
    const lines = r.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`${file} does not match the schema:\n${lines.join("\n")}`);
  }
  return r.data;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: node pipeline/schema.mjs <run dir>");
    process.exit(2);
  }
  let bad = 0, seen = 0;
  for (const f of Object.keys(FILES)) {
    if (!existsSync(join(dir, f))) continue;
    seen++;
    try {
      load(dir, f);
      console.log(`ok   ${f}`);
    } catch (e) {
      bad++;
      console.log(`FAIL ${e.message}`);
    }
  }
  if (!seen) console.log(`no hand-off files in ${dir}`);
  process.exit(bad ? 1 : 0);
}
