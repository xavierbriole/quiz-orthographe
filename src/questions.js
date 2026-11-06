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
