// Source de mots 100 % automatique :
// 1. liste de fréquence du français (OpenSubtitles, hermitdave/FrequencyWords, téléchargée et mise en cache)
// 2. dictionnaire Hunspell (Grammalecte, toutes variantes) pour valider les mots
// 3. générateur de fautes « classiques » ; chaque faute est vérifiée comme n'étant PAS un mot valide
import fs from "node:fs";
import nspell from "nspell";
import dictionnaire from "dictionary-fr";
import grossieretes from "french-badwords-list";

const URL_FREQ =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt";
const CACHE = "data/cache/fr_50k.txt";

// Plage de fréquence : assez courant pour être connu, assez rare pour piéger
const RANG_MIN = 1500;
const RANG_MAX = 35000;

const spell = nspell(dictionnaire);

// Lemmes du dictionnaire (formes de base : singulier, infinitif…), pour éviter les formes conjuguées
const lemmes = new Set(
  Buffer.from(dictionnaire.dic)
    .toString("utf8")
    .split("\n")
    .map((l) => l.split("/")[0].trim())
);

const interdits = new Set(grossieretes.array.map((m) => m.toLowerCase()));

async function listeFrequence() {
  if (!fs.existsSync(CACHE)) {
    fs.mkdirSync("data/cache", { recursive: true });
    const r = await fetch(URL_FREQ);
    if (!r.ok) throw new Error(`Téléchargement de la liste de fréquence impossible (${r.status})`);
    fs.writeFileSync(CACHE, await r.text());
  }
  return fs.readFileSync(CACHE, "utf8").split("\n").map((l) => l.split(" ")[0]).filter(Boolean);
}

// ---------- Générateur de fautes ----------
const V = "aeiouyéèêàâîôûœ";
const remplacements = [
  // [regex, remplacement, poids, piège réel ?]
  // Poids 5 = on retire une vraie difficulté du mot (la faute la plus crédible)
  [/([lmnprtfcs])\1/g, "$1", 5, true], // consonne double → simple
  [/rh/g, "r", 5, true], [/th/g, "t", 5, true], [/ph/g, "f", 5, true],
  [/^h/g, "", 4, true],
  [/y/g, "i", 5, true],
  [/cqu/g, "qu", 5, true], [/cc/g, "c", 5, true],
  [/xion$/g, "ction", 5, true],
  // Poids 3 = fautes fréquentes mais moins « piège »
  [new RegExp(`([${V}])([lmnptrf])([${V}])`, "g"), "$1$2$2$3", 3, false], // simple → double
  [/é/g, "è", 3, false], [/è/g, "é", 3, false], [/é/g, "e", 3, false],
  [/ê/g, "è", 3, false], [/ê/g, "e", 3, false],
  [/â/g, "a", 3, false], [/î/g, "i", 3, false], [/ô/g, "o", 3, false], [/û/g, "u", 2, false],
  [/mp/g, "np", 3, false], [/mb/g, "nb", 3, false],
  [/tion$/g, "sion", 3, false], [/sion$/g, "tion", 3, false],
  [new RegExp(`([^${V}])i([^${V}])`, "g"), "$1y$2", 2, false],
  [/en/g, "an", 2, false], [/an/g, "en", 2, false],
  [/eu$/g, "eux", 2, false], [/eux$/g, "eu", 2, false],
  [new RegExp(`([${V}])$`), "$1s", 2, false],
];

// Applique chaque règle à une seule occurrence à la fois → une seule faute par proposition
function fautesPossibles(mot) {
  const res = new Map();
  for (const [i, [re, rep, poids, piege]] of remplacements.entries()) {
    const reG = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m;
    while ((m = reG.exec(mot)) !== null) {
      const avant = mot.slice(0, m.index);
      const apres = mot.slice(m.index + m[0].length);
      const faux = avant + m[0].replace(new RegExp(re.source, re.flags.replace("g", "")), rep) + apres;
      if (faux !== mot && faux.length >= 3 && !res.has(faux)) res.set(faux, { poids, regle: i, piege });
      if (m[0].length === 0) reG.lastIndex++;
    }
  }
  return [...res.entries()]
    .filter(([f]) => !spell.correct(f) && !spell.correct(f[0].toUpperCase() + f.slice(1)))
    .sort((a, b) => b[1].poids - a[1].poids)
    .map(([f, info]) => ({ f, ...info }));
}

export async function construirePool() {
  const freq = await listeFrequence();
  const pool = [];
  for (let rang = RANG_MIN; rang < Math.min(RANG_MAX, freq.length); rang++) {
    const mot = freq[rang];
    if (!/^[a-zàâäçéèêëîïôöùûüœ]{6,14}$/.test(mot)) continue;
    if (!lemmes.has(mot) || interdits.has(mot)) continue;
    if (/[wk]|sh|ee|oo|y$/.test(mot)) continue; // mots d'origine anglaise
    const fautes = fautesPossibles(mot);
    // Il faut au moins un vrai piège dans le mot, et deux fautes possibles
    if (fautes.length < 2 || !fautes.some((x) => x.piege)) continue;
    pool.push({ mot, rang, fautes: fautes.slice(0, 8) });
  }
  return pool;
}
