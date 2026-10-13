---
name: flow-video-pipeline
description: Make a promo video from a markdown brief with the flow-mcp four-stage pipeline (scenario, prompt, generate, result).
---

# flow-video-pipeline (Hermes)

Copy this file into your Hermes skills folder. The pipeline lives in the flow-mcp repository; `cd` there first.

- Whole run, each stage as a separate Hermes run:  `node pipeline/run.mjs make <brief.md> --agent hermes`
  (if your Hermes CLI takes a prompt differently, set `PIPELINE_AGENT_CMD='["hermes", ..., "{prompt}"]'`).
- One stage by hand: read `pipeline/stages/<n>-*.md` and follow it for the run folder `pipeline/runs/<slug>`;
  validate with `node pipeline/schema.mjs pipeline/runs/<slug>`.
- Stop for the user's approval after the scenario and before any Flow credits are spent.
