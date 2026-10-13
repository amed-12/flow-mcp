# Voice lines for the promo, Kokoro TTS (kokoro-onnx, voice am_michael).
# pip install kokoro-onnx soundfile; model files from
# https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
# Each line is placed in the mix at the time noted (seconds), then the track is loudnorm'd to -16 LUFS.
import sys, soundfile as sf
from kokoro_onnx import Kokoro

models, out = sys.argv[1], sys.argv[2]
k = Kokoro(f"{models}/kokoro-v1.0.int8.onnx", f"{models}/voices-v1.0.bin")
LINES = [
    (0.4, "Meet Zero X Charon. The Charon Trenches Agent.", 1.08),
    (4.3, "It scans new Solana tokens around the clock, and scores every one.", 1.08),
    (9.9, "Then it tells you exactly why it entered, or passed.", 1.08),
    (14.3, "Track P.N.L., win rate and open trades, on one console.", 1.08),
    (19.2, "Pause new entries in one tap, or hit Panic Close.", 1.08),
    (22.4, "Start in paper mode, without risking a single SOL.", 1.18),
    (25.6, "Zero X Charon: autonomous degen trading, executed with precision.", 1.3),
]
for i, (at, text, speed) in enumerate(LINES, 1):
    s, sr = k.create(text, voice="am_michael", speed=speed, lang="en-us")
    sf.write(f"{out}/vo-{i:02d}.wav", s, sr)
    print(f"vo-{i:02d}.wav at {at}s, {len(s) / sr:.2f}s")
