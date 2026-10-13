# Video pipeline: scenario → prompt → generate → result

Turns a markdown brief into a finished promo video with four separate agents, each with one job:

| Stage | Agent | Reads | Writes |
| --- | --- | --- | --- |
| 1. Scenario | video-scenarist | `brief.md` | `scenario.json`, `scenario.md` (the story: scenes, timing, text, narration) |
| 2. Prompt | video-prompter | `scenario.json` | `prompts.json` (exact build instructions for the chosen engine) |
| 3. Generate | video-generator | `prompts.json` | `out/<slug>.mp4` |
| 4. Result | video-reviewer | the MP4 + scenario | `result.json`, `result.md` (pass/fail per check, fixes) |

The pipeline stops twice for you: after the scenario (approve the story) and, for the `flow` engine, before any
credits are spent. A failed review gets one repair round automatically.

Two engines, chosen in the brief:
- **remotion**: motion graphics drawn in code (React). Free, renders offline, text is always sharp. Voice from
  Kokoro (open TTS model, English), original synthesized music and sound effects.
- **flow**: Google Flow AI video through this repo's MCP server (flow-mcp). Cinematic, but spends credits and
  needs a signed-in Flow session.

## Quick start

```bash
node pipeline/run.mjs setup                               # once: Remotion, Python venv, Kokoro voice model
cp pipeline/brief-template.md my-brief.md                 # fill it in
node pipeline/run.mjs make my-brief.md                    # runs the four agents (default harness: claude)
```

Results land in `pipeline/runs/<slug>/` (git-ignored). `out/<slug>.mp4` is the video; `result.md` says whether it
passed and why.

Needs Node 22+, Python 3.10+, ffmpeg/ffprobe and curl. Remotion downloads its own headless browser on first render;
where it cannot, point `REMOTION_BROWSER_EXECUTABLE` at a Chrome/Chromium.

## Any harness, not only Claude

The stages are plain documents (`pipeline/stages/*.md`), the hand-offs are JSON files checked by
`pipeline/schema.mjs`, and the tools are ordinary scripts. Any coding agent that can read files and run commands
can do a stage. `run.mjs` starts each stage as a separate headless run of the harness you pick:

| `--agent` | Command per stage | Status |
| --- | --- | --- |
| `claude` (default) | `claude -p <prompt> --permission-mode acceptEdits --allowedTools Bash Read Write Edit Glob Grep` | verified end to end |
| `codex` | `codex exec --full-auto <prompt>` | command only (dry run) |
| `gemini` | `gemini --yolo -p <prompt>` | command only (dry run) |
| `hermes` | `hermes chat -q <prompt>` | command only (dry run) |

Anything else: `PIPELINE_AGENT_CMD='["mytool","--flag","{prompt}"]' node pipeline/run.mjs make brief.md`.
The `flow` engine also needs flow-mcp connected to that harness (`npm run connect` writes it into Claude, Codex,
Antigravity, Gemini CLI and Hermes settings).

Inside an interactive session you can also drive it by hand:
- **Claude Code:** `/make-video my-brief.md` (agents in `.claude/agents/video-*.md`).
- **Codex / Antigravity / Gemini CLI / Hermes:** ask "run the video pipeline on my-brief.md"; `AGENTS.md`,
  `GEMINI.md` and `pipeline/harness/hermes-skill.md` point them here.

## No agent at all

Stages 3-4 for remotion are deterministic once the scene components exist:

```bash
node pipeline/run.mjs build pipeline/runs/<slug>    # voice, music, effects, mix, typecheck, render
node pipeline/run.mjs review pipeline/runs/<slug>   # measured checks + contact sheet
node pipeline/run.mjs check pipeline/runs/<slug>    # validate the JSON hand-offs
```

`pipeline/examples/0xcharon` is a complete run (brief, scenario, prompts, scene components). Rebuilding it
reproduces the 0xcharon promo:

```bash
cp -r pipeline/examples/0xcharon pipeline/runs/0xcharon && node pipeline/run.mjs build pipeline/runs/0xcharon
```

`pipeline/examples/brewlog` was made entirely by the agents (`run.mjs make --agent claude`) from its `brief.md`:
a 15 s vertical video for a fictional coffee app. The reviewer failed round 1 (a badge ran off the frame), the
generator fixed it, and round 2 passed. Its `result.md` is the reviewer's own report.

## Files

```
pipeline/
  run.mjs                 orchestrator (setup, make, build, review, check)
  schema.mjs              zod schemas for scenario.json, prompts.json, result.json
  stages/1..4-*.md        what each agent does (the source of truth for every harness)
  brief-template.md       brief format
  tools/tts.py            Kokoro voice lines            tools/synth.py   music bed + sound effects
  tools/mix.mjs           placement, -16 LUFS, ducking  tools/review.mjs measured checks + contact sheet
  tools/write-manifest.mjs  template copy, brand.ts, scene list, fonts
  remotion-template/      Video.tsx (scenes + transitions + audio), theme.ts, ui.tsx (Stage, Card, Pill, Bar, Dot)
  examples/0xcharon/      a finished run
  harness/                instructions for harnesses without a project file of their own
  runs/                   your runs (git-ignored)
```

## Limits worth knowing

- Kokoro speaks English. For other languages use `voice: gemini` or `mac` (flow-mcp's `flow_narrate`) and put the
  take at `runs/<slug>/audio/voiceover.wav`.
- The reviewer cannot hear. Loudness, peaks and timing are measured; whether the voice sounds right is yours to judge.
- The `flow` engine has not run through this pipeline yet (the build machine cannot reach flow.google.com). Its
  steps call the same flow-mcp tools the rest of this repo verifies; try it first with a still-only brief.
- Remotion is free for individuals and companies of up to 3 people; larger teams need a Remotion company license.
