import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { BRAND } from "./brand";

// Fonts are bundled in public/fonts by write-manifest, so renders work offline.
export const display = BRAND.fontDisplay;
export const mono = BRAND.fontMono;
loadFont({ family: display, url: staticFile(`fonts/${BRAND.fontDisplayFile}`), weight: "100 900" });
loadFont({ family: mono, url: staticFile(`fonts/${BRAND.fontMonoFile}`), weight: "100 900" });

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

// Every colour a scene may use. Scenes never hard-code brand colours, so a new brief only changes brand.ts.
export const C = {
  bg: BRAND.background,
  ink: BRAND.ink,
  accent: BRAND.accent,
  accentSoft: mix(BRAND.accent, BRAND.background, 0.72),
  warn: BRAND.warn,
  warnSoft: mix(BRAND.warn, BRAND.background, 0.8),
  danger: BRAND.danger,
  dangerSoft: mix(BRAND.danger, BRAND.background, 0.8),
  grey: mix(BRAND.ink, BRAND.background, 0.45),
  line: mix(BRAND.ink, BRAND.background, 0.86),
  muted: mix(BRAND.ink, BRAND.background, 0.35),
  white: "#FFFFFF",
};

export const { width: W, height: H } = (BRAND.aspect as string) === "9:16" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
