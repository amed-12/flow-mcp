import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fonts ship in public/fonts (variable woff2 files, SIL OFL) so renders work offline.
export const grotesk = "Space Grotesk";
export const mono = "JetBrains Mono";
loadFont({ family: grotesk, url: staticFile("fonts/SpaceGrotesk-latin.woff2"), weight: "300 700" });
loadFont({ family: mono, url: staticFile("fonts/JetBrainsMono-latin.woff2"), weight: "100 800" });

// Colours taken from the live operator console.
export const C = {
  paper: "#F4F3EE",
  ink: "#0B0B0B",
  lime: "#B8F400",
  limeSoft: "#EEFBC4",
  amber: "#F5A524",
  coral: "#F0525C",
  grey: "#9A9A92",
  line: "#DAD8CF",
  white: "#FFFFFF",
};
