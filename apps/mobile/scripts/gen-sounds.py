"""Generate the app's soft UI sounds (short sine chimes) into assets/sounds/*.wav.

Synthesised, so there is no licensing question. Run: python3 scripts/gen-sounds.py
"""
import math, os, struct, wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')


def note(freq, dur, vol=0.5, attack=0.006, decay=6.0, harm=(1.0, 0.18, 0.06), glide=0.0):
    n = int(RATE * dur)
    out = []
    phase = [0.0] * len(harm)
    for i in range(n):
        t = i / RATE
        f = freq * (1 + glide * t / dur)
        env = min(1.0, t / attack) * math.exp(-decay * t)
        s = 0.0
        for k, a in enumerate(harm):
            phase[k] += 2 * math.pi * f * (k + 1) / RATE
            s += a * math.sin(phase[k])
        out.append(s * env * vol)
    return out


def seq(*parts):
    """parts: (start_seconds, samples) mixed together."""
    length = max(int(st * RATE) + len(s) for st, s in parts) + int(0.02 * RATE)
    buf = [0.0] * length
    for st, s in parts:
        o = int(st * RATE)
        for i, v in enumerate(s):
            buf[o + i] += v
    return buf


def write(name, samples, gain=0.42):
    peak = max(1e-9, max(abs(x) for x in samples))
    data = b''.join(struct.pack('<h', int(max(-1, min(1, x / peak * gain)) * 32767)) for x in samples)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data)


os.makedirs(OUT, exist_ok=True)
C5, E5, G5, A5, C6, E6, G6 = 523.25, 659.25, 783.99, 880.0, 1046.5, 1318.5, 1568.0
# a tiny soft tick for a passed check
write('check', note(E6, 0.12, decay=28), gain=0.22)
# correct answer / solved task: two rising notes
write('success', seq((0, note(G5, 0.25, decay=10)), (0.075, note(C6, 0.35, decay=8))), gain=0.32)
# wrong answer: soft low descending pair, no harsh buzz
write('error', seq((0, note(330, 0.18, decay=14, harm=(1.0, 0.1))), (0.09, note(262, 0.26, decay=11, harm=(1.0, 0.1)))), gain=0.28)
# lesson / mission complete: arpeggio
write('complete', seq((0, note(C5, 0.5, decay=5)), (0.09, note(E5, 0.5, decay=5)), (0.18, note(G5, 0.55, decay=5)), (0.27, note(C6, 0.8, decay=4))), gain=0.34)
# achievement / level up: sparkle
write('achievement', seq((0, note(G5, 0.4, decay=7)), (0.07, note(C6, 0.4, decay=7)), (0.14, note(E6, 0.45, decay=7)), (0.21, note(G6, 0.7, decay=5, harm=(1.0, 0.08)))), gain=0.3)
# a dialog / sheet opens: very short soft pop
write('open', note(A5, 0.07, decay=40, glide=0.25, harm=(1.0,)), gain=0.14)
# key tap in the quick-keys bar / token pick
write('tap', note(1200, 0.035, decay=90, harm=(1.0,)), gain=0.1)
print('ok', sorted(os.listdir(OUT)))
