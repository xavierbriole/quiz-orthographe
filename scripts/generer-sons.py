# Génère les bruitages de la vidéo par synthèse (aucun problème de droits).
# Sons volontairement doux : notes graves et rondes, attaques adoucies, aigus filtrés.
# Usage : python3 scripts/generer-sons.py  → public/sons/*.wav
import os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
OUT = "public/sons"
os.makedirs(OUT, exist_ok=True)


def t(d):
    return np.linspace(0, d, int(SR * d), endpoint=False)


def env(n, attaque=0.01, decroissance=6.0):
    x = np.arange(n) / SR
    a = np.clip(x / attaque, 0, 1) ** 2  # attaque arrondie, pas de « clic »
    return a * np.exp(-x * decroissance)


def passe_bas(s, fc):
    return sosfilt(butter(2, fc, btype="low", fs=SR, output="sos"), s)


def marimba(freq, d, decroissance=4.0):
    # Fondamentale + un peu du partiel ×4 (timbre boisé), rien d'agressif
    x = t(d)
    s = np.sin(2 * np.pi * freq * x) + 0.12 * np.sin(2 * np.pi * freq * 4 * x) * np.exp(-x * 18)
    return s * env(len(x), 0.008, decroissance)


def sauver(nom, s, gain=0.8, fc=3000):
    s = passe_bas(s, fc)
    s = s / (np.max(np.abs(s)) + 1e-9) * gain
    fondu = int(0.01 * SR)
    s[-fondu:] *= np.linspace(1, 0, fondu)
    wavfile.write(f"{OUT}/{nom}.wav", SR, (s * 32767).astype(np.int16))


def arpege(notes, ecart, d, decroissance):
    s = np.zeros(int(SR * d))
    for i, f in enumerate(notes):
        n = marimba(f, d - i * ecart, decroissance)
        debut = int(i * ecart * SR)
        n = n[: len(s) - debut]
        s[debut:debut + len(n)] += n
    return s


# Tic des 3 dernières secondes : « toc » boisé grave et feutré
x = t(0.18)
toc = (np.sin(2 * np.pi * 520 * x) + 0.3 * np.sin(2 * np.pi * 780 * x)) * env(len(x), 0.004, 28)
sauver("tic-fin", toc, 0.6, fc=1800)

# Bonne réponse : deux notes de marimba (sol4 → ré5), douces
sauver("bonne-reponse", arpege([392.0, 587.3], 0.09, 1.0, 4.5), 0.7, fc=2500)

# Apparition d'une question : souffle léger et grave
d = 0.45
x = t(d)
bruit = np.random.default_rng(7).normal(0, 1, len(x))
morceaux = []
for i, seg in enumerate(np.array_split(bruit, 20)):
    fc = 200 + 700 * (i / 19)
    sos = butter(2, [fc * 0.6, fc * 1.4], btype="band", fs=SR, output="sos")
    morceaux.append(sosfilt(sos, seg))
souffle = np.concatenate(morceaux) * np.sin(np.pi * x / d) ** 2
sauver("whoosh", souffle, 0.5, fc=1500)

# Jingle de fin : arpège doux do4-mi4-sol4-do5
sauver("fin", arpege([261.6, 329.6, 392.0, 523.3], 0.14, 1.6, 3.0), 0.6, fc=2500)

print("Sons générés dans", OUT)
