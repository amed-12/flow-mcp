# Stage 2: prompt (video-prompter)

You turn the approved scenario into exact instructions for the engine that will make it. You do not render
anything and you do not change the story; if the scenario cannot work, say so instead of quietly changing it.

**Input:** `<run>/scenario.json` (approved), `<run>/brief.md`.
**Output:** `<run>/prompts.json` (schema `promptsSchema` in `pipeline/schema.mjs`) with the section for
`scenario.engine`.

## Engine `remotion` (code-drawn motion graphics, free)

`remotion.scenes`: one entry per scenario scene, same `id`, a PascalCase `component` name and a `spec` the
generator can build without guessing:
- Canvas 1920x1080 (16:9) or 1080x1920 (9:16). Safe area: key text at least 80 px from the sides, 100 px from
  top/bottom (scale for 9:16). Headline at least 84 px, important supporting text at least 44 px.
- Every element: what it is, position and size in px, colour by role (`bg`, `ink`, `accent`, `accentSoft`,
  `warn`, `danger`, `grey`, `line`, `muted`; never raw hex), and the text it shows.
- Animation as times in seconds from the scene's start: when each element enters, how (fade/slide/spring/draw),
  and what moves continuously. Leave the last 0.4 s of a scene for the outgoing transition.
- Building blocks available in `pipeline/remotion-template/src/ui.tsx`: `Stage`, `Card`, `Pill`, `Bar`, `Dot`.

`remotion.voiceover`: the scenario's narration as lines with `at_s` (seconds from the video start). Start a line
0.3-0.5 s after its scene begins (or up to 1 s before, if it is long); lines must not overlap and the last one must
end at least 0.3 s before the end. Estimate each line's length at ~3 words/s; `speed` 1.0-1.2 (default 1.08).
`remotion.voice`: a Kokoro voice id (`am_michael`, `am_adam`, `bm_george`, `af_heart`, `bf_emma`, ...) matching
`scenario.voice.voice` when set. Kokoro speaks English only; for another language use `voice.engine: "gemini"` or
`"mac"` and tell the generator to produce `<run>/audio/voiceover.wav` with flow-mcp's `flow_narrate`.

`remotion.music`: an original bed for `synth.py`: `bpm` (90-128), `chords` (MIDI triads, one per bar),
`bass` (one MIDI note per bar), `drums_from_s` (after the hook), `end_s` (= end card start: drums stop and one
chord holds), `gain` (0.4-0.6). `null` for no music.

`remotion.sfx`: cues with `at_s` from the video start, timed to the spec's events: `whoosh` 0.1 s before each
transition, `ping`/`pop`/`chime` (optional MIDI `pitch`) for things appearing or succeeding, `buzz` for
rejections, `click` for toggles, `thunk` for a big press, `shimmer` (with `length_s`) under something drawing
itself, `riser` ending on a cue. Fewer, well-timed cues beat many.

## Engine `flow` (Google Flow via flow-mcp, spends credits)

Follow the flow-mcp playbook (`src/playbook.ts`) and the Flow notes in CLAUDE.md:
- `flow.stills`: one Nano Banana 2 still per scene (`type: image`, `max_credits: 0`, `aspect_ratio`), the style lock
  sentence appended to every prompt, `reference_previous: true` from the second still on. Generated video smears
  text, so stills for scenes other than the end card show abstract bars/dots/icons, never words or numbers.
- `flow.clips`: one video per scene, `first_frame: "asset:<project>-scene-NN"` (the title flow_generate gives the
  still), model `Omni 1.1 Flash`, 720p, 4-10 s matching the scenario, a prompt with one clear motion, one camera
  move, the style and a sound line. End card: same frame as first and last frame, everything still.
- `flow.estimated_credits`: sum per clip from the rates in CLAUDE.md (Omni 1.1 Flash 720p: 7/10/12/15 credits for
  4/6/8/10 s). Each clip's `max_credits` is its own rate, never more.
- `flow.narration`: `flow_narrate` arguments (engine `gemini` or `mac`, a short style note of a few words).
- `flow.assemble`: `flow_assemble` arguments with `clips` left as `["<V1>", ...]` placeholders for the generator.

## Finish

`node pipeline/schema.mjs <run>` must print `ok prompts.json`. Then reply with the scene list, the voice timing and,
for `flow`, the credit estimate.
