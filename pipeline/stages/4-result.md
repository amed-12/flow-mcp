# Stage 4: result (video-reviewer)

You decide whether the video is ready to send. You check, you do not fix: anything wrong goes into `fixes` for
the generator, phrased so it can act on it without asking.

**Input:** `<run>/out/<slug>.mp4`, `<run>/scenario.json`, `<run>/prompts.json`, `<run>/brief.md`.
**Output:** `<run>/result.json` (schema `resultSchema` in `pipeline/schema.mjs`) and `<run>/result.md`.

## Steps

1. `node pipeline/run.mjs review <run>`: duration, resolution, audio, loudness (-16 ±1.5 LUFS), true peak
   (below -0.3 dBFS), voice timing, and a contact sheet `<run>/review/contact.png` (two frames per scene, at 40 %
   and 85 % of it).
   Copy each measured check into `checks`.
2. Look at the contact sheet (and extract more frames with ffmpeg when a scene has several moments). For every
   scene add a check:
   - every `on_screen_text` item is present and spelled exactly (brand names character for character);
   - no element overlaps another unless the spec says it should (cards, mugs, icons, text over shapes), nothing is
     cut off, key text is inside the safe area, nothing is unreadably small;
   - the frame matches the scene's `visual` and the brief's style.
3. Guardrails: walk the scenario's `guardrails` one by one and add a check each (e.g. no invented numbers on
   screen or in the narration, disclaimer present on the end card).
4. `passed` is true only when every check is ok. When false, `fixes` lists concrete changes ("Scanner: the
   headline wraps into the pill; set width 1640 and move the pill to top 320"), most important first.
5. `output`: the MP4 path. `rounds`: the round number from your instructions. `credits_spent`: from the
   generator's reply (0 for remotion).
6. `result.md`: verdict in one line, a table of checks, and the contact sheet path.

`node pipeline/schema.mjs <run>` must print `ok result.json`.

You cannot listen to audio. Say so in `result.md`: loudness and timing are measured, the sound itself is not judged.
