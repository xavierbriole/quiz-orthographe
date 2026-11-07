// Toute la configuration passe par des variables d'environnement (pratique sur un serveur).
// En local, on peut aussi utiliser config/tiktok.json.
import fs from "node:fs";
import path from "node:path";

const fichierLocal = fs.existsSync("config/tiktok.json")
  ? JSON.parse(fs.readFileSync("config/tiktok.json", "utf8"))
  : {};

// Dossier persistant : historique des mots + accès TikTok.
// Sur le serveur, il DOIT pointer vers un disque/volume qui survit aux redémarrages.
export const DATA_DIR = process.env.DATA_DIR || "data";
fs.mkdirSync(DATA_DIR, { recursive: true });
export const chemin = (f) => path.join(DATA_DIR, f);

export const tiktok = {
  client_key: process.env.TIKTOK_CLIENT_KEY || fichierLocal.client_key,
  client_secret: process.env.TIKTOK_CLIENT_SECRET || fichierLocal.client_secret,
  redirect_uri: process.env.TIKTOK_REDIRECT_URI || fichierLocal.redirect_uri || "https://xavierbriole.github.io/quiz-orthographe/callback.html",
  // Utilisé une seule fois pour amorcer le serveur, tant qu'aucun token n'est sauvegardé dans DATA_DIR
  refresh_token_initial: process.env.TIKTOK_REFRESH_TOKEN,
};

// Notifications Discord (facultatif) : URL d'un webhook de ton serveur Discord
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export const COULEURS = { succes: 0x22c55e, attention: 0xfacc15, erreur: 0xef4444 };

// Taille max des pièces jointes d'un message Discord (serveur sans boost : 10 Mo)
const LIMITE_DISCORD = Number(process.env.DISCORD_LIMITE_MO || 10) * 1024 * 1024;

// Envoie un message au webhook ; avec des fichiers, en multipart (pièces jointes)
async function posterDiscord(payload, fichiers = []) {
  let corps = JSON.stringify(payload);
  let headers = { "Content-Type": "application/json" };
  if (fichiers.length) {
    corps = new FormData();
    corps.append("payload_json", JSON.stringify(payload));
    fichiers.forEach((f, i) => corps.append(`files[${i}]`, new Blob([fs.readFileSync(f)]), path.basename(f)));
    headers = {};
  }
  const r = await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers, body: corps });
  if (!r.ok) throw Object.assign(new Error(`Discord a répondu ${r.status} : ${await r.text()}`), { status: r.status });
}

// Un seul message : le texte (`copiable`, ex. la légende) + une card en dessous.
// « Copier le texte » sur le message ne copie que le texte, pas la card.
// `fichiers` : pièces jointes (ex. la vidéo à publier à la main), ignorées si elles dépassent la limite de Discord.
export async function notifier(titre, description = "", { copiable = "", couleur = COULEURS.succes, champs = [], fichiers = [] } = {}) {
  console.log(`[${titre}] ${description}${copiable ? "\n" + copiable : ""}`);
  if (!DISCORD_WEBHOOK_URL) return;
  const taille = fichiers.reduce((t, f) => t + fs.statSync(f).size, 0);
  const joints = taille <= LIMITE_DISCORD ? fichiers : fichiers.filter((f) => !f.endsWith(".mp4"));
  const message = (note) => ({
    content: copiable.slice(0, 2000),
    embeds: [
      {
        title: titre,
        description: [description, note].filter(Boolean).join("\n\n") || undefined,
        color: couleur,
        fields: champs.map((c) => ({ name: c.name, value: String(c.value).slice(0, 1024), inline: Boolean(c.inline) })),
        timestamp: new Date().toISOString(),
      },
    ],
  });
  const noteTropGros = (f) => `⚠ Vidéo trop lourde pour Discord : récupère-la sur le serveur (${f.join(", ")}).`;
  try {
    const manquants = fichiers.filter((f) => !joints.includes(f));
    await posterDiscord(message(manquants.length ? noteTropGros(manquants) : ""), joints);
  } catch (e) {
    if (e.status === 413 && joints.length) {
      // Pièces jointes refusées (limite plus basse que prévu) : on renvoie le message sans elles
      try {
        await posterDiscord(message(noteTropGros(joints)));
        return;
      } catch (e2) {
        e = e2;
      }
    }
    console.error("Notification Discord impossible :", e.message);
  }
}

// Message texte seul (facile à copier depuis le téléphone, ex. le titre d'un post)
export async function envoyerTexte(texte) {
  if (!DISCORD_WEBHOOK_URL) return;
  try {
    await posterDiscord({ content: texte.slice(0, 2000) });
  } catch (e) {
    console.error("Notification Discord impossible :", e.message);
  }
}
