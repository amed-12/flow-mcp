import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";

// Everything that differs between macOS, Windows and Linux lives here, so the rest of the code stays the same on all
// three. macOS is the tested platform; the Windows and Linux branches are written to each system's own documented
// tools but have not been run on a real machine yet.
export const IS_MAC = process.platform === "darwin";
export const IS_WIN = process.platform === "win32";

// How the panel names this computer and its bin, so nothing says "Mac" on a PC.
export const COMPUTER = IS_MAC ? "this Mac" : IS_WIN ? "this PC" : "this computer";
export const BIN = IS_MAC ? "the Mac's Trash" : IS_WIN ? "the Recycle Bin" : "the Trash";

export const FFMPEG_HINT = IS_MAC ? "brew install ffmpeg" : IS_WIN ? "winget install Gyan.FFmpeg" : "sudo apt install ffmpeg";
export const CHROME_HINT = IS_MAC
  ? "brew install --cask google-chrome"
  : IS_WIN
    ? "winget install Google.Chrome"
    : "install the .deb from google.com/chrome, then sudo apt install ./google-chrome-stable_current_amd64.deb";

// PowerShell single-quoted string: the only character that needs escaping is the quote itself.
export const psQuote = (s: string) => `'${s.replace(/'/g, "''")}'`;

export function powershell(script: string, timeout = 120_000): string {
  return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    timeout,
    windowsHide: true,
  });
}

// Moves a file, also across drives. Downloads land under ~/.flow-mcp on C:, and with FLOW_MCP_OUTPUT on another drive
// (D:\flow-mcp-out) a plain rename fails with EXDEV and loses a clip that was already paid for. Copy, then remove.
export function moveFile(from: string, to: string): void {
  try {
    renameSync(from, to);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EXDEV") throw err;
    copyFileSync(from, to);
    unlinkSync(from);
  }
}

// Puts a file or folder in the system's own bin so it can be restored: the Mac's Trash, Windows' Recycle Bin, or the
// freedesktop Trash on Linux. Never deletes anything outright.
export function moveToBin(target: string): string {
  if (IS_MAC) {
    const bin = join(homedir(), ".Trash");
    const name = basename(target);
    const ext = extname(name);
    const dest = existsSync(join(bin, name)) ? join(bin, `${name.slice(0, name.length - ext.length)}-${Date.now()}${ext}`) : join(bin, name);
    renameSync(target, dest);
    return dest;
  }
  if (IS_WIN) {
    const kind = statSync(target).isDirectory() ? "DeleteDirectory" : "DeleteFile";
    powershell(
      `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::${kind}(${psQuote(target)}, 'OnlyErrorDialogs', 'SendToRecycleBin')`,
    );
    return BIN;
  }
  try {
    execFileSync("gio", ["trash", target], { stdio: "ignore" });
    return BIN;
  } catch {
    const bin = join(homedir(), ".local", "share", "Trash", "files");
    mkdirSync(bin, { recursive: true });
    const dest = join(bin, `${basename(target)}-${Date.now()}`);
    renameSync(target, dest);
    return dest;
  }
}

// Ways to unpack a ZIP, tried in order. tar on macOS and Windows 10+ is bsdtar, which reads ZIPs; GNU tar on Linux does
// not, and unzip is not on every Ubuntu, but python3 is, and its zipfile module unpacks from the command line.
type Unzipper = [string, (zip: string, dest: string) => string[]];
const UNZIPPERS: Record<string, Unzipper> = {
  tar: ["tar", (zip, dest) => ["-xf", zip, "-C", dest]],
  bsdtar: ["bsdtar", (zip, dest) => ["-xf", zip, "-C", dest]],
  unzip: ["unzip", (zip, dest) => ["-o", "-q", zip, "-d", dest]],
  python3: ["python3", (zip, dest) => ["-m", "zipfile", "-e", zip, dest]],
};
export const UNZIP_ORDER = IS_MAC || IS_WIN ? ["tar", "unzip"] : ["unzip", "bsdtar", "python3"];

// Unpacks a ZIP with the system's own tools. Returns every file inside, however deeply the archive nested them.
export function extractZip(zip: string, dest: string, order = UNZIP_ORDER): string[] {
  mkdirSync(dest, { recursive: true });
  const unpacked = order.some((name) => {
    const [bin, args] = UNZIPPERS[name];
    try {
      execFileSync(bin, args(zip, dest), { stdio: "ignore", windowsHide: true });
      return true;
    } catch {
      return false;
    }
  });
  if (!unpacked) throw new Error(`Could not unpack ${basename(zip)}: none of ${order.join(", ")} worked.${IS_MAC || IS_WIN ? "" : " Install one: sudo apt install unzip"}`);
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      if (f.startsWith(".") || f === "__MACOSX") continue;
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(dest);
  return files;
}

// Chrome's own download folder. On Linux it follows the desktop's language (~/Unduhan, ~/Téléchargements), which
// xdg-user-dir reports; everywhere else, and when that tool is missing, it is ~/Downloads.
export function systemDownloadsDir(): string {
  if (!IS_MAC && !IS_WIN) {
    try {
      const dir = execFileSync("xdg-user-dir", ["DOWNLOAD"], { encoding: "utf8", timeout: 3000 }).trim();
      if (dir && dir !== homedir()) return dir;
    } catch {
      // Not a freedesktop system, or the tool is not installed.
    }
  }
  return join(homedir(), "Downloads");
}

// Opens a page in the default browser.
export function openUrl(url: string): void {
  try {
    if (IS_MAC) execFileSync("open", [url], { stdio: "ignore" });
    else if (IS_WIN) execFileSync("cmd", ["/c", "start", "", url], { stdio: "ignore", windowsHide: true });
    else execFileSync("xdg-open", [url], { stdio: "ignore" });
  } catch {
    // Opening the browser is a convenience; the address is printed either way.
  }
}
