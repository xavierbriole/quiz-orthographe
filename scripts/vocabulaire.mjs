// Lit data/vocabulaire.txt (liste chinois ⇄ français ⇄ anglais) pour les quiz « chinois » et « francais ».
import fs from "node:fs";

const FICHIER = "data/vocabulaire.txt";

// Catégories grammaticales sans article (affichées dans le quiz de français)
const TAG_CATEGORIE = { verbes: "v.", adjectifs: "adj.", couleurs: "adj.", temps: "adv." };

// « l'eau (f.) » → { fr: "l'eau", tag: "n.f." } ; « le chat » → { fr: "le chat", tag: "n.m." }
function analyserFrancais(brut, categorie) {
  const m = brut.match(/^(.*?)\s*\((m|f)\.\)$/);
  const fr = m ? m[1] : brut;
  const genre = m ? m[2] : /^le /.test(fr) ? "m" : /^la /.test(fr) ? "f" : null;
  const tag = genre ? `n.${genre}.${/^les /.test(fr) ? " pl." : ""}` : TAG_CATEGORIE[categorie] ?? null;
  return { fr, tag };
}

/** @returns {{mot: string, hanzi: string, pinyin: string, fr: string, en: string, tag: string|null, categorie: string, niveau: number, groupe: string|null}[]} */
export function construirePoolVocab() {
  const pool = [];
  const vus = new Set();
  let categorie = null;
  for (const [i, ligne] of fs.readFileSync(FICHIER, "utf8").split("\n").entries()) {
    const l = ligne.trim();
    if (!l) continue;
    if (l.startsWith("#")) continue; // commentaire
    const cat = l.match(/^\[(.+)\]$/);
    if (cat) {
      categorie = cat[1];
      continue;
    }
    const [hanzi, pinyin, brut, en, niveau, groupe] = l.split("|").map((s) => s?.trim());
    if (!hanzi || !pinyin || !brut || !en || !/^[123]$/.test(niveau ?? "") || !categorie)
      throw new Error(`${FICHIER} ligne ${i + 1} invalide : « ${l} »`);
    if (vus.has(hanzi)) throw new Error(`${FICHIER} : « ${hanzi} » apparaît deux fois`);
    vus.add(hanzi);
    pool.push({ mot: hanzi, hanzi, pinyin, ...analyserFrancais(brut, categorie), en, categorie, niveau: Number(niveau), groupe: groupe || null });
  }
  return pool;
}
