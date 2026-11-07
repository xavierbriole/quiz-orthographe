// Choisit les mots d'une vidéo dans le pool et tire 2 fautes par mot.
// Déterministe : même graine = même vidéo.

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 1re faute : un vrai piège (poids max). 2e : une autre règle si possible, la plus crédible.
function choisirFautes(entree, rand) {
  const top = entree.fautes.filter((f) => f.poids === entree.fautes[0].poids);
  const f1 = top[Math.floor(rand() * top.length)];
  const reste = entree.fautes.filter((f) => f.f !== f1.f);
  const autreRegle = reste.filter((f) => f.regle !== f1.regle);
  const candidats = (autreRegle.length ? autreRegle : reste).filter(
    (f, _, arr) => f.poids === arr[0].poids
  );
  const f2 = candidats[Math.floor(rand() * candidats.length)];
  return [f1.f, f2.f];
}

/**
 * @param {{mot: string, fautes: {f: string, poids: number, regle: number}[]}[]} pool
 * @param {Set<string>} dejaUtilises
 * @param {number} nbMots
 * @param {number} graine
 */
export function construireVideo(pool, dejaUtilises, nbMots, graine) {
  const rand = rng(graine);
  const dispo = shuffle(
    pool.filter((e) => !dejaUtilises.has(e.mot)),
    rand
  ).slice(0, nbMots);
  if (dispo.length < nbMots) throw new Error("Plus assez de mots inédits dans le pool");
  const questions = dispo.map((e) => {
    const options = shuffle([e.mot, ...choisirFautes(e, rand)], rand);
    return { options, correctIndex: options.indexOf(e.mot) };
  });
  return { titre: "Quiz orthographe", questions };
}

// ---------- Quiz de vocabulaire (chinois / français) ----------

/**
 * Choisit les mots d'une vidéo de vocabulaire, du niveau le plus facile au plus difficile au fil des jours,
 * et tire 2 mauvaises réponses dans la même catégorie (jamais deux mots d'un même groupe de sens proche).
 * @param {{mot: string, hanzi: string, pinyin: string, fr: string, tag: string|null, categorie: string, niveau: number, groupe: string|null}[]} pool
 * @param {Set<string>} dejaUtilises
 * @param {number} nbMots
 * @param {number} graine
 * @param {"chinois"|"francais"} type chinois : 汉字 → français ; francais : mot français → 汉字
 */
export function construireVideoVocab(pool, dejaUtilises, nbMots, graine, type) {
  const rand = rng(graine);
  // Mélange puis tri stable par niveau : on épuise le niveau 1 avant de passer au 2, etc.
  const dispo = shuffle(
    pool.filter((e) => !dejaUtilises.has(e.mot)),
    rand
  ).sort((a, b) => a.niveau - b.niveau);
  if (dispo.length < nbMots) throw new Error("Plus assez de mots inédits dans le pool");

  // Varier les catégories dans une même vidéo, en restant dans les niveaux les plus bas
  const niveauMax = dispo[nbMots - 1].niveau;
  const choisis = [];
  for (const e of dispo)
    if (choisis.length < nbMots && e.niveau <= niveauMax && !choisis.some((c) => c.categorie === e.categorie)) choisis.push(e);
  for (const e of dispo) if (choisis.length < nbMots && !choisis.includes(e)) choisis.push(e);

  const reponse = (e) => (type === "chinois" ? e.fr : e.hanzi);
  const questions = shuffle(choisis, rand).map((e) => {
    const compatibles = (x) => x !== e && (!e.groupe || x.groupe !== e.groupe) && reponse(x) !== reponse(e);
    let candidats = pool.filter((x) => x.categorie === e.categorie && compatibles(x));
    if (candidats.length < 2) candidats = pool.filter(compatibles);
    const [f1, ...reste] = shuffle(candidats, rand);
    // La 2e mauvaise réponse ne doit pas être trop proche de la 1re non plus
    const f2 = reste.find((x) => (!f1.groupe || x.groupe !== f1.groupe) && reponse(x) !== reponse(f1)) ?? reste[0];
    const options = shuffle([reponse(e), reponse(f1), reponse(f2)], rand);
    return type === "chinois"
      ? { mot: e.hanzi, pinyin: e.pinyin, options, correctIndex: options.indexOf(e.fr) }
      : { mot: e.fr, tag: e.tag, options, correctIndex: options.indexOf(e.hanzi) };
  });
  return { titre: type === "chinois" ? "Quiz chinois" : "法语单词挑战", questions, mots: choisis.map((e) => e.mot) };
}
