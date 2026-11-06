// Génère une ou plusieurs vidéos avec des mots inédits, puis les envoie en brouillon sur TikTok.
// Usage : node scripts/render.mjs [--videos=1] [--mots=5]
// Sur un serveur, les réglages passent par les variables d'environnement NB_MOTS / NB_VIDEOS.

// ⬇️ Réglages par défaut
const NB_MOTS = 5; // nombre de mots par vidéo
const NB_VIDEOS = 1; // nombre de vidéos générées à chaque lancement
const ENVOI_TIKTOK = true; // envoyer chaque vidéo en brouillon sur TikTok (si le compte est connecté)
const SONS = true; // bruitages : tic-tac, ding sur la bonne réponse, whoosh
const MUSIQUE = "musique.mp3"; // musique de fond dans public/ (ignorée si le fichier n'existe pas)
const VOLUME_MUSIQUE = 0.15; // 0 à 1 : reste discrète sous les bruitages

// Hashtags : un socle fixe (la niche) + 2 qui tournent chaque jour, pour varier sans s'éparpiller
const HASHTAGS_FIXES = ["#orthographe", "#français", "#apprendresurtiktok", "#quiz"];
const HASHTAGS_ROTATIFS = [
  "#languefrançaise", "#francais", "#dictée", "#culturegénérale", "#motspièges",
  "#grammaire", "#éducation", "#quizz", "#défi", "#apprendre",
];

import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { construirePool } from "./mots.mjs";
import { construireVideo } from "../src/questions.js";
import { tiktokConfigure, envoyerBrouillon } from "./tiktok.mjs";
import { chemin, notifier, COULEURS } from "./config.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const nbVideos = Number(args.videos ?? process.env.NB_VIDEOS ?? NB_VIDEOS);
const nbMots = Number(args.mots ?? process.env.NB_MOTS ?? NB_MOTS);
const browserExecutable = process.env.CHROME_PATH || undefined;
const envoi = ENVOI_TIKTOK && tiktokConfigure();

const HISTO = chemin("historique.json");

async function main() {
  const historique = fs.existsSync(HISTO) ? JSON.parse(fs.readFileSync(HISTO, "utf8")) : [];
  const dejaUtilises = new Set(historique.flatMap((v) => v.mots));

  const pool = await construirePool();
  const restants = pool.filter((e) => !dejaUtilises.has(e.mot)).length;
  console.log(`Pool : ${pool.length} mots, dont ${restants} encore inédits`);
  if (restants < nbMots * nbVideos) throw new Error("Plus assez de mots inédits : augmente RANG_MAX dans scripts/mots.mjs");
  if (restants < nbMots * 20)
    await notifier("Stock de mots bas", `Plus que ${restants} mots inédits (~${Math.floor(restants / nbMots)} vidéos).`, {
      couleur: COULEURS.attention,
    });

  fs.mkdirSync("out", { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });

  for (let v = 0; v < nbVideos; v++) {
    const num = String(historique.length + 1).padStart(3, "0");
    const graine = Date.now() % 2 ** 31;
    const musique = MUSIQUE && fs.existsSync(path.join("public", MUSIQUE)) ? MUSIQUE : null;
    const jour = historique.length + 1;
    const inputProps = {
      ...construireVideo(pool, dejaUtilises, nbMots, graine),
      jour,
      sons: (process.env.SONS ?? String(SONS)) !== "false",
      musique,
      volumeMusique: Number(process.env.VOLUME_MUSIQUE ?? VOLUME_MUSIQUE),
    };
    const mots = inputProps.questions.map((q) => q.options[q.correctIndex]);

    const composition = await selectComposition({ serveUrl, id: "QuizOrthographe", inputProps, browserExecutable });
    const sortie = `out/quiz-${num}.mp4`;
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

    const rotatifs = [0, 1].map((k) => HASHTAGS_ROTATIFS[(jour * 2 + k) % HASHTAGS_ROTATIFS.length]);
    const legende =
      `Quiz d'orthographe du jour ${jour} ✏️ ${nbMots} mots pièges en français : tu fais combien sans faute ? ` +
      `Dis ton score en commentaire 👇\n\n` +
      [...HASHTAGS_FIXES, ...rotatifs].join(" ");
    fs.writeFileSync(`out/quiz-${num}.txt`, legende);

    if (envoi) {
      // Si l'envoi échoue, on lève l'erreur AVANT d'enregistrer les mots : ils resteront disponibles
      const { status } = await envoyerBrouillon(sortie);
      const enCours = status !== "SEND_TO_USER_INBOX" && status !== "PUBLISH_COMPLETE";
      await notifier(
        enCours ? `Jour ${jour} envoyé – TikTok le traite encore` : `Jour ${jour} prêt dans TikTok`,
        "Ouvre la notification TikTok, colle la légende, ajoute un son et publie.",
        {
          copiable: legende,
          couleur: enCours ? COULEURS.attention : COULEURS.succes,
          champs: [
            { name: "Mots", value: mots.join(", ") },
            { name: "Vidéo", value: `n° ${num}`, inline: true },
            { name: "Durée", value: `${Math.round(composition.durationInFrames / composition.fps)} s`, inline: true },
          ],
        }
      );
    } else if (ENVOI_TIKTOK) {
      console.log("ℹ TikTok non connecté : vidéo générée mais non envoyée (voir README)");
    }

    mots.forEach((m) => dejaUtilises.add(m));
    historique.push({ video: num, jour, date: new Date().toISOString(), graine, mots, questions: inputProps.questions });
    fs.writeFileSync(HISTO, JSON.stringify(historique, null, 2));
    console.log(`✔ ${sortie} : ${mots.join(", ")}`);
  }
}

try {
  await main();
} catch (e) {
  const cause = e.cause ? ` (${e.cause.code || e.cause.message})` : "";
  await notifier("Échec de la génération", e.message + cause, { couleur: COULEURS.erreur });
  process.exit(1);
}
