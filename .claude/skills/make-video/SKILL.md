---
name: make-video
description: Make a promo video from a markdown brief with the four-stage pipeline (scenario, prompt, generate, result). Use when the user asks to make, produce or automate a video from a brief, or types /make-video <brief.md>.
---

# make-video

Runs `pipeline/` stage by stage, each stage in its own subagent, with the user approving the story and any spend.

1. Brief: the argument, or ask for one (template: `pipeline/brief-template.md`). Slug: the brief's file name,
   lowercase, dashes. Create `pipeline/runs/<slug>/` and copy the brief there as `brief.md`.
   If `pipeline/node_modules` or `~/.flow-mcp/pipeline-venv` is missing, run `node pipeline/run.mjs setup` first.
2. **Scenario**: spawn `video-scenarist` with the brief and run paths. Show the user `scenario.md`.
   **Stop and ask** whether to continue or what to change. Changes go back to `video-scenarist`.
3. **Prompt**: spawn `video-prompter`. For the `flow` engine, show `flow.estimated_credits` and **ask** for a yes
   before stage 3 (CLAUDE.md: anything that spends credits needs the user's OK). Remotion costs nothing: continue.
4. **Generate**: spawn `video-generator` (pass the approved credit limit for flow).
5. **Result**: spawn `video-reviewer` ("review round 1"). If `result.json.passed` is false, spawn
   `video-generator` with "REPAIR ROUND" and the `fixes`, then `video-reviewer` ("review round 2"). At most one repair.
6. Send the user the MP4 and the contact sheet, with the verdict, the voice timing and the credits spent.
   Say plainly what was not checked (nobody listened to the audio).

The same run can be done without this skill: `node pipeline/run.mjs make <brief.md>` (any harness).
