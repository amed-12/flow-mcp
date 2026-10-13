# flow-mcp: notes for coding agents

Codex, Antigravity, Gemini CLI and other agents: read [CLAUDE.md](CLAUDE.md) before changing anything. Despite the
name, it is the project's single set of rules and notes for every agent: how Flow's page is laid out, why each
workaround exists, what has been verified on which system, and how to test without touching a running session.

The essentials:
- Build with `npm run build` (TypeScript to `dist/`). There is no unit test suite; `scripts/e2e.mjs` drives the MCP
  server end to end against the real Flow tab.
- Every difference between macOS, Windows and Linux lives in `src/platform.ts`.
- Generating video spends the user's real Google AI credits. Test with stills (Nano Banana, 0 credits), and move test
  items to Flow's Trash afterwards.
- To test new code beside a running copy, use a scratch `FLOW_MCP_HOME` and another `FLOW_MCP_PORT`; reusing the real
  home overwrites the token the running copy depends on.
- Record what you learn about Flow in CLAUDE.md, dated, in the style of the notes already there.
