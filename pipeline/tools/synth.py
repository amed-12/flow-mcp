"""Original music bed and sound effects for a run, synthesized from scratch (nothing sampled or licensed).

    python pipeline/tools/synth.py <run dir>

Reads prompts.json -> remotion.music / remotion.sfx and scenario.duration_s, writes <run>/audio/music.wav and
<run>/audio/sfx.wav (48 kHz stereo). Grown out of the 0xcharon promo's audio-src/synth.py.
"""
import json, sys
from pathlib import Path

import numpy as np
import soundfile as sf

run = Path(sys.argv[1])
prompts = json.loads((run / "prompts.json").read_text())["remotion"]
scenario = json.loads((run / "scenario.json").read_text())
SR = 48000
DUR = float(scenario["duration_s"])
N = int(SR * DUR)
rng = np.random.default_rng(7)


def env(n, a, r):
    e = np.ones(n)
    a, r = int(a * SR), int(r * SR)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def lowpass(x, cutoff):
    # One-pole filter, vectorised with a cumulative trick would lose precision; a loop is fine at these lengths.
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    prev = 0.0
    for i, v in enumerate(x):
        prev = (1 - a) * v + a * prev
        y[i] = prev
    return y


def place(buf, sig, at, gain=1.0):
    i = int(at * SR)
    j = min(N, i + len(sig))
    if 0 <= i < N:
        buf[i:j] += sig[: j - i] * gain


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def saw(freq, dur):
    t = np.arange(int(dur * SR)) / SR
    return 2 * ((t * freq) % 1) - 1


def tone(freq, dur, decay, harm=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + harm * np.sin(2 * np.pi * freq * 2 * t)
    return s * np.exp(-t * decay) * env(n, 0.003, 0.02)


# ---------- music ----------
music = np.zeros(N)
m = prompts.get("music")
if m:
    beat = 60.0 / m["bpm"]
    bar = beat * 4
    end = min(m["end_s"], DUR)
    drums_from = m.get("drums_from_s", 4.0)

    def kick():
        n = int(0.35 * SR); t = np.arange(n) / SR
        f = 50 + 90 * np.exp(-t * 30)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

    def hat():
        n = int(0.06 * SR); t = np.arange(n) / SR
        x = rng.standard_normal(n); x = x - lowpass(x, 7000)
        return x * np.exp(-t * 70)

    def clap():
        n = int(0.18 * SR); t = np.arange(n) / SR
        x = rng.standard_normal(n); x = lowpass(x, 3000) - lowpass(x, 900)
        return x * np.exp(-t * 22)

    def pluck(freq, dur=0.22):
        n = int(dur * SR); t = np.arange(n) / SR
        s = np.sign(np.sin(2 * np.pi * freq * t)) * 0.5 + np.sin(2 * np.pi * freq * 2 * t) * 0.3
        return lowpass(s * np.exp(-t * 14), 2400)

    kk, hh, cl = kick(), hat(), clap()
    b = 0
    while b * beat < end:
        at = b * beat
        place(music, kk, at, 0.55 if at >= drums_from else 0.35)
        place(music, hh, at + beat / 2, 0.12)
        if b % 4 in (1, 3) and at >= drums_from:
            place(music, cl, at, 0.18)
        b += 1

    chords, bass = m["chords"], m["bass"]
    k = 0
    while k * bar < DUR:
        at = k * bar
        ci = k % len(chords)
        if at >= end:
            # end card: one held chord over a low note, then silence
            hold = DUR - end
            pad = sum(lowpass(saw(midi(n), hold) + saw(midi(n) * 1.004, hold), 1100) for n in chords[0])
            place(music, pad * env(len(pad), 0.25, min(2.5, hold * 0.8)), end, 0.05)
            low = lowpass(saw(midi(bass[0]), hold), 300) * env(int(hold * SR), 0.01, min(2.5, hold * 0.8))
            place(music, low, end, 0.18)
            break
        hold = min(bar, end - at)
        pad = sum(lowpass(saw(midi(n), hold) + saw(midi(n) * 1.004, hold), 1100) for n in chords[ci])
        place(music, pad * env(len(pad), 0.25, 0.4), at, 0.05)
        for e in range(8):
            if at + e * bar / 8 >= end:
                break
            n = int(0.22 * SR); tt = np.arange(n) / SR
            place(music, lowpass(saw(midi(bass[k % len(bass)]), 0.22), 420) * np.exp(-tt * 6), at + e * bar / 8, 0.22)
            if at >= drums_from:
                notes = list(chords[ci]) + [chords[ci][0] + 12]
                place(music, pluck(midi(notes[e % 4] + 12)), at + e * bar / 8, 0.10)
        k += 1

    if end < DUR:  # riser into the end card
        n = int(min(1.5, end) * SR); x = rng.standard_normal(n)
        place(music, (x - lowpass(x, 1500)) * np.linspace(0, 1, n) ** 2, end - n / SR, 0.08)
    music *= env(N, 0.3, min(1.2, DUR / 10))

# ---------- sound effects ----------
sfx = np.zeros(N)


def whoosh(dur):
    n = int(dur * SR); x = rng.standard_normal(n)
    x = lowpass(x, 2500) - lowpass(x, 400)
    return x * np.sin(np.linspace(0, np.pi, n)) ** 2


def buzz(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * 110 * t)) + np.sign(np.sin(2 * np.pi * 116 * t))
    return lowpass(s, 1200) * env(n, 0.005, 0.08) * 0.5


def click():
    n = int(0.03 * SR); t = np.arange(n) / SR
    return (rng.standard_normal(n) * 0.6 + np.sin(2 * np.pi * 2200 * t)) * np.exp(-t * 180)


def thunk():
    n = int(0.4 * SR); t = np.arange(n) / SR
    f = 70 + 120 * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10)


def shimmer(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(900 + 900 * tt / dur) / SR) * env(n, 0.3, min(0.6, dur / 3))


def riser(dur):
    n = int(dur * SR); x = rng.standard_normal(n)
    return (x - lowpass(x, 1500)) * np.linspace(0, 1, n) ** 2


# kind -> (sound, default gain)
for cue in prompts.get("sfx", []):
    kind, at = cue["kind"], cue["at_s"]
    p = cue.get("pitch")
    ln = cue.get("length_s")
    if kind == "whoosh":
        sig, g = whoosh(ln or 0.45), 0.35
    elif kind == "ping":
        sig, g = tone(midi(p or 93), ln or 0.6, 7), 0.14
    elif kind == "pop":
        sig, g = tone(midi(p or 81), ln or 0.12, 30, 0.4), 0.16
    elif kind == "buzz":
        sig, g = buzz(ln or 0.25), 0.20
    elif kind == "chime":
        base = p or 84
        sig = tone(midi(base), 1.2, 3.5, 0.3) + tone(midi(base + 7), 1.2, 3.5) * 0.6 + tone(midi(base + 12), 1.2, 4.0) * 0.4
        g = 0.15
    elif kind == "click":
        sig, g = click(), 0.3
    elif kind == "thunk":
        sig, g = thunk(), 0.45
    elif kind == "shimmer":
        sig, g = shimmer(ln or 2.0), 0.04
    else:  # riser
        sig, g = riser(ln or 1.5), 0.08
        at = max(0.0, at - (ln or 1.5))  # a riser ends on its cue
    place(sfx, sig, at, cue.get("gain", g))

out = run / "audio"
out.mkdir(parents=True, exist_ok=True)
for name, buf in (("music", music), ("sfx", sfx)):
    peak = float(np.max(np.abs(buf))) if buf.any() else 0.0
    if peak > 0.95:
        buf *= 0.95 / peak
    sf.write(out / f"{name}.wav", np.stack([buf, buf], 1).astype(np.float32), SR)
    print(f"{name}.wav  peak {peak:.2f}")
