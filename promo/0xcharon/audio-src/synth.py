# Original music bed and sound effects for the 0xcharon promo, synthesized from scratch.
import sys, numpy as np, soundfile as sf
out = sys.argv[1]
SR, DUR = 48000, 30.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def env(n, a, r):
    e = np.ones(n); a = int(a * SR); r = int(r * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] *= np.linspace(1, 0, r)
    return e

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.zeros_like(x); prev = 0.0
    for i, v in enumerate(x):
        prev = (1 - a) * v + a * prev; y[i] = prev
    return y

def place(buf, sig, at, gain=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if i < N: buf[i:j] += sig[: j - i] * gain

def midi(m): return 440 * 2 ** ((m - 69) / 12)

# ---------- music: 120 bpm, Am - F - C - G, two seconds per chord ----------
music = np.zeros(N)
BEAT = 0.5
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
BASS = [45, 41, 36, 43]
END = 25.0  # end card: drums drop out, one held chord

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

def saw(freq, dur):
    t = np.arange(int(dur * SR)) / SR
    return 2 * ((t * freq) % 1) - 1

def pluck(freq, dur=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * freq * t)) * 0.5 + np.sin(2 * np.pi * freq * 2 * t) * 0.3
    return lowpass(s * np.exp(-t * 14), 2400)

kk, hh, cl = kick(), hat(), clap()
beats = int(END / BEAT)
for b in range(beats):
    at = b * BEAT
    intro = at < 4.0
    place(music, kk, at, 0.55 if not intro else 0.35)
    place(music, hh, at + BEAT / 2, 0.12)
    if b % 4 in (1, 3) and not intro:
        place(music, cl, at, 0.18)

for bar in range(int(DUR / 2)):
    at = bar * 2.0
    ci = bar % 4
    hold = 2.0 if at < END else DUR - at
    if at >= END + 2:
        break
    if at >= END:
        hold = DUR - END
    # pad
    pad = sum(lowpass(saw(midi(m), hold) + saw(midi(m) * 1.004, hold), 1100) for m in CHORDS[ci])
    place(music, pad * env(len(pad), 0.25, 0.4 if at < END else 2.5), at, 0.05)
    # bass, eighth notes
    if at < END:
        for k in range(8):
            n = int(0.22 * SR); tt = np.arange(n) / SR
            b = lowpass(saw(midi(BASS[ci]), 0.22), 420) * np.exp(-tt * 6)
            place(music, b, at + k * 0.25, 0.22)
        # arp from the scanner scene onward
        if at >= 4.0:
            notes = CHORDS[ci] + [CHORDS[ci][0] + 12]
            for k in range(8):
                place(music, pluck(midi(notes[k % 4] + 12)), at + k * 0.25, 0.10)
    else:
        b = lowpass(saw(midi(BASS[0] - 12 + 12), DUR - END), 300) * env(int((DUR - END) * SR), 0.01, 2.5)
        place(music, b, at, 0.18)

# riser into the end card
n = int(1.5 * SR); x = rng.standard_normal(n)
x = x - lowpass(x, 1500); place(music, x * np.linspace(0, 1, n) ** 2, END - 1.5, 0.08)
music *= env(N, 0.3, 1.2)

# ---------- sound effects, timed to the animation ----------
sfx = np.zeros(N)

def whoosh(dur=0.45):
    n = int(dur * SR); x = rng.standard_normal(n)
    x = lowpass(x, 2500) - lowpass(x, 400)
    return x * np.sin(np.linspace(0, np.pi, n)) ** 2

def tone(freq, dur, decay, harm=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + harm * np.sin(2 * np.pi * freq * 2 * t)
    return s * np.exp(-t * decay) * env(n, 0.003, 0.02)

def click():
    n = int(0.03 * SR); t = np.arange(n) / SR
    return (rng.standard_normal(n) * 0.6 + np.sin(2 * np.pi * 2200 * t)) * np.exp(-t * 180)

def buzz():
    n = int(0.25 * SR); t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * 110 * t)) + np.sign(np.sin(2 * np.pi * 116 * t))
    return lowpass(s, 1200) * env(n, 0.005, 0.08) * 0.5

def chime(base):
    return tone(midi(base), 1.2, 3.5, 0.3) + tone(midi(base + 7), 1.2, 3.5) * 0.6 + tone(midi(base + 12), 1.2, 4.0) * 0.4

def thunk():
    n = int(0.4 * SR); t = np.arange(n) / SR
    f = 70 + 120 * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10)

# scene transitions (frames 120, 285, 420, 600, 750 at 30 fps)
for at in (3.9, 9.4, 13.9, 19.9, 24.9):
    place(sfx, whoosh(), at, 0.35)
# intro: boat glides in
place(sfx, whoosh(1.6), 0.0, 0.18)
# scanner: radar pings each sweep, pops as rows land
for at in (4.3, 7.3):
    place(sfx, tone(1760, 0.6, 7), at, 0.14)
for i in range(3):
    place(sfx, tone(880 + i * 220, 0.12, 30, 0.4), 4.0 + 0.8 + i * 0.4, 0.16)
# gate: rejected cards buzz, the accepted one chimes
for at in (11.03, 11.77, 13.23):
    place(sfx, buzz(), at, 0.20)
place(sfx, chime(84), 12.5, 0.14)
# console: rising shimmer while the chart draws, clicks as stat cards land
n = int(2.0 * SR); tt = np.arange(n) / SR
sh = np.sin(2 * np.pi * np.cumsum(900 + 900 * tt / 2.0) / SR) * env(n, 0.3, 0.6)
place(sfx, sh, 14.4, 0.04)
for i in range(4):
    place(sfx, click(), 14.0 + (40 + i * 8) / 30, 0.25)
# controls: switch click, Panic Close thunk, paper pop
place(sfx, click(), 21.3, 0.4)
place(sfx, tone(330, 0.15, 25), 21.3, 0.12)
place(sfx, thunk(), 22.6, 0.45)
place(sfx, tone(midi(76), 0.15, 25, 0.4), 22.8, 0.14)
# end card: logo pop and a confident chime
place(sfx, tone(midi(79), 0.12, 30, 0.4), 25.0, 0.16)
place(sfx, chime(72), 25.3, 0.18)

for name, buf in (("music", music), ("sfx", sfx)):
    peak = np.max(np.abs(buf)); print(name, "peak", round(float(peak), 3))
    sf.write(f"{out}/{name}.wav", np.stack([buf, buf], 1).astype(np.float32), SR)
