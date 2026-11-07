// Génère une ou plusieurs vidéos avec des mots inédits, puis les envoie :
//   - quiz « orthographe » et « chinois » → en brouillon sur TikTok
//   - quiz « francais » → sur Discord (vidéo + couverture + titre + texte), à publier à la main sur Xiaohongshu
// Usage : node scripts/render.mjs [--quiz=orthographe,chinois,francais] [--videos=1] [--mots=5]
// Sur un serveur, les réglages passent par les variables d'environnement QUIZ / NB_MOTS / NB_VIDEOS.

// ⬇️ Réglages par défaut
const QUIZ_PAR_DEFAUT = "orthographe"; // quiz générés si ni --quiz ni QUIZ ne sont donnés (voir scripts/quiz.mjs)
const NB_MOTS = 5; // nombre de mots par vidéo
const NB_VIDEOS = 1; // nombre de vidéos générées à chaque lancement (par quiz)
const ENVOI_TIKTOK = true; // envoyer chaque vidéo en brouillon sur TikTok (si le compte est connecté)
const SONS = true; // bruitages : tic-tac, ding sur la bonne réponse, whoosh
const MUSIQUE = "musique.mp3"; // musique de fond dans public/ (ignorée si le fichier n'existe pas)
const VOLUME_MUSIQUE = 0.15; // 0 à 1 : reste discrète sous les bruitages

import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { QUIZ } from "./quiz.mjs";
import { compteTikTok, envoyerBrouillon } from "./tiktok.mjs";
import { chemin, notifier, envoyerTexte, COULEURS } from "./config.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const nomsQuiz = String(args.quiz ?? process.env.QUIZ ?? QUIZ_PAR_DEFAUT)
  .split(",")
  .map((q) => q.trim())
  .filter(Boolean);
const nbVideos = Number(args.videos ?? process.env.NB_VIDEOS ?? NB_VIDEOS);
const nbMots = Number(args.mots ?? process.env.NB_MOTS ?? NB_MOTS);
const browserExecutable = process.env.CHROME_PATH || undefined;

async function genererQuiz(nom, serveUrl) {
  const quiz = QUIZ[nom];
  const HISTO = chemin(quiz.historique);
  const historique = fs.existsSync(HISTO) ? JSON.parse(fs.readFileSync(HISTO, "utf8")) : [];
  const dejaUtilises = new Set(historique.flatMap((v) => v.mots));

  const pool = await quiz.pool();
  const restants = pool.filter((e) => !dejaUtilises.has(e.mot)).length;
  console.log(`[${nom}] Pool : ${pool.length} mots, dont ${restants} encore inédits`);
  if (restants < nbMots * nbVideos) throw new Error(quiz.stockEpuise);
  if (restants < nbMots * 20)
    await notifier(`Stock de mots bas (${quiz.libelle})`, `Plus que ${restants} mots inédits (~${Math.floor(restants / nbMots)} vidéos).`, {
      couleur: COULEURS.attention,
    });

  const tiktok = quiz.plateforme === "tiktok" && ENVOI_TIKTOK ? compteTikTok(quiz.compteTikTok) : null;

  for (let v = 0; v < nbVideos; v++) {
    const num = String(historique.length + 1).padStart(3, "0");
    const graine = Date.now() % 2 ** 31;
    const musique = MUSIQUE && fs.existsSync(path.join("public", MUSIQUE)) ? MUSIQUE : null;
    const jour = historique.length + 1;
    const { mots: motsChoisis, ...video } = quiz.video(pool, dejaUtilises, nbMots, graine);
    const inputProps = {
      ...video,
      type: nom,
      jour,
      sons: (process.env.SONS ?? String(SONS)) !== "false",
      musique,
      volumeMusique: Number(process.env.VOLUME_MUSIQUE ?? VOLUME_MUSIQUE),
    };
    // Clés enregistrées dans l'historique : le mot correct (orthographe) ou les caractères chinois (vocabulaire)
    const mots = motsChoisis ?? inputProps.questions.map((q) => q.options[q.correctIndex]);
    const resume = inputProps.questions.map((q) => (q.mot ? `${q.mot} = ${q.options[q.correctIndex]}` : q.options[q.correctIndex]));

    const composition = await selectComposition({ serveUrl, id: quiz.composition, inputProps, browserExecutable });
    const base = `out/${quiz.prefixe}-${num}`;
    const sortie = `${base}.mp4`;
    let dernier = -1;
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      x264Preset: "veryfast",
      outputLocation: sortie,
      inputProps,
      browserExecutable,
      onProgress: ({ progress }) => {
        const palier = Math.floor(progress * 4) * 25; // logs sobres : 0, 25, 50, 75, 100 %
        if (palier !== dernier) console.log(`${sortie} ${(dernier = palier)} %`);
      },
    });
    const fichiers = [sortie];
    if (quiz.couverture) {
      // Couverture : l'écran d'ouverture, une fois les animations terminées
      await renderStill({ composition, serveUrl, output: `${base}-couverture.png`, frame: 70, inputProps, browserExecutable });
      fichiers.push(`${base}-couverture.png`);
    }

    const infos = { jour, n: nbMots, questions: inputProps.questions };
    const legende = quiz.legende(infos);
    const titre = quiz.titre?.(infos);
    fs.writeFileSync(`${base}.txt`, titre ? `${titre}\n\n${legende}` : legende);
    const champs = [
      { name: "Mots", value: resume.join("\n") },
      { name: "Vidéo", value: `n° ${num}`, inline: true },
      { name: "Durée", value: `${Math.round(composition.durationInFrames / composition.fps)} s`, inline: true },
    ];

    if (tiktok) {
      // Si l'envoi échoue, on lève l'erreur AVANT d'enregistrer les mots : ils resteront disponibles
      const { status } = await envoyerBrouillon(sortie, tiktok.compte);
      const enCours = status !== "SEND_TO_USER_INBOX" && status !== "PUBLISH_COMPLETE";
      await notifier(
        `${quiz.libelle} – jour ${jour} ` + (enCours ? "envoyé, TikTok le traite encore" : "prêt dans TikTok"),
        "Ouvre la notification TikTok, colle la légende, ajoute un son et publie.",
        { copiable: legende, couleur: enCours ? COULEURS.attention : COULEURS.succes, champs }
      );
    } else if (quiz.plateforme === "xiaohongshu") {
      // Pas d'API de publication ouverte : on envoie tout sur Discord pour publier depuis le téléphone
      await envoyerTexte(titre);
      await notifier(
        `${quiz.libelle} – jour ${jour} prêt pour Xiaohongshu`,
        "Enregistre la vidéo et la couverture, puis publie sur Xiaohongshu : " +
          "le titre est dans le message au-dessus, le texte ici.",
        { copiable: legende, champs, fichiers }
      );
    } else if (quiz.plateforme === "tiktok" && ENVOI_TIKTOK) {
      console.log("ℹ TikTok non connecté : vidéo générée mais non envoyée (voir README)");
    }

    mots.forEach((m) => dejaUtilises.add(m));
    historique.push({ video: num, jour, date: new Date().toISOString(), graine, mots, questions: inputProps.questions });
    fs.writeFileSync(HISTO, JSON.stringify(historique, null, 2));
    console.log(`✔ ${sortie} : ${resume.join(", ")}`);
  }
}

const inconnus = nomsQuiz.filter((q) => !QUIZ[q]);
if (inconnus.length) {
  console.error(`Quiz inconnu : ${inconnus.join(", ")}. Choix possibles : ${Object.keys(QUIZ).join(", ")}`);
  process.exit(1);
}

fs.mkdirSync("out", { recursive: true });
let echecs = 0;
let serveUrl;
for (const nom of nomsQuiz) {
  // Chaque quiz est indépendant : l'échec de l'un n'empêche pas les suivants
  try {
    serveUrl ??= await bundle({ entryPoint: path.resolve("src/index.ts") });
    await genererQuiz(nom, serveUrl);
  } catch (e) {
    echecs++;
    const cause = e.cause ? ` (${e.cause.code || e.cause.message})` : "";
    await notifier(`Échec de la génération (${QUIZ[nom].libelle})`, e.message + cause, { couleur: COULEURS.erreur });
  }
}
process.exit(echecs ? 1 : 0);
