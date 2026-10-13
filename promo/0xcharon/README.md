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
To add the Gemini/macOS narration from `flow_narrate`, drop the file in `public/` and add
`<Audio src={staticFile("narration.m4a")} />` from `@remotion/media` inside `Promo`.
