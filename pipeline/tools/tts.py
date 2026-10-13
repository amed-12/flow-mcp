"""Voice lines for a run with Kokoro TTS (open model, runs offline once set up).

    python pipeline/tools/tts.py <run dir>

Reads prompts.json -> remotion.voiceover and remotion.voice, writes <run>/audio/vo-NN.wav and
<run>/audio/vo.json ([{at_s, end_s, file}]). Model files live in KOKORO_DIR (default ~/.flow-mcp/kokoro);
`node pipeline/run.mjs setup` downloads them.
"""
import json, os, sys
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

run = Path(sys.argv[1])
prompts = json.loads((run / "prompts.json").read_text())["remotion"]
scenario = json.loads((run / "scenario.json").read_text())
lines = prompts.get("voiceover", [])
out = run / "audio"
out.mkdir(parents=True, exist_ok=True)
if not lines or scenario["voice"]["engine"] == "none":
    (out / "vo.json").write_text("[]")
    print("no voiceover lines")
    sys.exit(0)

models = Path(os.environ.get("KOKORO_DIR", Path.home() / ".flow-mcp" / "kokoro"))
k = Kokoro(str(models / "kokoro-v1.0.int8.onnx"), str(models / "voices-v1.0.bin"))
voice = prompts.get("voice") or scenario["voice"].get("voice") or "am_michael"
lang = "en-gb" if voice.startswith("b") else "en-us"
placed = []
for i, line in enumerate(lines, 1):
    samples, sr = k.create(line["text"], voice=voice, speed=line.get("speed", 1.08), lang=lang)
    name = f"vo-{i:02d}.wav"
    sf.write(out / name, samples, sr)
    dur = len(samples) / sr
    placed.append({"at_s": line["at_s"], "end_s": round(line["at_s"] + dur, 3), "file": name, "text": line["text"]})
    print(f"{name}: {line['at_s']:.2f}-{line['at_s'] + dur:.2f} s  {line['text']}")
(out / "vo.json").write_text(json.dumps(placed, indent=2))
