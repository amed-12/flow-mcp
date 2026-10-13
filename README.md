# flow-mcp

Drive **Google Flow** (flow.google.com) from Claude, Codex or any other MCP app, or from a local control
panel, using Flow's own credits (free with any Google account: 50 a day), not the pay-per-use video API.

It is a small program that runs on your own machine. It opens its own Chrome window, signs in
as you, and clicks Flow's real buttons. There is no browser extension, no hosted service and no
account to create.

```
Claude / Codex ──stdio──> flow-mcp ──Chrome DevTools Protocol──> Chrome (its own profile) ──> Flow
```

**MCP** = Model Context Protocol, the standard that lets Claude use outside tools.
New here? [GETTING-STARTED.md](GETTING-STARTED.md) takes you from nothing to your first video, step by step, and
[OVERVIEW.md](OVERVIEW.md) explains what it does in plain English, with no code names.

---

## What you need

| | |
|---|---|
| **macOS, Windows 10/11 or Ubuntu Desktop** | Developed and tested on macOS; run end to end on Windows 11 (2026-10-13). Ubuntu is supported in the code (Chrome, espeak-ng voices, the Trash, ZIPs, the panel launcher) but has not been run on a real machine yet, so please report anything that breaks. A server with no desktop runs Chrome [headless](#headless-no-window-for-agents-on-a-server) |
| **Node.js 22 or newer** | `node --version`. Ubuntu's own package is older: install 22 from NodeSource or with nvm |
| **Google Chrome** | Any recent version. On Ubuntu, Google's `.deb`, not the Chromium snap (snaps cannot use the hidden `~/.flow-mcp` folder) |
| **A Google account** | Free. Flow gives every account 50 credits a day; a paid Google AI plan adds more and unlocks 1080p downloads. Developed on a Pro plan |
| **FFmpeg** *(optional)* | Mac: `brew install ffmpeg` · Windows: `winget install Gyan.FFmpeg` · Ubuntu: `sudo apt install ffmpeg`. Needed only to join clips, mix music or record narration |
| **A Google AI Studio key** *(optional, free)* | Only for the Google narration voices. See below |

The machine must stay awake while it works: a real Chrome is being driven. By default you can watch it in its own
window; for an agent on a server (Hermes, Claude Code over SSH) it can run with no window at all, see
[Headless](#headless-no-window-for-agents-on-a-server).

---

## Install

```bash
git clone https://github.com/GTAI-1/flow-mcp.git
cd flow-mcp
npm install
npm run build
```

> **Mac: do not put this folder in `~/Desktop`, `~/Documents` or `~/Downloads`.** macOS protects those
> folders, and apps that launch the server from there can be refused permission to read its own
> files (`EPERM: operation not permitted`). `~/flow-mcp` or anywhere in your home folder is fine.
>
> **Windows: keep it out of folders OneDrive syncs** (often Desktop and Documents), where files can be held
> online-only. `C:\Users\<you>\flow-mcp` is fine.
>
> **Ubuntu:** first `sudo apt install git ffmpeg unzip espeak-ng`, Node.js 22 from NodeSource or nvm, and Google
> Chrome from google.com/chrome (the `.deb`). `~/flow-mcp` is fine.

Then sign in, once:

```bash
npm run login
```

That opens the dedicated Chrome window. Sign into Google by hand, open (or create) a Flow project,
and leave the window open. The program never types your password; it only uses the session you
created. That Chrome profile lives in `~/.flow-mcp/chrome-profile` and is separate from your
everyday browser.

---

## Connect it to Claude, Codex, Antigravity or any MCP app

The quick way, from the `flow-mcp` folder:

```bash
npm run connect
```

It finds the AI apps installed on this computer and, after you say yes, writes a `flow` entry into each one's own
MCP settings. Or name them: `npm run connect -- codex antigravity` (or `all`). Add `--dry-run` to see what would
be written without writing it, and `npm run connect -- print` prints the entry for any app it does not know.

| App | Name | Where it writes |
|---|---|---|
| Codex | `codex` | `~/.codex/config.toml`, only the `[mcp_servers.flow]` tables |
| Antigravity | `antigravity` | `~/.gemini/config/mcp_config.json` (the global file, per Antigravity's own docs) |
| Gemini CLI | `gemini-cli` | `~/.gemini/settings.json` |
| Cursor | `cursor` | `~/.cursor/mcp.json` |
| Claude Code | `claude-code` | runs `claude mcp add --scope user flow ...` |
| Claude Desktop | `claude-desktop` | `claude_desktop_config.json` (Mac and Windows; there is no Linux app) |
| Hermes | `hermes` | `~/.hermes/config.yaml` (or `$HERMES_HOME`), only `mcp_servers.flow` |
| VS Code | `vscode` | prints the `code --add-mcp` command |

Every entry uses absolute paths (this Node and this folder), because apps started from the desktop often cannot
find `node` on their PATH. Other servers in those files are left alone, the file is copied to
`<file>.bak-flowmcp` before its first change, and any `FLOW_MCP_OUTPUT`, `FLOW_MCP_HOME`, `FLOW_MCP_HEADLESS`,
`FLOW_MCP_PROJECT`, `FLOW_MCP_CHROME` or `FLOW_MCP_CHROME_ARGS` set in your shell is written into the entry too.
`--headless` adds `FLOW_MCP_HEADLESS=1`: `npm run connect -- --headless hermes claude-code`.

**By hand**, for any other MCP app (Cursor, VS Code, Windsurf and the rest take the same thing): the command
is `node` and the one argument is the absolute path to `dist/index.js`. In JSON settings:

```json
{ "mcpServers": { "flow": { "command": "node", "args": ["/absolute/path/to/flow-mcp/dist/index.js"] } } }
```

On Windows, write the path with doubled backslashes, like `"C:\\Users\\you\\flow-mcp\\dist\\index.js"`. Codex
takes TOML in `~/.codex/config.toml`:

```toml
[mcp_servers.flow]
command = "node"
args = ["/absolute/path/to/flow-mcp/dist/index.js"]
startup_timeout_sec = 60
```

Timeouts need no other setting. Most MCP apps give up on a tool call after 60 seconds, so any call that runs
longer than about 45 seconds (creating a character, a 1080p download) answers with a task id instead and keeps
working, and `flow_wait` collects the result. The server answers an app's start-up handshake at once, and its
tool descriptions use only the JSON Schema that Gemini's function calling accepts (Antigravity, Gemini CLI).
It also sends the app a short set of instructions (check the session first, say what credits will be spent,
keep calling `flow_wait`), so any model knows the workflow before its first call.

ChatGPT in the browser or the ChatGPT app can't use it: its connectors only reach servers on the internet, and
this tool has to run on your own computer to drive your Chrome window.

Developed and tested with Claude. Codex and Antigravity were connected with `npm run connect` on Windows
(2026-10-13); please report how working with them goes. Running several apps at once is safe: the first one
started drives Flow, and the others pass their requests to it.

Restart the app, then ask it: *"check my Flow session"*. You should get your plan and credit balance
back. Everything after that is plain English; you never type tool names.

---

## Headless: no window, for agents on a server

Set `FLOW_MCP_HEADLESS=1` and Chrome runs with no window (Chrome's own headless mode, `--headless=new`). That is what
an agent on a server needs (Hermes, or Claude Code over SSH), and it also keeps a desktop free of the Flow window.
Nothing about the browser is disguised: it says it is headless Chrome, and it drives Flow at the same human pace.

> Not run against live Flow yet (built 2026-10-13 in a sandbox that cannot reach flow.google.com; everything around
> Flow was tested there). Try a free still first (*"draw one test image"*) and please report how it goes.

**1. Connect the agent with headless on**

```bash
npm run connect -- --headless hermes        # Hermes: writes mcp_servers.flow in ~/.hermes/config.yaml
npm run connect -- --headless claude-code   # Claude Code CLI: claude mcp add --scope user -e FLOW_MCP_HEADLESS=1 ...
```

In Hermes, type `/reload-mcp` (or start a new chat). By hand, the Hermes entry is:

```yaml
mcp_servers:
  flow:
    command: "/usr/bin/node"                       # the full path of node 22+
    args: ["/home/you/flow-mcp/dist/index.js"]
    env:
      FLOW_MCP_HEADLESS: "1"
    connect_timeout: 60
```

The `env` part matters for Hermes: it starts MCP servers with only a few safe variables (PATH, HOME, ...), so
anything flow-mcp needs has to be listed there. `npm run connect` does that for you.

**2. Sign in, once.** Signing in is always done by a person, in a window. Pick whichever fits:

| Where flow-mcp runs | How to sign in |
|---|---|
| A computer with a screen | `npm run login -- --close`: a window opens, you sign in and open a project, it closes again |
| A server you reach over SSH | `ssh -X you@server`, then `cd flow-mcp && npm run login -- --close`. The window shows on your own screen (needs `xauth` on the server, and an X server on your computer: built into Linux desktops, XQuartz on a Mac) |
| A server, without display forwarding | Sign in on a computer with a screen and carry the session over (below) |

Carrying the session over: on the computer where you signed in (`npm run login`), in the flow-mcp folder,

```bash
npm run session -- export                       # writes flow-session.json: only Google's cookies, readable by you alone
scp flow-session.json you@server:~/
```

then on the server, in the flow-mcp folder:

```bash
npm run session -- import ~/flow-session.json   # loads them into flow-mcp's own Chrome profile and checks Flow
rm ~/flow-session.json                          # and delete the copy on the other computer too
```

That file *is* your Google sign-in while it exists: never paste it into a chat or hand it to an AI agent (it is
deliberately not an MCP tool). Google may tie a session to the computer it was made on; if the import reports that
Flow still shows the signed-out page, sign in on the server itself with `ssh -X`.

**3. The project.** With no window nobody can click a project open, so flow-mcp remembers the last project it saw
(also from `login` and `session export`) and starts there. To switch, give the agent a project link
(*"open https://flow.google.com/project/..."*): it calls `flow_open_project`. `FLOW_MCP_PROJECT=<link>` pins one.

**Why not "Sign in with Google" (OAuth)?** Flow has no OAuth API. It is a website, and it only accepts Google's own
browser sign-in cookies; an OAuth token from an app cannot be turned into those. Google's sign-in page is meant for
a person at a browser (it can refuse a headless one), and this program never types your password. So a person signs
in once, in a real window, and the session is kept (or carried over).

**Good to know**

- Chrome refuses to run as **root**. Run flow-mcp as a normal user; or, on a machine that only ever opens Flow,
  `FLOW_MCP_CHROME_ARGS=--no-sandbox` (that turns Chrome's own sandbox off, which is your call).
- Something only you may answer (Flow's one-time *Rights to use this image* agreement) stops the job with a
  message: run `npm run login`, answer it in the window, close it.
- `flow_status` shows `"browser": "headless"` or `"window"`. `npm run login` reopens a headless Chrome in a window
  (it asks first, or pass `--yes`) and checks first that this machine can show one.
- Chrome's own messages go to `~/.flow-mcp/chrome.log`, and a Chrome that fails to start quotes them.
- Prefer the regular window on a server? Give it a virtual screen: `xvfb-run -a npm run studio` keeps a windowed
  Chrome and the panel running, and agents started afterwards pass their requests to it.

---

## Your first film

Nothing below costs a credit until step 4, and the assistant asks before spending.

1. **Check the session.** *"Check my Flow session."* This confirms sign-in, plan and credits.
2. **Make a character.** *"Create a character called Pip, a small lamplighter in a flat cartoon style."*
   Flow draws the portrait. Free.
3. **Draw the key frames.** *"Draw three stills with Pip: a dark rooftop, him lighting a lamp, the
   whole hillside glowing. Match each one to the last."* Free: stills cost nothing, so get the look
   right here before spending.
4. **Shoot it.** *"Turn those into three 10-second shots, each starting where the last one ended,
   720p, no more than 15 credits each."* This spends credits. The price is read from Flow's own
   quote first and the scene is skipped if it is over your cap.
5. **Narrate it.** *"Record this line with a warm documentary voice."* Free, any length.
6. **Cut it.** *"Join the three shots under the narration, don't freeze the last frame."*
   The finished file lands in `~/flow-mcp-out/<project>/`.

---

## The control panel

The same features, without an AI assistant in the loop:

```bash
npm run studio     # then open http://127.0.0.1:8787
```

or double-click **Flow Studio.command** (Mac) or **Flow Studio.cmd** (Windows). On Ubuntu, run
`./"Flow Studio.sh"` in a terminal, or right-click it in Files → **Run as a Program**.

Seven tabs, in the order you would use them:

- **Cast**: reusable characters. Create them, edit them in place, or build one from a picture.
- **Frames**: free stills, with *match previous frame* to keep a set on-model.
- **Shots**: paid clips, with first/last frames, chaining, a live credit estimate, and a card that
  continues a finished clip from its own last frame.
- **Voice**: free narration in Google's voices or your computer's own. Your saved narrations are listed
  here to play or delete, and there's a field for your Google AI Studio key (checked with Google, stored
  only on your computer; never paste it into a chat).
- **Restyle**: change a clip you already have.
- **Cut**: join any videos into one film, in the order you pick. Upload one, or choose from films you've
  already made. Add a narration (from your saved ones or an upload) and music, and turn the clips' own
  sound down so the narration sits on top.
- **Library**: everything in your Flow project. Download it again for free (a scene comes down as one
  finished film, not loose clips), or move it to Flow's Trash.

A progress monitor and a gallery of your saved work sit alongside. The gallery shows stills or clips
on the tabs that use them. On a wide screen, each side scrolls on its own. Two kinds of delete, clearly
labelled: **Move to the Mac's Trash / Recycle Bin** removes a file from your computer; **Move to
Flow's Trash** removes it from your Flow project only. Both can be undone.

The panel ships with the repo but is not started for you: run `npm run studio` when you want it.
Opening `studio/index.html` as a plain file does nothing; the page needs the server behind it, and
says so in red if you try.

Claude's own process serves the same panel while it runs. Whichever process starts first owns the
Chrome tab and the job queue; the other talks to it over a local API, so Claude and the panel always
agree on what is running. That API listens on 127.0.0.1 only and needs a per-run token
(`~/.flow-mcp/token`).

---

## Tools

| Tool | Purpose |
|---|---|
| `flow_status` | Session state (signed in, project open, plan, credits left, window or headless), queue, pacing, prompt playbook |
| `flow_open_project` | Open a project by its link (or id), and remember it for the next start. Needed in headless mode, where nobody can click one open |
| `flow_generate` | Queue scenes: prompt, image or video, model, aspect, duration, resolution, variants, first/last frame, reference images, `max_credits` cap |
| `flow_wait` | Wait for jobs, or for the task id of a slow call; returns file paths and results. Answers within about 40 s, so call again until `finished` is true |
| `flow_cancel` | Cancel a job that has not started |
| `flow_retry` | Re-queue failed jobs with the same settings and file names (a failed tile is first retried inside Flow with its own free Retry button: `retries`, default 1) |
| `flow_assets` | List images and videos already in the Flow project (usable as `asset:<title>`) |
| `flow_download` | Download existing project media without regenerating. Free, including the 1080p / 2K upscale. A scene comes down as one stitched film |
| `flow_trash` | Move an image, video or scene in the Flow project to Flow's Trash, where it can be restored. Exact title only; refuses if two items share it; never deletes permanently |
| `flow_agent_images` | Fast image batch: hands up to 50 scenes to Flow's own Agent mode, rendered in parallel (20 images in ~204 s), 0 credits. Each image is matched back to its scene by its stored prompt, so file numbers are right in any finish order. Scenes the agent drops are re-asked of it (up to 2 rounds), then re-run one by one |
| `flow_edit` | Video-to-video edit of a clip already in the project (relight, weather, remove objects). Flow shows no quote first; about 20 credits for a 4 s clip |
| `flow_continue` | Start a clip from the last frame of an existing one **with a character or your avatar still attached**. The composer allows a start frame or attached characters, never both, so this drives Flow's agent mode, which does both. No quote beforehand |
| `flow_character` | Create a reusable character from a description (Flow draws the portrait) or an image, with a personality and a stock voice; use it as `asset:<name>` |
| `flow_character_edit` | Restyle an existing character in place (free) and save the new portrait; name, personality and voice are kept, so every scene referencing it updates. Pass `look` with the updated description; with only a name it re-saves the current portrait |
| `flow_characters` | List the project's characters |
| `flow_techniques` | 39 film-technique prompt presets (camera moves, product shots, transitions, image commands); pass an id as a scene's `technique` |
| `flow_narrate` | Free narration audio, any length: `gemini` (Google AI Studio text-to-speech, with the same voices Flow has, plus a `style` note) or `mac` (a voice installed on this computer, no key needed) |
| `flow_voices` | Narrator voices available, and whether a Google key is set up |
| `flow_assemble` | Join clips into one MP4 (a project's clips, or any you list, in order) with optional music and voiceover, and separate volume for the clips' own sound (local FFmpeg, no credits) |

**Continuity between shots:** `chain_previous` (this clip starts on the last frame of the previous
one), `first_frame` + `last_frame` (animate between two stills you chose), `reference_images` (keep a
character or product consistent). Flow's *composer* takes either frames or references, never both, so
when you need a start frame **and** a character locked together, use `flow_continue`, which goes through
Flow's agent mode and does both.

Output lands in `~/flow-mcp-out/<project>/scene-NN.ext`.

### Narration with Google's voices (optional)

`flow_narrate` with `engine: "mac"` uses your computer's own voices and works out of the box: macOS voices on a
Mac, the built-in speech voices on Windows. For Google's voices (the same ones Flow offers), get a free key from
[Google AI Studio](https://aistudio.google.com/apikey) and paste it into **Flow Studio → Voice → Google AI Studio
key → Save key**. It's checked with Google before it's saved, and stored only on your computer. Or set
`GEMINI_API_KEY`. Either way, never paste the key into a chat; it would end up in the conversation history.

---

## Behaviour and settings

- One generation at a time, with a random 25–70 second pause between them. The page carries an
  invisible reCAPTCHA; this drives the real interface at human pace and does nothing to evade it.
- Before each generation the server reads Flow's own credit quote and skips the scene if it exceeds
  `max_credits` (default 25).
- Environment variables: `GEMINI_API_KEY`, `FLOW_MCP_PORT` (8787), `FLOW_MCP_OUTPUT`,
  `FLOW_MCP_HOME`, `FLOW_MCP_CDP_PORT` (9333), `FLOW_MCP_CHROME`, `FLOW_MCP_PAUSE_MIN_S`,
  `FLOW_MCP_PAUSE_MAX_S`, `FLOW_MCP_HEADLESS` (`1` = no window), `FLOW_MCP_PROJECT` (project link to start on),
  `FLOW_MCP_CHROME_ARGS` (extra Chrome flags, space-separated).

## If something goes wrong

| Symptom | Cause |
|---|---|
| Mac: the server will not start, `EPERM: operation not permitted` | The folder is in a macOS-protected location. Move it out of `~/Desktop`, `~/Documents` or `~/Downloads` and update the path in your Claude config |
| *"Not signed in"* or *"no project open"* | Run `npm run login`, sign in, open a Flow project, leave the window open. Headless: see [Headless](#headless-no-window-for-agents-on-a-server); for a project, give the assistant its link |
| *"There is no screen here for a Chrome window"* | A server, or an app that hides the display from its tools: connect with `npm run connect -- --headless <app>` |
| *"Chrome refuses to run as root"* | Run it as a normal user, or set `FLOW_MCP_CHROME_ARGS=--no-sandbox` (see Headless) |
| A clip generated but no file arrived | The media is still in Flow. `flow_download` pulls it back for nothing. Never re-generate and pay twice |
| Everything times out | The Chrome window was closed, or the machine slept. Reopen it with `npm run login` |

---

## Licence and risk

This automates Flow's web interface. It can break whenever Google changes that interface, and
automated use may be against Google's terms of service. Use it on your own account, at your own
risk.
