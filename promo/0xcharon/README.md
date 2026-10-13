# 0xcharon promo (Remotion)

30 s, 1920x1080, 30 fps motion-graphics promo for 0xcharon, "The Charon Trenches Agent". Built from
the flow-mcp brief, but drawn in code instead of generated, so it costs no Flow credits and every label is sharp.

Scenes (`src/scenes`): Intro → Scanner → Gate (why a token entered or passed) → Console → Controls
(pause entries, Panic Close, paper mode) → End card. `src/Promo.tsx` joins them with 12-frame transitions.
No performance numbers appear anywhere: the chart and stat bars are shapes, not data.

```bash
npm i
npx remotion studio            # preview
npx remotion render Promo out/0xcharon-promo.mp4
```

Fonts (Space Grotesk, JetBrains Mono, SIL OFL) are bundled in `public/fonts`, so renders work offline.
## Audio

`public/audio` holds three tracks that `Promo.tsx` plays together:

- `voiceover.mp3`: seven English lines from Kokoro TTS (`audio-src/voiceover.py`, voice am_michael), placed
  with ffmpeg `adelay` and normalised to -16 LUFS.
- `music.mp3`: an original 120 bpm bed (Am-F-C-G) synthesized by `audio-src/synth.py`, ducked under the voice
  with ffmpeg `sidechaincompress`.
- `sfx.mp3`: whooshes, radar pings, buzz/chime at the gate, clicks, the Panic Close thunk, the end chime, all timed
  to the animation (also `audio-src/synth.py`).

Nothing is sampled or licensed from anyone else. The final mix measures -16.7 LUFS, peak -0.5 dBFS.
To use a `flow_narrate` take instead, replace `voiceover.mp3` (and re-duck `music.mp3` against it).
