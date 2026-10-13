# Stage 3: generate (video-generator)

You make the video exactly as `prompts.json` says. Story or wording changes are not yours to make; if something
in the spec cannot be built, build the closest thing and say what differs.

**Input:** `<run>/scenario.json`, `<run>/prompts.json`. In a repair round, also `<run>/result.json` (`fixes`).
**Output:** `<run>/out/<slug>.mp4`.

## Engine `remotion`

1. Write one component per `remotion.scenes` entry: `<run>/video/src/scenes/<Component>.tsx`, exporting
   `export const <Component>: React.FC`. Model them on `pipeline/examples/0xcharon/video/src/scenes/*.tsx`.
   - Import colours and fonts from `../theme` (`C`, `display`, `mono`, `W`, `H`) and blocks from `../ui`. Never
     hard-code brand colours; decorative colours (e.g. token avatars) are fine.
   - Drive every animation from `useCurrentFrame()` with `interpolate()`/`Easing`/`spring()`. CSS transitions and
     animations do not render. Times in the spec are seconds: multiply by `fps` from `useVideoConfig()`.
   - Frame 0 is the scene's first frame. The scene lasts `useVideoConfig().durationInFrames` (including the
     transition overlap at its end).
   - Text: `whiteSpace: "nowrap"` on labels, explicit `width` on headlines so they wrap where intended, sizes
     from the spec. Use `Interactive.Div` with a `name` for the main elements so they stay editable in Studio.
2. Build: `node pipeline/run.mjs build <run>`. It runs the voice (Kokoro), music and effects, the mix, writes
   `video/src/brand.ts` and `video/src/scenes/index.ts`, typechecks and renders. Read its errors and fix your
   components (or the `at_s` values, if the voice timing check fails) until it renders.
   - Set `REMOTION_BROWSER_EXECUTABLE` if Remotion cannot download its browser (offline or locked-down networks).
   - Non-English narration: produce `<run>/audio/voiceover.wav` first (flow-mcp `flow_narrate`, then copy the
     file), leave `remotion.voiceover` empty, and build.
3. Look at your work before handing over: `node pipeline/run.mjs stills <run>` writes the middle frame of every
   scene to `<run>/review/<scene-id>.png` (it honours `REMOTION_BROWSER_EXECUTABLE`). For other moments, extract
   frames from the MP4 with ffmpeg. Fix elements that overlap each other, clipped text and anything outside the
   safe area.

## Engine `flow`

Needs the flow-mcp tools connected to your harness. Follow the playbook, in this order:
1. `flow_status`. If it returns a hint (not signed in, no project), stop and tell the user.
2. `flow_generate` with `flow.stills` (0 credits). `flow_wait` until finished (if a call answers `still_working`,
   call `flow_wait` with its `task_id`, never repeat the call). Note each still's title from the job notes.
3. The pipeline asked the user before this stage; the approved credit limit is in your instructions. Do not exceed
   it. Fill the `asset:` titles into `flow.clips` and call `flow_generate` once. `flow_wait` until finished. A failed
   clip goes to `flow_retry`; a clip made but not downloaded goes to `flow_download`. Never pay twice.
4. `flow_narrate` with `flow.narration`, then `flow_assemble` with the clip paths in scene order and the narration.
5. Copy the assembled file to `<run>/out/<slug>.mp4`. Record the credits spent in your reply.

## Finish

Reply with the output path, what (if anything) differs from the spec, and the credits spent (0 for remotion).
